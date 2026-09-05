import React, { useState, useRef, useCallback, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';
import * as THREE from 'three';
import useStore from '../store';
import { getCharacter } from '../utils/characters';
import IslandBoard from '../components/IslandBoard';
import { Dice3D } from '../components/Dice3D';
import { getNodePosition } from '../components/BoardPath';
import VirtualJoystick from '../components/VirtualJoystick';
import MinigamePhone from '../minigames/MinigamePhone';
import { MinigameTransitionIn } from '../components/MinigameTransition';

// ═══════════════════════════════════════════════════════
// PHONE GAME SCREEN — 3D map + joystick + dice
// ═══════════════════════════════════════════════════════

// Chase camera that follows the player's token
function ChaseCamera({ targetPos, isMoving }) {
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (!targetPos) return;
    target.set(targetPos[0], targetPos[1], targetPos[2]);

    if (isMoving) {
      // Chase cam: behind and above token
      const camTarget = target.clone().add(new THREE.Vector3(-3, 5, 4));
      camera.position.lerp(camTarget, 0.04);
    } else {
      // Overview: top-down three-quarter
      const camTarget = target.clone().add(new THREE.Vector3(0, 12, 8));
      camera.position.lerp(camTarget, 0.03);
    }
    camera.lookAt(target);
  });

  return null;
}

// Direction arrows showing legal moves from current node
function DirectionArrows({ currentNodeId, legalMoves, boardNodes }) {
  if (!legalMoves || legalMoves.length === 0 || !currentNodeId) return null;

  const currentPos = getNodePosition(boardNodes, currentNodeId);

  return (
    <group>
      {legalMoves.map((targetId) => {
        const targetPos = getNodePosition(boardNodes, targetId);
        const dir = new THREE.Vector3(
          targetPos[0] - currentPos[0],
          targetPos[1] - currentPos[1],
          targetPos[2] - currentPos[2]
        );
        const midPoint = [
          currentPos[0] + dir.x * 0.5,
          currentPos[1] + dir.y * 0.5 + 0.8,
          currentPos[2] + dir.z * 0.5,
        ];
        const angle = Math.atan2(dir.x, dir.z);

        return (
          <group key={targetId} position={midPoint}>
            <mesh rotation={[0, angle, 0]}>
              <coneGeometry args={[0.2, 0.5, 4]} />
              <meshBasicMaterial color="#44ff88" transparent opacity={0.8} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// Dice roll fullscreen overlay
function DiceOverlay({ value, rolling, onComplete }) {
  if (!rolling && !value) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 600,
      background: 'rgba(10,10,26,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Canvas camera={{ position: [0, 2, 4], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 5, 3]} intensity={1.5} />
        <Dice3D value={value} rolling={rolling} onRollComplete={onComplete} size={2} />
      </Canvas>
      {!rolling && value && (
        <div style={{
          position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          fontSize: '3rem', fontWeight: 700, color: 'var(--accent)',
          textShadow: '0 0 20px rgba(247,183,49,0.6)',
        }}>
          {value}
        </div>
      )}
    </div>
  );
}

export default function GameScreenPhone() {
  const { gameState, clientId, send, role } = useStore();
  const [papReady, setPapReady] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [diceRolling, setDiceRolling] = useState(false);
  const [showDice, setShowDice] = useState(false);
  const [mgTransition, setMgTransition] = useState(false);

  if (!gameState) return <div className="center-screen"><p>Loading...</p></div>;

  const players = gameState.players || {};
  const currentPlayerId = gameState.currentPlayerId;
  const currentPlayer = players[currentPlayerId];
  const isMyTurn = currentPlayerId === clientId || role === 'local';
  const myPlayer = role === 'local' ? currentPlayer : players[clientId];
  const myChar = myPlayer ? getCharacter(myPlayer.characterId) : null;
  const currentChar = currentPlayer ? getCharacter(currentPlayer.characterId) : null;
  const boardNodes = gameState.boardNodes || [];
  const isMoving = gameState.turnPhase === 'moving' && isMyTurn;
  const movesRemaining = gameState.movesRemaining || 0;
  const legalMoves = gameState.legalMoves || [];

  // Get my token position for camera
  const myNodeId = myPlayer?.nodeId || 'start';
  const myPos = getNodePosition(boardNodes, myNodeId);

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
    if (mgTransition) {
      return (
        <MinigameTransitionIn
          minigame={gameState.activeMinigame}
          onComplete={() => setMgTransition(false)}
        />
      );
    }
    return <MinigamePhone gameState={gameState} clientId={clientId} send={send} />;
  }

  // Trigger transition when entering minigame
  if (gameState.phase === 'minigame' && !mgTransition) {
    setMgTransition(true);
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
        {(role === 'tv' || role === 'local') && (
          <button className="btn btn-primary" onClick={() => send({ type: 'finish_bonus_reveal' })}>
            Show Final Standings
          </button>
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
                <span>{p.score} Idols</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Joystick handler: pick nearest legal node in joystick direction ───
  const handleJoystickDirection = useCallback(({ x, y }) => {
    if (!isMoving || legalMoves.length === 0) return;

    const currentPos = getNodePosition(boardNodes, myPlayer?.nodeId || 'start');

    // Find which legal move best matches the joystick direction
    let bestNode = null;
    let bestDot = -Infinity;

    for (const targetId of legalMoves) {
      const targetPos = getNodePosition(boardNodes, targetId);
      // Direction from current to target, projected to XZ plane
      const dx = targetPos[0] - currentPos[0];
      const dz = targetPos[2] - currentPos[2];
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      // Joystick x maps to world x, joystick y (down=positive) maps to world z
      const dot = (dx / len) * x + (dz / len) * y;

      if (dot > bestDot) {
        bestDot = dot;
        bestNode = targetId;
      }
    }

    if (bestNode && bestDot > 0.2) {
      send({ type: 'move_step', targetNodeId: bestNode });
    }
  }, [isMoving, legalMoves, boardNodes, myPlayer, send]);

  // ─── Dice roll handler ───
  const handleRollTap = () => {
    if (role === 'local') setPapReady(false);
    setShowDice(true);
    setDiceRolling(true);
    send({ type: 'roll_dice' });
  };

  const handleDiceComplete = () => {
    setDiceRolling(false);
    setTimeout(() => setShowDice(false), 800);
  };

  const handleEndTurn = () => {
    if (role === 'local') setPapReady(false);
    send({ type: 'end_turn' });
  };

  // ─── Inventory panel ───
  const renderInventory = () => {
    if (!showInventory || !myPlayer) return null;
    const items = gameState.items || [];
    return (
      <div className="event-card" style={{ position: 'fixed', bottom: 120, right: 10, zIndex: 400, width: 250 }}>
        <h3>Inventory ({myPlayer.items?.length || 0}/3)</h3>
        {(!myPlayer.items || myPlayer.items.length === 0) ? (
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Empty</p>
        ) : (
          myPlayer.items.map((itemId, i) => {
            const item = items.find((it) => it.id === itemId);
            return (
              <div key={i} style={{ padding: '4px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{item?.name || itemId}</span>
                  {isMyTurn && item?.effect !== 'shield' && (
                    <button className="btn btn-small btn-primary" onClick={() => send({ type: 'use_item', itemId })}>Use</button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <button className="btn btn-small btn-secondary" style={{ marginTop: 6 }} onClick={() => setShowInventory(false)}>Close</button>
      </div>
    );
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* 3D Map View */}
      <Canvas
        shadows="basic"
        camera={{ position: [0, 14, 10], fov: 55 }}
        gl={{ antialias: true, powerPreference: 'low-power' }}
        dpr={[1, 1.5]} // lower DPR for phone GPU
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.35} />
          <directionalLight
            position={[12, 20, 8]}
            intensity={1.5}
            color="#fff5e0"
            castShadow
            shadow-mapSize={[512, 512]} // lower for phone
            shadow-camera-far={50}
            shadow-camera-left={-20}
            shadow-camera-right={20}
            shadow-camera-top={20}
            shadow-camera-bottom={-20}
          />
          <hemisphereLight args={['#87CEEB', '#2d5016', 0.3]} />
          <fog attach="fog" args={['#1a1a3e', 40, 70]} />

          <IslandBoard gameState={gameState} />

          {/* Direction arrows during movement */}
          {isMoving && (
            <DirectionArrows
              currentNodeId={myPlayer?.nodeId}
              legalMoves={legalMoves}
              boardNodes={boardNodes}
            />
          )}

          <ChaseCamera targetPos={myPos} isMoving={isMoving} />

          {/* Allow pinch-zoom/drag between turns */}
          {!isMoving && (
            <MapControls
              enableRotate={false}
              minDistance={5}
              maxDistance={35}
              enableDamping
              dampingFactor={0.1}
            />
          )}
        </Suspense>
      </Canvas>

      {/* ── HUD Overlay ── */}
      {/* Status bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        padding: '8px 12px',
        background: 'rgba(10,10,26,0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        zIndex: 300, fontSize: '0.85rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: myChar?.color }} />
          <span>{myPlayer?.name}</span>
        </div>
        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{myPlayer?.coins || 0}c</span>
        <span style={{ fontSize: '0.75rem' }}>{myPlayer?.idols?.length || 0} Idols</span>
        <span
          style={{ fontSize: '0.75rem', color: 'var(--info)', cursor: 'pointer' }}
          onClick={() => setShowInventory(!showInventory)}
        >
          Items ({myPlayer?.items?.length || 0})
        </span>
      </div>

      {/* Round/turn info */}
      <div style={{
        position: 'fixed', top: 38, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(10,10,26,0.75)', borderRadius: 8,
        padding: '4px 14px', zIndex: 300, fontSize: '0.75rem', color: 'var(--text-dim)',
      }}>
        R{gameState.roundNumber}/{gameState.totalRounds}
        {isMyTurn ? ' — Your Turn' : ` — ${currentPlayer?.name}'s Turn`}
      </div>

      {/* Moves remaining indicator */}
      {isMoving && movesRemaining > 0 && (
        <div style={{
          position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(247,183,49,0.9)', color: '#111',
          borderRadius: 20, padding: '6px 18px', zIndex: 300,
          fontWeight: 700, fontSize: '1rem',
        }}>
          {movesRemaining} move{movesRemaining !== 1 ? 's' : ''} left
        </div>
      )}

      {/* Roll button */}
      {isMyTurn && gameState.turnPhase === 'roll' && (
        <div style={{
          position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 400,
        }}>
          <button className="roll-btn" onClick={handleRollTap}>
            {myPlayer?.activeBonusRoll > 0 ? `ROLL! +${myPlayer.activeBonusRoll}` : 'ROLL!'}
          </button>
        </div>
      )}

      {/* Joystick (only during movement) */}
      {isMoving && movesRemaining > 0 && (
        <VirtualJoystick onDirection={handleJoystickDirection} disabled={false} />
      )}

      {/* Dice overlay */}
      {showDice && (
        <DiceOverlay
          value={gameState.lastDiceRoll}
          rolling={diceRolling}
          onComplete={handleDiceComplete}
        />
      )}

      {/* Space resolution UIs (fixed bottom panels) */}
      {/* Idol Shrine */}
      {isMyTurn && gameState.turnPhase === 'buying_idol' && (() => {
        const shrine = (gameState.idolShrines || []).find((s) => s.nodeId === currentPlayer?.nodeId);
        return (
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 400, padding: 12, background: 'rgba(10,10,26,0.92)', borderTop: '2px solid var(--accent)' }}>
            <h3 style={{ color: 'var(--accent)', textAlign: 'center', margin: '0 0 4px' }}>{shrine?.name || 'Idol Shrine'}</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textAlign: 'center' }}>Cost: {shrine?.currentPrice}c (rises +5 per purchase)</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
              <button className="btn btn-primary btn-small" onClick={() => send({ type: 'buy_idol' })} disabled={myPlayer?.coins < (shrine?.currentPrice || 999)}>Buy Idol</button>
              <button className="btn btn-secondary btn-small" onClick={() => send({ type: 'skip_idol' })}>Skip</button>
            </div>
            {myPlayer?.items?.includes('phantom_hand') && (
              <div style={{ marginTop: 6, textAlign: 'center' }}>
                <p style={{ fontSize: '0.75rem', color: '#ff69b4' }}>Phantom Hand: steal instead</p>
                {Object.values(players).filter((p) => p.id !== myPlayer.id && p.idols?.length > 0).map((p) => (
                  <button key={p.id} className="btn btn-small" style={{ background: '#ff69b4', color: '#111', margin: 2 }}
                    onClick={() => send({ type: 'use_item', itemId: 'phantom_hand', targetData: { targetPlayerId: p.id } })}>
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
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 400, padding: 12, background: 'rgba(10,10,26,0.92)', borderTop: '2px solid var(--accent)', maxHeight: '50vh', overflowY: 'auto' }}>
          <h3 style={{ color: 'var(--accent)', textAlign: 'center', margin: '0 0 6px' }}>Item Shop</h3>
          {(gameState.items || []).map((item) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.name}</span>
                <span style={{ color: 'var(--accent)', marginLeft: 8, fontSize: '0.8rem' }}>{item.cost}c</span>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.7rem', margin: '2px 0 0' }}>{item.description}</p>
              </div>
              <button className="btn btn-small btn-primary" disabled={myPlayer?.coins < item.cost || (myPlayer?.items?.length || 0) >= 3}
                onClick={() => send({ type: 'buy_item', itemId: item.id })}>Buy</button>
            </div>
          ))}
          <button className="btn btn-secondary btn-small" style={{ marginTop: 8, width: '100%' }} onClick={() => send({ type: 'leave_shop' })}>Leave</button>
        </div>
      )}

      {/* Duel */}
      {isMyTurn && gameState.turnPhase === 'duel' && gameState.pendingDuel && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 400, padding: 16, background: 'rgba(10,10,26,0.92)', borderTop: '2px solid #ff8833', textAlign: 'center' }}>
          <h3 style={{ color: '#ff8833' }}>Duel!</h3>
          <p style={{ color: 'var(--text-dim)' }}>vs {players[gameState.pendingDuel.opponentId]?.name}</p>
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => send({ type: 'resolve_duel' })}>Fight!</button>
        </div>
      )}

      {/* Event */}
      {gameState.pendingEvent && isMyTurn && gameState.turnPhase === 'landed' && (
        <div style={{ position: 'fixed', bottom: 70, left: '50%', transform: 'translateX(-50%)', zIndex: 400, background: 'rgba(10,10,26,0.92)', border: '1px solid var(--accent)', borderRadius: 12, padding: '12px 20px', textAlign: 'center', maxWidth: 280 }}>
          <h3 style={{ color: 'var(--accent)', margin: '0 0 4px' }}>{gameState.pendingEvent.name}</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>{gameState.pendingEvent.description}</p>
        </div>
      )}

      {/* End turn */}
      {isMyTurn && gameState.turnPhase === 'landed' && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 400 }}>
          <button className="btn btn-secondary" onClick={handleEndTurn}>End Turn</button>
        </div>
      )}

      {/* Board hazard event banner */}
      {gameState.pendingBoardEvent && (
        <div style={{
          position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(40,10,5,0.95)', border: '1px solid #ff4400',
          borderRadius: 10, padding: '8px 16px', zIndex: 350, textAlign: 'center', maxWidth: 280,
        }}>
          <h4 style={{ color: '#ff6633', margin: 0 }}>{gameState.pendingBoardEvent.name}</h4>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.7rem', margin: 0 }}>{gameState.pendingBoardEvent.description}</p>
        </div>
      )}

      {renderInventory()}
    </div>
  );
}
