import React, { useState } from 'react';
import useStore from '../store';
import { getCharacter } from '../utils/characters';
import MinigamePhone from '../minigames/MinigamePhone';

export default function GameScreenPhone() {
  const { gameState, clientId, send, role } = useStore();
  const [papReady, setPapReady] = useState(false);
  const [showInventory, setShowInventory] = useState(false);

  if (!gameState) return <div className="center-screen"><p>Loading...</p></div>;

  const players = gameState.players || {};
  const currentPlayerId = gameState.currentPlayerId;
  const currentPlayer = players[currentPlayerId];
  const isMyTurn = currentPlayerId === clientId || role === 'local';
  const myPlayer = role === 'local' ? currentPlayer : players[clientId];
  const myChar = myPlayer ? getCharacter(myPlayer.characterId) : null;
  const currentChar = currentPlayer ? getCharacter(currentPlayer.characterId) : null;

  // ─── Pass-and-play handoff ───
  if (role === 'local' && !papReady && gameState.turnPhase === 'roll' && gameState.phase === 'playing') {
    return (
      <div className="pass-screen">
        <h2>Pass to {currentPlayer?.name}!</h2>
        <div className="char-avatar" style={{ background: currentChar?.color, width: 80, height: 80, borderRadius: '50%', margin: '0 auto' }} />
        <p style={{ color: 'var(--text-dim)' }}>{currentChar?.species}</p>
        <button className="btn btn-primary" onClick={() => setPapReady(true)}>I'm Ready!</button>
      </div>
    );
  }

  // ─── Minigame phase ───
  if (gameState.phase === 'minigame') {
    return <MinigamePhone gameState={gameState} clientId={clientId} send={send} />;
  }

  // ─── Bonus Idol reveal ───
  if (gameState.phase === 'bonus_reveal') {
    const bonusAchievements = gameState.bonusAchievements || [];
    const allPlayers = Object.values(players);
    return (
      <div className="phone-game">
        <h2 style={{ color: 'var(--accent)' }}>Bonus Idol Reveal!</h2>
        {bonusAchievements.map((ach) => {
          const winner = allPlayers.find((p) => p.bonusIdols?.includes(ach.id));
          return (
            <div key={ach.id} className="event-card" style={{ marginBottom: 8 }}>
              <h3>{ach.name}</h3>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>{ach.description}</p>
              {winner && <p style={{ color: 'var(--accent)', fontWeight: 600 }}>{winner.name} +1 Idol</p>}
            </div>
          );
        })}
        {role === 'tv' || role === 'local' ? (
          <button className="btn btn-primary" onClick={() => send({ type: 'finish_bonus_reveal' })}>
            Show Final Standings
          </button>
        ) : (
          <p style={{ color: 'var(--text-dim)' }}>Waiting for host...</p>
        )}
      </div>
    );
  }

  // ─── Game Over ───
  if (gameState.phase === 'gameover') {
    const sorted = [...Object.values(players)].sort((a, b) => b.score - a.score);
    return (
      <div className="phone-game">
        <h2 style={{ color: 'var(--accent)' }}>Final Standings</h2>
        <div className="final-scores">
          {sorted.map((p, i) => {
            const ch = getCharacter(p.characterId);
            return (
              <div key={p.id} className={`final-row ${i === 0 ? 'winner' : ''}`}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="lb-dot" style={{ background: ch?.color }} />
                  {p.name}
                </span>
                <span>{p.score} Idols ({p.idols?.length || 0} + {p.bonusIdols?.length || 0} bonus)</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Item Inventory ───
  const renderInventory = () => {
    if (!showInventory || !myPlayer) return null;
    const items = gameState.items || [];
    return (
      <div className="event-card" style={{ marginTop: 8 }}>
        <h3>Inventory ({myPlayer.items?.length || 0}/3)</h3>
        {(!myPlayer.items || myPlayer.items.length === 0) ? (
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No items</p>
        ) : (
          myPlayer.items.map((itemId, i) => {
            const item = items.find((it) => it.id === itemId);
            return (
              <div key={i} style={{ padding: '6px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item?.name || itemId}</span>
                  {isMyTurn && item?.effect !== 'shield' && (
                    <button
                      className="btn btn-small btn-primary"
                      onClick={() => send({ type: 'use_item', itemId })}
                    >
                      Use
                    </button>
                  )}
                </div>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>{item?.description}</p>
              </div>
            );
          })
        )}
        <button className="btn btn-small btn-secondary" style={{ marginTop: 8 }} onClick={() => setShowInventory(false)}>
          Close
        </button>
      </div>
    );
  };

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

      {/* Idols + round info */}
      <div className="status-bar" style={{ fontSize: '0.8rem' }}>
        <span>Idols: {myPlayer?.idols?.length || 0}</span>
        <span>Round {gameState.roundNumber} / {gameState.totalRounds}</span>
        <span
          style={{ color: 'var(--info)', cursor: 'pointer', textDecoration: 'underline' }}
          onClick={() => setShowInventory(!showInventory)}
        >
          Items ({myPlayer?.items?.length || 0})
        </span>
      </div>

      {renderInventory()}

      {!isMyTurn && role !== 'local' && (
        <p style={{ color: 'var(--text-dim)', textAlign: 'center', marginTop: 40 }}>
          Waiting for {currentPlayer?.name}'s turn...
        </p>
      )}

      {isMyTurn && gameState.turnPhase === 'roll' && (
        <>
          <div className="turn-banner">{currentPlayer?.name}'s Turn</div>
          <button className="roll-btn" onClick={handleRoll}>ROLL!</button>
          {myPlayer?.activeBonusRoll > 0 && (
            <p style={{ color: 'var(--accent)', fontSize: '0.8rem' }}>Tailwind Charm: +{myPlayer.activeBonusRoll}</p>
          )}
        </>
      )}

      {gameState.lastDiceRoll && (gameState.turnPhase === 'moving' || gameState.turnPhase === 'landed') && isMyTurn && (
        <div className="dice-result">{gameState.lastDiceRoll}</div>
      )}

      {/* Branch choice */}
      {isMyTurn && gameState.turnPhase === 'choosing_path' && (
        <div className="event-card">
          <h3>Choose Your Path!</h3>
          <p style={{ color: 'var(--text-dim)', marginBottom: 12 }}>Two paths diverge on the mountainside...</p>
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

      {/* Idol Shrine */}
      {isMyTurn && gameState.turnPhase === 'buying_idol' && (() => {
        const shrine = (gameState.idolShrines || []).find(
          (s) => s.spaceIndex === currentPlayer?.position
        );
        return (
          <div className="landmark-card">
            <h3>{shrine?.name || 'Idol Shrine'}</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>{shrine?.description}</p>
            <p className="cost">Cost: {shrine?.currentPrice} coins</p>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>
              (Price rises by 5 each time ANY idol is purchased)
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
              <button
                className="btn btn-primary btn-small"
                onClick={() => send({ type: 'buy_idol' })}
                disabled={myPlayer?.coins < (shrine?.currentPrice || 999)}
              >
                Buy Idol
              </button>
              <button className="btn btn-secondary btn-small" onClick={() => send({ type: 'skip_idol' })}>
                Skip
              </button>
            </div>
            {/* Phantom Hand option */}
            {myPlayer?.items?.includes('phantom_hand') && (
              <div style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}>
                <p style={{ fontSize: '0.8rem', color: '#ff69b4' }}>Phantom Hand: Steal an idol instead!</p>
                {Object.values(players).filter((p) => p.id !== myPlayer.id && p.idols?.length > 0).map((p) => (
                  <button
                    key={p.id}
                    className="btn btn-small"
                    style={{ background: '#ff69b4', color: '#111', margin: 4 }}
                    onClick={() => send({ type: 'use_item', itemId: 'phantom_hand', targetData: { targetPlayerId: p.id } })}
                  >
                    Steal from {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Item Shop */}
      {isMyTurn && gameState.turnPhase === 'shopping' && (
        <div className="event-card">
          <h3>Item Shop</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: 8 }}>
            Inventory: {myPlayer?.items?.length || 0}/3
          </p>
          {(gameState.items || []).map((item) => {
            const canAfford = myPlayer?.coins >= item.cost;
            const inventoryFull = (myPlayer?.items?.length || 0) >= 3;
            return (
              <div key={item.id} style={{ padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.name}</span>
                  <span style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>{item.cost} coins</span>
                </div>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.75rem', margin: '4px 0' }}>{item.description}</p>
                <button
                  className="btn btn-small btn-primary"
                  disabled={!canAfford || inventoryFull}
                  onClick={() => send({ type: 'buy_item', itemId: item.id })}
                >
                  {inventoryFull ? 'Full' : !canAfford ? 'Too expensive' : 'Buy'}
                </button>
              </div>
            );
          })}
          <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => send({ type: 'leave_shop' })}>
            Leave Shop
          </button>
        </div>
      )}

      {/* Duel */}
      {isMyTurn && gameState.turnPhase === 'duel' && gameState.pendingDuel && (
        <div className="event-card">
          <h3>Duel!</h3>
          <p style={{ color: 'var(--text-dim)' }}>
            You face {players[gameState.pendingDuel.opponentId]?.name} in combat!
          </p>
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => send({ type: 'resolve_duel' })}>
            Fight!
          </button>
        </div>
      )}

      {/* Event display */}
      {gameState.pendingEvent && isMyTurn && (
        <div className="event-card">
          <h3>{gameState.pendingEvent.name}</h3>
          <p style={{ color: 'var(--text-dim)' }}>{gameState.pendingEvent.description}</p>
        </div>
      )}

      {/* End turn */}
      {isMyTurn && gameState.turnPhase === 'landed' && (
        <button className="btn btn-secondary" onClick={handleEndTurn}>End Turn</button>
      )}
    </div>
  );
}
