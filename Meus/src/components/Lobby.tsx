import React, { useState } from 'react';
import { useRoomStore } from '../store/roomStore';
import './Lobby.scss';

// Hidden from UI — the server URL is a backend detail
const SERVER_URL = 'wss://meus-sp9rgl6b.livekit.cloud';

/** Generate a random 8-char uppercase room code (unambiguous chars) */
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('');
}

const Lobby: React.FC = () => {
  const { connect } = useRoomStore();

  // Your own room code — generated once on mount, lives forever
  const [myCode] = useState<string>(generateRoomCode);

  // Your display name
  const [myName, setMyName] = useState(
    `user-${Math.floor(1000 + Math.random() * 9000)}`
  );

  // "Join someone else's room" state
  const [joinCode, setJoinCode] = useState('');

  // UI states
  const [copiedMy, setCopiedMy] = useState(false);
  const [connecting, setConnecting] = useState<'start' | 'join' | null>(null);
  const [error, setError] = useState('');

  const copyMyCode = () => {
    navigator.clipboard.writeText(myCode).then(() => {
      setCopiedMy(true);
      setTimeout(() => setCopiedMy(false), 2000);
    });
  };

  /** Fetch a token from backend and connect to LiveKit */
  const joinRoom = async (code: string) => {
    setError('');

    if (!myName.trim()) {
      setError('Please enter your display name.');
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:5000/api/join?code=${encodeURIComponent(code)}&participantName=${encodeURIComponent(myName.trim())}`
      );
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to get token.');
      if (!data.token) throw new Error('No token returned from server.');

      connect(SERVER_URL, data.token);
    } catch (err: any) {
      console.error(err);
      setError(
        err.message.includes('Failed to fetch')
          ? 'Cannot reach backend. Make sure "npm run dev" is running in the backend/ folder.'
          : err.message
      );
    }
  };

  const handleStart = async () => {
    setConnecting('start');
    await joinRoom(myCode);
    setConnecting(null);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 8) {
      setError('Please enter the full 8-character room code.');
      return;
    }
    setConnecting('join');
    await joinRoom(code);
    setConnecting(null);
  };

  return (
    <div className="lobby-container">
      <div className="lobby-card">

        {/* ── Logo ── */}
        <div className="logo-section">
          <div className="glow-accent"></div>
          <span className="logo-text">MEUS</span>
          <span className="logo-subtext">Secure Video Rooms</span>
        </div>

        {/* ── Display name ── */}
        <div className="form-group name-group">
          <label htmlFor="my-name">Your Name</label>
          <input
            id="my-name"
            type="text"
            value={myName}
            onChange={(e) => setMyName(e.target.value)}
            placeholder="Enter your display name"
            autoComplete="off"
          />
        </div>

        {/* ── Create / Your Room ── */}
        <div className="room-create-section">
          <p className="section-label">YOUR ROOM CODE</p>
          <div className="token-code-row">
            <div className="token-code-input has-code">{myCode}</div>
            <button
              type="button"
              className={`copy-btn${copiedMy ? ' copied' : ''}`}
              onClick={copyMyCode}
              title="Copy code"
            >
              {copiedMy ? '✓' : '⎘'}
            </button>
          </div>
          <p className="code-hint">
            Share this code with anyone — it never expires.
          </p>
          <button
            className="connect-btn"
            onClick={handleStart}
            disabled={connecting !== null}
          >
            <span>{connecting === 'start' ? 'Starting...' : '▶ Start Meeting'}</span>
            <div className="btn-glow"></div>
          </button>
        </div>

        {/* ── Divider ── */}
        <div className="divider">
          <span>OR JOIN WITH A CODE</span>
        </div>

        {/* ── Join another room ── */}
        <form className="join-section" onSubmit={handleJoin}>
          <div className="token-code-row">
            <input
              id="join-code"
              type="text"
              className={`token-code-input join-input${joinCode ? ' has-code' : ''}`}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
              placeholder="Enter 8-char code..."
              maxLength={8}
              spellCheck={false}
              autoComplete="off"
            />
            <button
              type="submit"
              className="generate-btn join-submit-btn"
              disabled={connecting !== null || joinCode.length !== 8}
            >
              {connecting === 'join' ? '...' : 'Join'}
            </button>
          </div>
        </form>

        {/* ── Error ── */}
        {error && <div className="error-message">{error}</div>}

      </div>
    </div>
  );
};

export default Lobby;
