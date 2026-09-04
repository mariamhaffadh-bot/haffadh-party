import React, { useState } from 'react';
import useStore from '../store';

export default function HomeScreen() {
  const { send } = useStore();
  const [joinCode, setJoinCode] = useState('');
  const [showJoin, setShowJoin] = useState(false);

  const handleCreate = () => send({ type: 'create_room' });
  const handleJoin = () => {
    if (joinCode.length === 4) send({ type: 'join_room', roomCode: joinCode });
  };
  const handlePassAndPlay = () => send({ type: 'pass_and_play_create' });

  return (
    <div className="home-screen">
      <h1>Haffadh Party</h1>
      <p className="subtitle">Adventure awaits on Nakhlah Isle</p>

      <button className="btn btn-primary" onClick={handleCreate}>
        Host Game (TV)
      </button>

      {!showJoin ? (
        <button className="btn btn-secondary" onClick={() => setShowJoin(true)}>
          Join Game (Phone)
        </button>
      ) : (
        <div className="join-row">
          <input
            className="code-input"
            maxLength={4}
            placeholder="CODE"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            autoFocus
          />
          <button className="btn btn-primary btn-small" onClick={handleJoin} disabled={joinCode.length < 4}>
            Go
          </button>
        </div>
      )}

      <button className="btn btn-secondary" onClick={handlePassAndPlay}>
        Pass &amp; Play (1 Device)
      </button>
    </div>
  );
}
