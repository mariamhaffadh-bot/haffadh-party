import React, { useRef, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import useStore from '../store';
import IslandBoard from '../components/IslandBoard';
import { Dice3D } from '../components/Dice3D';
import { getCharacter } from '../utils/characters';
import MinigameTVScene from '../minigames/MinigameTVScene';

function CinematicCamera({ gameState }) {
  const controlsRef = useRef();

  useEffect(() => {
    if (!controlsRef.current) return;
    controlsRef.current.autoRotate = gameState?.turnPhase === 'roll';
    controlsRef.current.autoRotateSpeed = 0.3;
  }, [gameState?.turnPhase]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      minDistance={8}
      maxDistance={50}
      minPolarAngle={0.3}
      maxPolarAngle={Math.PI / 2.2}
      autoRotate
      autoRotateSpeed={0.3}
      enableDamping
      dampingFactor={0.05}
    />
  );
}

function TVOverlay({ gameState }) {
  if (!gameState) return null;
  const players = Object.values(gameState.players || {});
  const currentPlayer = gameState.players?.[gameState.currentPlayerId];
  const currentChar = currentPlayer ? getCharacter(currentPlayer.characterId) : null;

  // Sort by idols desc, then coins
  const sorted = [...players].sort((a, b) => {
    const aScore = (a.idols?.length || 0) + (a.bonusIdols?.length || 0);
    const bScore = (b.idols?.length || 0) + (b.bonusIdols?.length || 0);
    if (bScore !== aScore) return bScore - aScore;
    return b.coins - a.coins;
  });

  return (
    <div className="tv-overlay">
      <div className="tv-header">
        <div className="tv-turn-info">
          {gameState.phase === 'playing' && currentPlayer && (
            <>
              <h2>
                <span style={{ color: currentChar?.color }}>
                  {currentPlayer.name}'s Turn
                </span>
              </h2>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                Round {gameState.roundNumber} / {gameState.totalRounds}
              </span>
            </>
          )}
        </div>

        <div className="tv-leaderboard">
          <h3>Leaderboard</h3>
          {sorted.map((p) => {
            const ch = getCharacter(p.characterId);
            return (
              <div key={p.id} className="lb-row">
                <span className="lb-name">
                  <span className="lb-dot" style={{ background: ch?.color }} />
                  {p.name}
                </span>
                <span style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: '0.75rem' }}>
                  <span style={{ color: '#ffd700', fontWeight: 600 }}>{p.idols?.length || 0} Idols</span>
                  <span className="lb-coins">{p.coins}c</span>
                  <span style={{ color: '#88bbff' }}>{p.minigamesWon || 0}W</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dice display */}
      {gameState.lastDiceRoll && gameState.turnPhase === 'moving' && (
        <div className="tv-dice-display">{gameState.lastDiceRoll}</div>
      )}

      {/* Event banner */}
      {gameState.pendingEvent && (
        <div className="tv-event-banner">
          <h3>{gameState.pendingEvent.name}</h3>
          <p>{gameState.pendingEvent.description}</p>
        </div>
      )}

      {/* Duel banner */}
      {gameState.pendingDuel && gameState.turnPhase === 'duel' && (
        <div className="tv-event-banner">
          <h3>Duel!</h3>
          <p>
            {gameState.players[gameState.pendingDuel.challengerId]?.name} vs{' '}
            {gameState.players[gameState.pendingDuel.opponentId]?.name}
          </p>
        </div>
      )}

      {/* Board hazard event cinematic */}
      {gameState.pendingBoardEvent && (
        <div className="tv-event-banner" style={{ borderColor: '#ff4400', background: 'rgba(40,10,5,0.95)' }}>
          <h3 style={{ color: '#ff6633' }}>{gameState.pendingBoardEvent.name}</h3>
          <p>{gameState.pendingBoardEvent.description}</p>
        </div>
      )}

      {/* Active hazards indicator */}
      {(gameState.activeHazards?.length > 0 || gameState.disabledEdges?.length > 0) && (
        <div style={{
          position: 'absolute', bottom: 16, left: 16,
          background: 'rgba(10,10,26,0.85)', borderRadius: 'var(--radius)',
          padding: '8px 14px', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,100,50,0.3)', fontSize: '0.75rem',
        }}>
          <span style={{ color: '#ff6633' }}>
            {gameState.disabledEdges?.length || 0} path(s) blocked
          </span>
        </div>
      )}
    </div>
  );
}

function BonusRevealOverlay({ gameState }) {
  if (gameState?.phase !== 'bonus_reveal') return null;
  const { send } = useStore();
  const players = Object.values(gameState.players || {});
  const achievements = gameState.bonusAchievements || [];

  return (
    <div className="gameover-overlay" style={{ background: 'rgba(10,10,26,0.92)' }}>
      <h1 style={{ color: 'var(--accent)', marginBottom: 16 }}>Bonus Idol Awards!</h1>
      {achievements.map((ach) => {
        const winner = players.find((p) => p.bonusIdols?.includes(ach.id));
        const ch = winner ? getCharacter(winner.characterId) : null;
        return (
          <div key={ach.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
            background: 'var(--bg-card)', borderRadius: 'var(--radius)', marginBottom: 8,
            minWidth: 300, border: winner ? `2px solid ${ch?.color || '#fff'}` : '1px solid rgba(255,255,255,0.1)',
          }}>
            <span style={{ fontSize: '1.5rem' }}>🏆</span>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--accent)' }}>{ach.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{ach.description}</div>
              {winner && <div style={{ color: ch?.color, fontWeight: 600, fontSize: '0.9rem' }}>{winner.name} +1 Idol</div>}
            </div>
          </div>
        );
      })}
      <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => send({ type: 'finish_bonus_reveal' })}>
        Final Standings
      </button>
    </div>
  );
}

function GameOverOverlay({ gameState }) {
  if (gameState?.phase !== 'gameover') return null;
  const players = Object.values(gameState.players || {});
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];

  return (
    <div className="gameover-overlay">
      <h1>Game Over!</h1>
      <h2 style={{ color: getCharacter(winner?.characterId)?.color }}>
        {winner?.name} Wins!
      </h2>
      <p style={{ color: 'var(--text-dim)' }}>
        with {winner?.score} Idols ({winner?.idols?.length || 0} purchased + {winner?.bonusIdols?.length || 0} bonus)
      </p>
      <div className="final-scores">
        {sorted.map((p, i) => {
          const ch = getCharacter(p.characterId);
          return (
            <div key={p.id} className={`final-row ${i === 0 ? 'winner' : ''}`}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="lb-dot" style={{ background: ch?.color }} />
                {p.name}
              </span>
              <span>{p.score} Idols ({p.idols?.length || 0}+{p.bonusIdols?.length || 0})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function GameScreenTV() {
  const { gameState } = useStore();

  if (gameState?.phase === 'minigame') {
    return <MinigameTVScene gameState={gameState} />;
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas
        shadows
        camera={{ position: [22, 18, 22], fov: 50 }}
        gl={{ antialias: true, toneMapping: 3 }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.3} />
          <directionalLight
            position={[15, 25, 10]}
            intensity={1.8}
            color="#fff5e0"
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-far={60}
            shadow-camera-left={-25}
            shadow-camera-right={25}
            shadow-camera-top={25}
            shadow-camera-bottom={-25}
          />
          <hemisphereLight args={['#87CEEB', '#2d5016', 0.4]} />
          <Stars radius={100} depth={50} count={2000} factor={4} />
          <fog attach="fog" args={['#1a1a3e', 45, 85]} />

          <IslandBoard gameState={gameState} />

          {gameState?.lastDiceRoll && (
            <Dice3D value={gameState.lastDiceRoll} rolling={gameState.turnPhase === 'moving'} />
          )}

          <CinematicCamera gameState={gameState} />
        </Suspense>
      </Canvas>

      <TVOverlay gameState={gameState} />
      <BonusRevealOverlay gameState={gameState} />
      <GameOverOverlay gameState={gameState} />
    </div>
  );
}
