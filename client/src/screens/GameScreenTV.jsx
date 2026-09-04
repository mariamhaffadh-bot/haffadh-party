import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Stars } from '@react-three/drei';
import useStore from '../store';
import IslandBoard from '../components/IslandBoard';
import { Dice3D } from '../components/Dice3D';
import { getCharacter } from '../utils/characters';
import MinigameTVScene from '../minigames/MinigameTVScene';

function CinematicCamera({ gameState }) {
  const controlsRef = useRef();

  useEffect(() => {
    if (!controlsRef.current) return;
    // Auto-rotate when idle
    controlsRef.current.autoRotate = gameState?.turnPhase === 'roll';
    controlsRef.current.autoRotateSpeed = 0.3;
  }, [gameState?.turnPhase]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      minDistance={8}
      maxDistance={45}
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

  // Sort players by coins for leaderboard
  const sorted = [...players].sort((a, b) => (b.coins + b.totems.length * 20) - (a.coins + a.totems.length * 20));

  return (
    <div className="tv-overlay">
      <div className="tv-header">
        {/* Turn info */}
        <div className="tv-turn-info">
          {gameState.phase === 'playing' && (
            <>
              <h2>
                {currentChar && (
                  <span style={{ color: currentChar.color }}>
                    {currentPlayer?.name}'s Turn
                  </span>
                )}
              </h2>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                Turn {gameState.turnNumber} / {gameState.totalTurns}
              </span>
            </>
          )}
        </div>

        {/* Leaderboard */}
        <div className="tv-leaderboard">
          <h3>Leaderboard</h3>
          {sorted.map((p, i) => {
            const ch = getCharacter(p.characterId);
            return (
              <div key={p.id} className="lb-row">
                <span className="lb-name">
                  <span className="lb-dot" style={{ background: ch?.color }} />
                  {p.name}
                </span>
                <span className="lb-coins">{p.coins} coins</span>
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

export default function GameScreenTV() {
  const { gameState } = useStore();

  if (gameState?.phase === 'minigame') {
    return <MinigameTVScene gameState={gameState} />;
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas
        shadows
        camera={{ position: [20, 15, 20], fov: 50 }}
        gl={{ antialias: true, toneMapping: 3 }}
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.3} />
          <directionalLight
            position={[15, 20, 10]}
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

          {/* Sky */}
          <Stars radius={100} depth={50} count={2000} factor={4} />
          <fog attach="fog" args={['#1a1a3e', 40, 80]} />

          {/* Island Board */}
          <IslandBoard gameState={gameState} />

          {/* Dice (show during roll) */}
          {gameState?.lastDiceRoll && (
            <Dice3D value={gameState.lastDiceRoll} rolling={gameState.turnPhase === 'moving'} />
          )}

          <CinematicCamera gameState={gameState} />
        </Suspense>
      </Canvas>

      <TVOverlay gameState={gameState} />
      <GameOverOverlay gameState={gameState} />
    </div>
  );
}
