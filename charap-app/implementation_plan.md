# Implementation Plan: Charap Backend Auth & Session Architecture (Vercel Serverless + Node.js)

This document details the step-by-step implementation plan for adding robust multi-strategy authentication (Guest UUID, Google OAuth, Social OAuth) and shared infrastructure (JWT Verification Middleware, Rate Limiting, Database Schema) to the Charap Vercel backend.

---

## Architecture Overview & Design

```
+-----------------------------------------------------------------------------------+
|                                  ANGULAR FRONTEND                                 |
|  - Manages Guest UUID in localStorage                                             |
|  - Initiates Google / Social Sign-In Flow                                          |
|  - Stores Signed App JWT (Bearer Token) in memory/storage or HTTP-Only Cookie     |
|  - Passes 'Authorization: Bearer <TOKEN>' to Vercel API routes                    |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
|                             VERCEL SERVERLESS API (api/)                          |
|                                                                                   |
|  [Guest Auth Endpoint]        [Google OAuth Endpoint]     [Social OAuth Callback] |
|   /api/auth/guest              /api/auth/google           /api/auth/callback/[p]  |
|   - Issues Guest JWT           - Verifies ID Token        - Code Exchange         |
|   - Tracks Guest session       - Upserts User Record      - Maps user_identities  |
|                                                                                   |
|  -------------------------------------------------------------------------------  |
|  [Unified Auth Middleware] (withAuth wrapper)                                     |
|   1. Extracts & Verifies JWT (jsonwebtoken / jose)                                |
|   2. Rate Limiting Check (Upstash Redis / Postgres count)                          |
|      - Guest Limit: 10 requests/hour                                              |
|      - Authenticated User Limit: Tiered / Unlimited                               |
|   3. Account Linking (Merges guest activity on user registration)                 |
|                                                                                   |
|  -------------------------------------------------------------------------------  |
|  [Protected AI Routes]                                                            |
|   /api/chat (Gemini 2.5 Flash - Hides GEMINI_API_KEY)                             |
|   /api/tts  (ElevenLabs - Hides ELEVENLABS_API_KEY)                               |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
|                               DATABASE & CACHE LAYER                              |
|  - Supabase PostgreSQL / Prisma / Drizzle (Users, Identities, Sessions)           |
|  - Upstash Redis (Fast Rate Limiting & Guest Session Store)                       |
+-----------------------------------------------------------------------------------+
```

---

## 1. Database Schema Design (PostgreSQL / Supabase / Prisma)

### DDL Schema (`schema.sql`)

```sql
-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'user', -- 'user', 'admin'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. User Identities Table (For Google & Social OAuth provider mapping)
CREATE TABLE user_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'google', 'github', 'facebook', 'apple'
    provider_account_id VARCHAR(255) NOT NULL, -- Provider's sub / unique ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_provider_account UNIQUE(provider, provider_account_id)
);

-- 3. Guests Table (For Guest tracking & rate limiting)
CREATE TABLE guests (
    guest_uuid UUID PRIMARY KEY,
    ip_address VARCHAR(45),
    request_count INT DEFAULT 0,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    linked_user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Index for fast user identity lookups
CREATE INDEX idx_user_identities_lookup ON user_identities(provider, provider_account_id);
```

---

## 2. API Folder & Code Structure

We will create an organized serverless directory under `api/`:

```
Charap/
├── api/
│   ├── auth/
│   │   ├── guest.ts          # Endpoint for Guest JWT & registration
│   │   ├── google.ts         # Endpoint for Google ID Token verification
│   │   ├── link.ts           # Account linking (Guest -> Permanent User)
│   │   └── callback/
│   │       └── [provider].ts # Generic Social OAuth Code Exchanger (GitHub, FB, Apple)
│   ├── chat.ts               # Protected Gemini AI endpoint
│   ├── tts.ts                # Protected ElevenLabs TTS endpoint
│   └── _lib/                 # Reusable serverless helper modules
│       ├── db.ts             # Database Connection (Supabase/PG/Prisma)
│       ├── jwt.ts            # JWT signing & verification helpers
│       ├── middleware.ts     # Unified withAuth & rate limiter middleware
│       ├── rate-limiter.ts   # Upstash Redis / DB Rate Limiter
│       └── oauth-providers.ts# Provider config specs (GitHub, Facebook, etc.)
```

---

## 3. Required Environment Variables

Set the following in `.env` for local testing and in **Vercel Dashboard -> Environment Variables**:

```env
# Auth Secrets
JWT_SECRET=your_super_secret_jwt_key_at_least_32_chars_long

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Social Providers
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret

# Database & Cache
DATABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

# AI Provider Keys (Kept safe on server)
GEMINI_API_KEY=your_gemini_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

---

## 4. Implementation Details by Strategy

### Strategy 1: Anonymous / Guest Auth & Rate Limiting (`api/auth/guest.ts` & `api/_lib/rate-limiter.ts`)

1. **Client Request**: Frontend generates a client-side `crypto.randomUUID()` or calls `POST /api/auth/guest`.
2. **Backend Action**:
   - Inserts or updates guest entry in `guests` table or Redis cache.
   - Generates a signed Guest JWT payload: `{ userId: guestUuid, role: 'guest', isGuest: true }` (expiring in 7 to 30 days).
   - Sets an HTTP-Only Cookie or returns JSON token `{ token }`.
3. **Rate Limiting**:
   - `api/_lib/rate-limiter.ts` uses Upstash Redis sliding window algorithm (or DB counter).
   - Guests: **Max 10 requests / hour**.
   - Logged-in Users: **Max 100 requests / hour**.

### Strategy 2: Google OAuth Handler (`api/auth/google.ts`)

1. Frontend uses Google Identity Services (GIS) / `@abacritt/angular-x-social-login` to sign in and gets `id_token`.
2. Frontend sends `POST /api/auth/google` with `{ idToken, guestUuid }`.
3. Backend Action:
   - Uses `google-auth-library` (`OAuth2Client.verifyIdToken`) to verify token signature, expiration, and audience (`GOOGLE_CLIENT_ID`).
   - Extracts `sub`, `email`, `name`, `picture`.
   - Performs **User Upsert**:
     - Check `user_identities` where `provider = 'google'` AND `provider_account_id = sub`.
     - If not found, check `users` table by `email`.
     - Create `users` record and `user_identities` link if new.
   - Calls **Account Linking Helper** if `guestUuid` is provided (transfers guest recipes/history to new user account).
   - Generates App JWT: `{ userId: user.id, email: user.email, role: user.role, isGuest: false }`.

### Strategy 3: Social OAuth Callback (`api/auth/callback/[provider].ts`)

1. Frontend redirects user to Social Provider auth URL with a cryptographically signed state parameter (`crypto.randomUUID()` saved in session/cookie).
2. Provider redirects back to `/api/auth/callback/github?code=XYZ&state=ABC`.
3. Backend Action:
   - Validates `state` against session/cookie to prevent CSRF attacks.
   - Exchanges authorization `code` for `access_token` via standard OAuth POST request to provider.
   - Fetches user profile from provider API (e.g. `https://api.github.com/user`).
   - Maps identity to `user_identities` (`provider: 'github'`, `provider_account_id: profile.id`).
   - Issues App JWT and redirects back to Angular app with token in cookie or secure URL parameter.

### Strategy 4: Shared Middleware (`api/_lib/middleware.ts`)

Higher-Order Function `withAuth` that wraps any Vercel API handler (e.g. `api/chat.ts`):

1. Reads `Authorization: Bearer <TOKEN>` or Cookie.
2. Decodes JWT using `jsonwebtoken` or `jose` with `JWT_SECRET`.
3. Checks rate limits via Redis/DB using identity key (`guest:<uuid>` or `user:<id>`).
4. Rejects request with `401 Unauthorized` or `429 Too Many Requests` if invalid/exceeded.
5. Injects `req.user` into request context and calls main handler.

---

## Proposed Changes & Code Steps

### Step 1: Install Server Dependencies
Run in `Charap` directory:
```bash
npm install jsonwebtoken google-auth-library @upstash/ratelimit @upstash/redis pg
npm install --save-dev @types/jsonwebtoken @types/pg
```

### Step 2: Create Server Helpers (`api/_lib/`)
- `jwt.ts`: Functions for `signAppToken(payload)` and `verifyAppToken(token)`.
- `db.ts`: Database client pooling (PostgreSQL/Supabase).
- `rate-limiter.ts`: Upstash Redis sliding window rate limiter.
- `middleware.ts`: `withAuth(handler)` higher order function.

### Step 3: Implement Auth Routes (`api/auth/`)
- `api/auth/guest.ts`: Handles guest session generation.
- `api/auth/google.ts`: Handles Google `id_token` verification & user creation.
- `api/auth/callback/[provider].ts`: Generic OAuth code exchanger.
- `api/auth/link.ts`: Account linking logic.

### Step 4: Protect AI Endpoints (`api/chat.ts`, `api/tts.ts`)
- Wrap Gemini & ElevenLabs server-side calls with `withAuth`. Keep secrets strictly on backend.

### Step 5: Update Angular Frontend Service (`src/app/services/auth.service.ts` & `chef.service.ts`)
- Store App JWT in browser storage.
- Pass `Authorization: Bearer ${jwtToken}` header on all API calls.

---

## Verification Plan

### Automated & Unit Verification
- Test JWT generation and verification routines (`jwt.test.ts`).
- Test Google token validation logic with mock tokens.

### Manual Verification
1. **Guest Flow**: Open app in Incognito mode, request guest token, verify 10-request/hour limit works.
2. **Google OAuth Flow**: Perform Google Sign-In, inspect database to ensure `users` and `user_identities` records are populated.
3. **Protected API Flow**: Send requests to `/api/chat` with and without Bearer token to verify `401 Unauthorized` enforcement.
4. **Account Linking**: Create guest data, sign in with Google, verify guest data is linked to permanent user ID.
