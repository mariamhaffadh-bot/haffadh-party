import React, { useState } from 'react';
import useStore from '../store';
import { getCharacter } from '../utils/characters';
import MinigamePhone from '../minigames/MinigamePhone';

export default function GameScreenPhone() {
  const { gameState, clientId, send, role } = useStore();

  // Pass-and-play: show "pass the device" screen between turns
  const [papReady, setPapReady] = useState(false);

  if (!gameState) return <div className="center-screen"><p>Loading...</p></div>;

  const players = gameState.players || {};
  const currentPlayerId = gameState.currentPlayerId;
  const currentPlayer = players[currentPlayerId];
  const isMyTurn = currentPlayerId === clientId || role === 'local';
  const myPlayer = role === 'local' ? currentPlayer : players[clientId];
  const myChar = myPlayer ? getCharacter(myPlayer.characterId) : null;
  const currentChar = currentPlayer ? getCharacter(currentPlayer.characterId) : null;

  // Pass-and-play: show pass screen
  if (role === 'local' && !papReady && gameState.turnPhase === 'roll') {
    return (
      <div className="pass-screen">
        <h2>Pass to {currentPlayer?.name}!</h2>
        <div className="char-avatar" style={{
          background: currentChar?.color,
          width: 80,
          height: 80,
          borderRadius: '50%',
          margin: '0 auto',
        }} />
        <p style={{ color: 'var(--text-dim)' }}>{currentChar?.species}</p>
        <button className="btn btn-primary" onClick={() => setPapReady(true)}>
          I'm Ready!
        </button>
      </div>
    );
  }

  // Minigame phase
  if (gameState.phase === 'minigame' || gameState.turnPhase === 'minigame') {
    return <MinigamePhone gameState={gameState} clientId={clientId} send={send} />;
  }

  // Game over
  if (gameState.phase === 'gameover') {
    const playerList = Object.values(players);
    const sorted = [...playerList].sort((a, b) => b.score - a.score);
    return (
      <div className="phone-game">
        <h2 style={{ color: 'var(--accent)' }}>Game Over!</h2>
        <div className="final-scores">
          {sorted.map((p, i) => {
            const ch = getCharacter(p.characterId);
            return (
              <div key={p.id} className={`final-row ${i === 0 ? 'winner' : ''}`}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="lb-dot" style={{ background: ch?.color }} />
                  {p.name}
                </span>
                <span>{p.score} pts</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const handleRoll = () => {
    if (role === 'local') setPapReady(false);
    send({ type: 'roll_dice' });
  };

  const handleEndTurn = () => {
    if (role === 'local') setPapReady(false);
    send({ type: 'end_turn' });
  };

  return (
    <div className="phone-game">
      {/* Status bar */}
      <div className="status-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="player-dot" style={{ background: myChar?.color }} />
          <span>{myPlayer?.name}</span>
        </div>
        <span className="coin-display">{myPlayer?.coins || 0} coins</span>
      </div>

      <div className="turn-banner">
        Turn {gameState.turnNumber} / {gameState.totalTurns}
        {!isMyTurn && ` — ${currentPlayer?.name}'s turn`}
      </div>

      {/* Dice roll */}
      {isMyTurn && gameState.turnPhase === 'roll' && (
        <button className="roll-btn" onClick={handleRoll}>
          ROLL!
        </button>
      )}

      {/* Dice result */}
      {gameState.lastDiceRoll && (gameState.turnPhase === 'moving' || gameState.turnPhase === 'landed') && isMyTurn && (
        <div className="dice-result">{gameState.lastDiceRoll}</div>
      )}

      {/* Branch choice */}
      {isMyTurn && gameState.turnPhase === 'choosing_path' && (
        <div className="event-card">
          <h3>Choose Your Path!</h3>
          <p style={{ color: 'var(--text-dim)', marginBottom: 12 }}>Two paths diverge...</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-small" onClick={() => send({ type: 'choose_path', pathIndex: 0 })}>
              Left Path
            </button>
            <button className="btn btn-secondary btn-small" onClick={() => send({ type: 'choose_path', pathIndex: 1 })}>
              Right Path
            </button>
          </div>
        </div>
      )}

      {/* Landmark purchase */}
      {isMyTurn && gameState.turnPhase === 'buying_landmark' && (
        <div className="landmark-card">
          <h3>Landmark Available!</h3>
          <p className="cost">Cost: coins</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="btn btn-primary btn-small" onClick={() => send({ type: 'buy_landmark' })}>
              Buy Totem
            </button>
            <button className="btn btn-secondary btn-small" onClick={() => send({ type: 'skip_landmark' })}>
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Event display */}
      {gameState.pendingEvent && isMyTurn && (
        <div className="event-card">
          <h3>{gameState.pendingEvent.name}</h3>
          <p style={{ color: 'var(--text-dim)' }}>{gameState.pendingEvent.description}</p>
        </div>
      )}

      {/* End turn button */}
      {isMyTurn && gameState.turnPhase === 'landed' && (
        <button className="btn btn-secondary" onClick={handleEndTurn}>
          End Turn
        </button>
      )}

      {/* Waiting message */}
      {!isMyTurn && role !== 'local' && (
        <p style={{ color: 'var(--text-dim)', textAlign: 'center', marginTop: 40 }}>
          Waiting for {currentPlayer?.name} to play...
        </p>
      )}

      {/* Totems display */}
      {myPlayer?.totems?.length > 0 && (
        <div style={{ marginTop: 'auto', padding: 8 }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Totems: {myPlayer.totems.length}
          </p>
        </div>
      )}
    </div>
  );
}
