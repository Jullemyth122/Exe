const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { AccessToken } = require('livekit-server-sdk');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

/**
 * GET /api/join?code=ABCD1234&participantName=user-xyz
 *
 * The 8-char code IS the room name — no server-side storage, no expiry.
 * Each caller gets a fresh JWT for their own identity in that room.
 * Codes live forever (like a Google Meet link).
 */
app.get('/api/join', async (req, res) => {
  const code = req.query.code?.trim().toUpperCase();
  const participantName = req.query.participantName?.trim();

  if (!code || code.length !== 8) {
    return res.status(400).json({ error: 'A valid 8-character room code is required.' });
  }

  if (!participantName) {
    return res.status(400).json({ error: 'participantName is required.' });
  }

  if (
    !LIVEKIT_API_KEY ||
    !LIVEKIT_API_SECRET ||
    LIVEKIT_API_SECRET === 'PASTE_YOUR_REVEALED_SECRET_HERE'
  ) {
    return res.status(500).json({
      error: 'LiveKit credentials are not configured. Please fill in backend/.env',
    });
  }

  try {
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: participantName,
    });

    at.addGrant({
      roomJoin: true,
      room: code,          // code IS the room name
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    console.log(`[JOIN] "${participantName}" joined room "${code}"`);
    return res.json({ token });
  } catch (error) {
    console.error('Error generating token:', error);
    return res.status(500).json({ error: 'Failed to generate token: ' + error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Meus token server running on http://localhost:${PORT}`);
});
