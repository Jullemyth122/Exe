import React from 'react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { useRoomStore } from '../store/roomStore';
import Lobby from '../components/Lobby';
import './Room.scss';

const Room: React.FC = () => {
  const { token, serverUrl, connected, disconnect } = useRoomStore();

  if (!connected || !token || !serverUrl) {
    return <Lobby />;
  }

  return (
    <div className="room-wrapper">
      <div className="room-header">
        <div className="room-info">
          <span className="live-badge">LIVE</span>
          <span className="room-server-url">{serverUrl.substring(0, 30)}...</span>
        </div>
        <button className="disconnect-btn" onClick={disconnect}>
          Leave Room
        </button>
      </div>

      <div className="video-area">
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect={true}
          video={true}
          audio={true}
          onDisconnected={disconnect}
          className="livekit-room-container"
        >
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    </div>
  );
};

export default Room;
