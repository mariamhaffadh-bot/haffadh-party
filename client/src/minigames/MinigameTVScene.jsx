import React, { useState, useEffect } from 'react';
import { getCharacter } from '../utils/characters';
import useStore from '../store';

export default function MinigameTVScene({ gameState }) {
  const { send } = useStore();
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(15);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [rankings, setRankings] = useState(null);

  const players = Object.values(gameState?.players || {});
  const scores = gameState?.minigameScores || {};
  const minigame = gameState?.activeMinigame;

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          setStarted(true);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!started) return;
    const duration = (minigame?.duration || 15000) / 1000;
    setTimeLeft(duration);

    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          setFinished(true);
          // Auto-resolve minigame
          send({ type: 'resolve_minigame' });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [started]);

  // Show rankings after resolution
  useEffect(() => {
    if (gameState?.phase !== 'minigame' && finished) {
      // Game state moved on — rankings were received
    }
  }, [gameState?.phase]);

  // Sort players by their current scores for display
  const sortedPlayers = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
  const maxScore = Math.max(1, ...Object.values(scores));

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'linear-gradient(135deg, #1a0a2e 0%, #0a0a1a 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24,
    }}>
      <h1 style={{ color: 'var(--accent)', fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}>
        {minigame?.name || 'Minigame Time!'}
      </h1>
      <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', maxWidth: 400, textAlign: 'center' }}>
        {minigame?.description || ''}
      </p>

      {!started && (
        <div style={{ fontSize: '6rem', color: 'var(--accent)', fontWeight: 700 }}>{countdown}</div>
      )}

      {started && !finished && (
        <>
          <p style={{ fontSize: '2rem', color: 'var(--text-dim)' }}>{timeLeft}s</p>
          <div style={{ width: '80%', maxWidth: 600 }}>
            {sortedPlayers.map((p, i) => {
              const ch = getCharacter(p.characterId);
              const score = scores[p.id] || 0;
              const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
              return (
                <div key={p.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.9rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="lb-dot" style={{ background: ch?.color }} />
                      {p.name}
                    </span>
                    <span style={{ color: 'var(--accent)' }}>{score}</span>
                  </div>
                  <div className="mash-bar-container">
                    <div className="mash-bar" style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${ch?.color}, ${ch?.accent})`,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {finished && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--success)', fontSize: '1.5rem', marginBottom: 16 }}>
            Round {gameState?.roundNumber} Minigame Complete!
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 250 }}>
            {sortedPlayers.map((p, i) => {
              const ch = getCharacter(p.characterId);
              const payouts = [10, 6, 3, 1];
              const payout = payouts[i] || 0;
              return (
                <div key={p.id} className={`final-row ${i === 0 ? 'winner' : ''}`}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, width: 24 }}>{i + 1}.</span>
                    <span className="lb-dot" style={{ background: ch?.color }} />
                    {p.name}
                  </span>
                  <span style={{ color: 'var(--accent)' }}>+{payout} coins</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
