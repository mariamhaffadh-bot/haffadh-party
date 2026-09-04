import React, { useState } from 'react';
import useStore from '../store';
import { CHARACTERS, getCharacter } from '../utils/characters';

export default function LobbyScreen() {
  const { roomCode, role, gameState, clientId, send } = useStore();
  const [selectedChar, setSelectedChar] = useState(null);
  const [playerName, setPlayerName] = useState('');

  // Pass-and-play state
  const [papName, setPapName] = useState('');
  const [papChar, setPapChar] = useState(null);

  const selectedChars = gameState?.selectedCharacters || [];
  const players = gameState?.players || {};
  const playerList = Object.values(players);
  const isHost = gameState?.players && !Object.keys(players).includes(clientId) ? false : true;

  const handleSelectChar = (charId) => {
    if (selectedChars.includes(charId)) return;
    setSelectedChar(charId);
  };

  const handleConfirm = () => {
    if (!selectedChar) return;
    send({ type: 'select_character', characterId: selectedChar, playerName: playerName || undefined });
  };

  const handleStartGame = () => {
    send({ type: 'start_game' });
  };

  const handlePapAdd = () => {
    if (!papChar || !papName) return;
    send({ type: 'pass_and_play_add_player', characterId: papChar, playerName: papName });
    setPapName('');
    setPapChar(null);
  };

  const myPlayer = players[clientId];

  // Pass-and-play lobby
  if (role === 'local') {
    return (
      <div className="lobby-screen">
        <h2 style={{ color: 'var(--accent)' }}>Pass &amp; Play Setup</h2>
        <p className="turn-banner">Add 2-8 players on this device</p>

        <div className="player-list">
          {playerList.map((p) => {
            const ch = getCharacter(p.characterId);
            return (
              <div key={p.id} className="player-row">
                <div className="player-dot" style={{ background: ch?.color }} />
                <span>{p.name}</span>
                <span style={{ color: 'var(--text-dim)', marginLeft: 'auto', fontSize: '0.8rem' }}>
                  {ch?.species}
                </span>
              </div>
            );
          })}
        </div>

        <input
          className="name-input"
          placeholder="Player Name"
          value={papName}
          onChange={(e) => setPapName(e.target.value)}
        />

        <div className="char-grid">
          {CHARACTERS.map((ch) => (
            <div
              key={ch.id}
              className={`char-card ${papChar === ch.id ? 'selected' : ''} ${selectedChars.includes(ch.id) ? 'taken' : ''}`}
              onClick={() => !selectedChars.includes(ch.id) && setPapChar(ch.id)}
            >
              <div className="char-avatar" style={{ background: ch.color }} />
              <span className="char-name">{ch.name}</span>
              <span className="char-species">{ch.species}</span>
            </div>
          ))}
        </div>

        <button className="btn btn-secondary" onClick={handlePapAdd} disabled={!papChar || !papName}>
          Add Player
        </button>

        {playerList.length >= 2 && (
          <button className="btn btn-primary" onClick={handleStartGame}>
            Start Game!
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="lobby-screen">
      <h2 style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Room Code</h2>
      <div className="room-code-display">{roomCode}</div>

      {role === 'tv' && (
        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: 8 }}>
          Players: join on your phone at this address with the code above
        </p>
      )}

      {/* Character select (phone role, or TV host before others join) */}
      {role === 'phone' && !myPlayer && (
        <>
          <input
            className="name-input"
            placeholder="Your Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            style={{ marginBottom: 12 }}
          />
          <div className="char-grid">
            {CHARACTERS.map((ch) => (
              <div
                key={ch.id}
                className={`char-card ${selectedChar === ch.id ? 'selected' : ''} ${selectedChars.includes(ch.id) ? 'taken' : ''}`}
                onClick={() => handleSelectChar(ch.id)}
              >
                <div className="char-avatar" style={{ background: ch.color }} />
                <span className="char-name">{ch.name}</span>
                <span className="char-species">{ch.species}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={!selectedChar}>
            Confirm Character
          </button>
        </>
      )}

      {role === 'phone' && myPlayer && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <div className="char-avatar" style={{ background: getCharacter(myPlayer.characterId)?.color, width: 64, height: 64, borderRadius: '50%', margin: '0 auto 8px' }} />
          <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{myPlayer.name}</p>
          <p style={{ color: 'var(--text-dim)' }}>Waiting for host to start...</p>
        </div>
      )}

      {/* Player list */}
      <div className="player-list">
        <h3 style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: 8 }}>
          Players ({playerList.length}/8)
        </h3>
        {playerList.map((p) => {
          const ch = getCharacter(p.characterId);
          return (
            <div key={p.id} className="player-row">
              <div className="player-dot" style={{ background: ch?.color }} />
              <span>{p.name}</span>
              <span style={{ color: 'var(--text-dim)', marginLeft: 'auto', fontSize: '0.8rem' }}>
                {ch?.species}
              </span>
            </div>
          );
        })}
      </div>

      {/* Start button (TV host only) */}
      {role === 'tv' && playerList.length >= 2 && (
        <button className="btn btn-primary" onClick={handleStartGame} style={{ marginTop: 16 }}>
          Start Game!
        </button>
      )}
    </div>
  );
}
