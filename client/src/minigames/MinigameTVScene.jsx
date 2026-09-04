import React, { useState, useEffect } from 'react';
import { getCharacter } from '../utils/characters';
import useStore from '../store';

export default function MinigameTVScene({ gameState }) {
  const { send } = useStore();
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(15);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  const players = Object.values(gameState?.players || {});

  useEffect(() => {
    // Countdown before minigame starts
    const countdownInterval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countdownInterval);
          setStarted(true);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(countdownInterval);
  }, []);

  useEffect(() => {
    if (!started) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          setFinished(true);
          // Auto-resolve: pick player with most coins as winner (placeholder)
          const winner = players.reduce((a, b) => a.coins > b.coins ? a : b, players[0]);
          if (winner) {
            send({ type: 'minigame_result', winnerId: winner.id });
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [started]);

  // Minigame names for display
  const minigameNames = [
    'Coconut Tap Dash',
    'Tightrope Tilt',
    'Shell Memory',
    'Vine Tug',
    'Firefly Catch',
  ];
  const gameName = minigameNames[Math.floor(Math.random() * minigameNames.length)];

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #1a0a2e 0%, #0a0a1a 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
    }}>
      <h1 style={{ color: 'var(--accent)', fontSize: 'clamp(2rem, 5vw, 3rem)' }}>
        Minigame Time!
      </h1>

      {!started && (
        <div style={{ fontSize: '6rem', color: 'var(--accent)', fontWeight: 700 }}>
          {countdown}
        </div>
      )}

      {started && !finished && (
        <>
          <p style={{ fontSize: '2rem', color: 'var(--text-dim)' }}>{timeLeft}s</p>

          {/* Player progress bars */}
          <div style={{ width: '80%', maxWidth: 600 }}>
            {players.map((p) => {
              const ch = getCharacter(p.characterId);
              return (
                <div key={p.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="lb-dot" style={{ background: ch?.color }} />
                      {p.name}
                    </span>
                  </div>
                  <div className="mash-bar-container">
                    <div
                      className="mash-bar"
                      style={{
                        width: `${Math.min(100, Math.random() * 60 + 20)}%`,
                        background: `linear-gradient(90deg, ${ch?.color}, ${ch?.accent})`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {finished && (
        <p style={{ color: 'var(--success)', fontSize: '1.5rem' }}>
          Minigame Complete!
        </p>
      )}
    </div>
  );
}
