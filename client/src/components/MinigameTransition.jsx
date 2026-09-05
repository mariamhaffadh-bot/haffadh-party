import React, { useState, useEffect } from 'react';
import { getCharacter } from '../utils/characters';

// ═══════════════════════════════════════════════════════
// MINIGAME TRANSITION — reusable in/out sequence
// "Volcano Vortex" — the game's signature visual sting
//
// IN:  Camera zooms into the volcano crater → swirling
//      lava portal fills screen → minigame name card
// OUT: Results animate in → portal reverses → back to board
// ═══════════════════════════════════════════════════════

export function MinigameTransitionIn({ minigame, onComplete }) {
  const [phase, setPhase] = useState('vortex'); // vortex, card, done
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Vortex phase: 1.2s
    const vortexTimer = setTimeout(() => setPhase('card'), 1200);
    // Card phase: 2.5s
    const cardTimer = setTimeout(() => {
      setPhase('done');
      onComplete?.();
    }, 3700);

    // Animate progress
    const startTime = Date.now();
    const raf = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 3700;
      setProgress(Math.min(1, elapsed));
    }, 16);

    return () => {
      clearTimeout(vortexTimer);
      clearTimeout(cardTimer);
      clearInterval(raf);
    };
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      {/* Vortex overlay — expanding circle wipe from center */}
      {phase === 'vortex' && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle at 50% 50%,
            rgba(255,68,0,0.95) ${progress * 120}%,
            rgba(255,170,0,0.8) ${progress * 140}%,
            transparent ${progress * 160}%
          )`,
        }}>
          {/* Spinning ring elements */}
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              position: 'absolute', top: '50%', left: '50%',
              width: 200 + i * 80, height: 200 + i * 80,
              border: `3px solid rgba(255,${180 - i * 40},0,${0.6 - i * 0.15})`,
              borderRadius: '50%',
              transform: `translate(-50%, -50%) rotate(${progress * (360 + i * 120)}deg) scale(${progress * 2})`,
              transition: 'none',
            }} />
          ))}
        </div>
      )}

      {/* Minigame name card */}
      {phase === 'card' && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, #1a0a2e, #0a0a1a)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
          animation: 'fadeIn 0.4s ease',
        }}>
          {/* Decorative volcano icon */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'radial-gradient(circle, #ff4400 30%, #ff6600 60%, #993300)',
            boxShadow: '0 0 40px rgba(255,68,0,0.5), 0 0 80px rgba(255,68,0,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.5rem',
          }}>
            🌋
          </div>
          <h1 style={{
            color: '#ffaa00', fontSize: 'clamp(1.8rem, 5vw, 3rem)',
            textShadow: '0 0 30px rgba(255,170,0,0.5)',
            textAlign: 'center', padding: '0 20px',
          }}>
            {minigame?.name || 'Minigame!'}
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.7)', fontSize: 'clamp(0.85rem, 2.5vw, 1.1rem)',
            textAlign: 'center', maxWidth: 400, padding: '0 20px',
          }}>
            {minigame?.description || ''}
          </p>
          {/* Animated underline */}
          <div style={{
            width: 120, height: 3,
            background: 'linear-gradient(90deg, transparent, #ff6600, transparent)',
            borderRadius: 2,
            animation: 'pulseWidth 1s ease infinite',
          }} />
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(1.1); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pulseWidth {
          0%, 100% { width: 120px; opacity: 0.5; }
          50% { width: 180px; opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export function MinigameTransitionOut({ rankings, players, onComplete }) {
  const [phase, setPhase] = useState('results'); // results, vortex_out, done

  useEffect(() => {
    const resultTimer = setTimeout(() => setPhase('vortex_out'), 3500);
    const doneTimer = setTimeout(() => {
      setPhase('done');
      onComplete?.();
    }, 4500);
    return () => { clearTimeout(resultTimer); clearTimeout(doneTimer); };
  }, []);

  const payouts = [10, 6, 3, 1];
  const sortedPlayers = (rankings || []).map((r) => {
    const p = players?.[r.playerId] || {};
    const ch = getCharacter(p.characterId);
    return { ...r, ...p, color: ch?.color || '#fff' };
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: phase === 'vortex_out'
        ? 'radial-gradient(circle, transparent 0%, rgba(10,10,26,0.95) 60%)'
        : 'linear-gradient(135deg, #1a0a2e, #0a0a1a)',
    }}>
      {phase === 'results' && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          animation: 'fadeIn 0.4s ease',
        }}>
          <h2 style={{ color: 'var(--accent)', fontSize: '1.5rem', marginBottom: 8 }}>Results!</h2>
          {sortedPlayers.map((p, i) => (
            <div key={p.playerId} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              width: 280, padding: '10px 16px',
              background: i === 0 ? 'rgba(255,170,0,0.15)' : 'rgba(255,255,255,0.05)',
              border: i === 0 ? '2px solid #ffaa00' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              animation: `slideInLeft ${0.3 + i * 0.15}s ease`,
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, width: 24 }}>{i + 1}.</span>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color }} />
                <span>{p.name}</span>
              </span>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>+{payouts[i] || 0}c</span>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

// Wrapper that manages the full in → play → out sequence
export default function MinigameTransition({ minigame, phase, rankings, players, children, onTransitionComplete }) {
  const [transitionState, setTransitionState] = useState('in'); // in, playing, out, done

  useEffect(() => {
    if (phase === 'playing' && transitionState === 'in') {
      // Already handled by onComplete from TransitionIn
    }
    if (phase === 'results') {
      setTransitionState('out');
    }
  }, [phase]);

  if (transitionState === 'in') {
    return (
      <MinigameTransitionIn
        minigame={minigame}
        onComplete={() => setTransitionState('playing')}
      />
    );
  }

  if (transitionState === 'out') {
    return (
      <MinigameTransitionOut
        rankings={rankings}
        players={players}
        onComplete={() => {
          setTransitionState('done');
          onTransitionComplete?.();
        }}
      />
    );
  }

  // Playing — render children (the actual minigame)
  return <>{children}</>;
}
