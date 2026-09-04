import React, { useState, useEffect, useRef, useCallback } from 'react';

// ═══════════════════════════════════════════════════════
// MINIGAME PHONE CONTROLLERS
// Each minigame is a self-contained plugin:
// { id, name, controllerComponent, resolveWinner(state) }
// ═══════════════════════════════════════════════════════

function TapRaceController({ send, clientId }) {
  const [taps, setTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [active, setActive] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setActive(false);
          clearInterval(interval);
          send({ type: 'minigame_input', input: { type: 'tap_race', taps, final: true } });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (active) {
      send({ type: 'minigame_input', input: { type: 'tap_race', taps } });
    }
  }, [taps]);

  const handleTap = () => {
    if (!active) return;
    setTaps((t) => t + 1);
  };

  return (
    <div className="minigame-phone">
      <h2 style={{ color: 'var(--accent)' }}>Coconut Tap Dash!</h2>
      <p className="timer-display">{timeLeft}s</p>
      <div className="tap-area" onClick={handleTap} onTouchStart={(e) => { e.preventDefault(); handleTap(); }}>
        {taps}
      </div>
      {!active && <p style={{ color: 'var(--success)' }}>Time's up! {taps} taps</p>}
    </div>
  );
}

function BalanceController({ send, clientId }) {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [alive, setAlive] = useState(true);
  const [timeLeft, setTimeLeft] = useState(15);
  const driftRef = useRef({ dx: (Math.random() - 0.5) * 2, dy: (Math.random() - 0.5) * 2 });

  useEffect(() => {
    if (!alive) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          send({ type: 'minigame_input', input: { type: 'balance', survived: true, final: true } });
          return 0;
        }
        return t - 1;
      });

      setPosition((p) => {
        const drift = driftRef.current;
        let nx = p.x + drift.dx;
        let ny = p.y + drift.dy;

        // Increase drift over time
        drift.dx += (Math.random() - 0.5) * 0.3;
        drift.dy += (Math.random() - 0.5) * 0.3;
        drift.dx = Math.max(-4, Math.min(4, drift.dx));
        drift.dy = Math.max(-4, Math.min(4, drift.dy));

        // Check if out of bounds
        const dist = Math.sqrt((nx - 50) ** 2 + (ny - 50) ** 2);
        if (dist > 45) {
          setAlive(false);
          send({ type: 'minigame_input', input: { type: 'balance', survived: false, final: true } });
        }

        return { x: nx, y: ny };
      });
    }, 100);
    return () => clearInterval(interval);
  }, [alive]);

  const handleTilt = useCallback((e) => {
    if (!alive) return;
    const touch = e.touches?.[0] || e;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;

    // Push position toward touch
    setPosition((p) => ({
      x: p.x + (50 - (x - 50) * 0.1 - p.x) * 0.3,
      y: p.y + (50 - (y - 50) * 0.1 - p.y) * 0.3,
    }));
    driftRef.current = { dx: driftRef.current.dx * 0.5, dy: driftRef.current.dy * 0.5 };
  }, [alive]);

  return (
    <div className="minigame-phone">
      <h2 style={{ color: 'var(--accent)' }}>Tightrope Tilt!</h2>
      <p className="timer-display">{timeLeft}s</p>
      <div
        className="balance-zone"
        onTouchMove={handleTilt}
        onMouseMove={handleTilt}
      >
        <div
          className="balance-dot"
          style={{
            transform: `translate(${position.x - 50}px, ${position.y - 50}px)`,
            background: alive ? 'var(--accent)' : 'var(--danger)',
          }}
        />
      </div>
      {!alive && <p style={{ color: 'var(--danger)' }}>You fell off!</p>}
    </div>
  );
}

function MemoryController({ send, clientId }) {
  const [timeLeft, setTimeLeft] = useState(30);
  const [pairs, setPairs] = useState(0);
  const symbols = ['🐚', '🥥', '🌺', '🦀', '🌴', '🐠', '🦜', '🔥'];

  const [tiles] = useState(() => {
    const deck = [...symbols, ...symbols];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck.map((symbol, i) => ({ id: i, symbol, flipped: false, matched: false }));
  });

  const [flipped, setFlipped] = useState([]);
  const [board, setBoard] = useState(tiles);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          send({ type: 'minigame_input', input: { type: 'memory', pairs, final: true } });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleFlip = (index) => {
    if (board[index].flipped || board[index].matched || flipped.length >= 2) return;

    const newBoard = [...board];
    newBoard[index] = { ...newBoard[index], flipped: true };
    setBoard(newBoard);

    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      const [a, b] = newFlipped;
      if (newBoard[a].symbol === newBoard[b].symbol) {
        setTimeout(() => {
          const updated = [...newBoard];
          updated[a] = { ...updated[a], matched: true };
          updated[b] = { ...updated[b], matched: true };
          setBoard(updated);
          setPairs((p) => {
            const newPairs = p + 1;
            send({ type: 'minigame_input', input: { type: 'memory', pairs: newPairs } });
            return newPairs;
          });
          setFlipped([]);
        }, 300);
      } else {
        setTimeout(() => {
          const updated = [...newBoard];
          updated[a] = { ...updated[a], flipped: false };
          updated[b] = { ...updated[b], flipped: false };
          setBoard(updated);
          setFlipped([]);
        }, 800);
      }
    }
  };

  return (
    <div className="minigame-phone">
      <h2 style={{ color: 'var(--accent)' }}>Shell Memory!</h2>
      <p className="timer-display">{timeLeft}s — Pairs: {pairs}</p>
      <div className="memory-grid">
        {board.map((tile, i) => (
          <div
            key={tile.id}
            className={`memory-tile ${tile.flipped ? 'flipped' : ''} ${tile.matched ? 'matched' : ''}`}
            onClick={() => handleFlip(i)}
          >
            {(tile.flipped || tile.matched) ? tile.symbol : '?'}
          </div>
        ))}
      </div>
    </div>
  );
}

function TugOfWarController({ send, clientId }) {
  const [power, setPower] = useState(50);
  const [timeLeft, setTimeLeft] = useState(8);
  const [mashes, setMashes] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          send({ type: 'minigame_input', input: { type: 'tug_of_war', mashes, final: true } });
          return 0;
        }
        return t - 1;
      });
      // Power decays
      setPower((p) => Math.max(0, p - 2));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMash = () => {
    setMashes((m) => m + 1);
    setPower((p) => Math.min(100, p + 5));
    send({ type: 'minigame_input', input: { type: 'tug_of_war', mashes: mashes + 1 } });
  };

  return (
    <div className="minigame-phone">
      <h2 style={{ color: 'var(--accent)' }}>Vine Tug!</h2>
      <p className="timer-display">{timeLeft}s</p>
      <div className="mash-bar-container">
        <div className="mash-bar" style={{ width: `${power}%` }} />
      </div>
      <div
        className="tap-area"
        onClick={handleMash}
        onTouchStart={(e) => { e.preventDefault(); handleMash(); }}
        style={{ background: 'linear-gradient(135deg, #2ecc71, #27ae60)' }}
      >
        MASH!
      </div>
      <p style={{ color: 'var(--text-dim)' }}>{mashes} presses</p>
    </div>
  );
}

function ReactionController({ send, clientId }) {
  const [phase, setPhase] = useState('waiting'); // waiting, ready, go, done
  const [reactionTime, setReactionTime] = useState(null);
  const goTimeRef = useRef(null);

  useEffect(() => {
    // Random delay before showing "TAP!"
    const delay = 2000 + Math.random() * 3000;
    const timer = setTimeout(() => {
      setPhase('go');
      goTimeRef.current = performance.now();
    }, delay);

    setTimeout(() => setPhase('ready'), 500);

    return () => clearTimeout(timer);
  }, []);

  const handleTap = () => {
    if (phase === 'go') {
      const rt = performance.now() - goTimeRef.current;
      setReactionTime(rt);
      setPhase('done');
      send({ type: 'minigame_input', input: { type: 'reaction', reactionTime: rt, final: true } });
    } else if (phase === 'ready') {
      // Too early!
      setPhase('done');
      setReactionTime(9999);
      send({ type: 'minigame_input', input: { type: 'reaction', reactionTime: 9999, final: true } });
    }
  };

  const bgColor = phase === 'go' ? '#2ecc71' : phase === 'ready' ? '#e74c3c' : '#333';

  return (
    <div className="minigame-phone">
      <h2 style={{ color: 'var(--accent)' }}>Firefly Catch!</h2>
      <div
        className="tap-area"
        onClick={handleTap}
        onTouchStart={(e) => { e.preventDefault(); handleTap(); }}
        style={{ background: bgColor, width: 250, height: 250 }}
      >
        {phase === 'waiting' && 'Wait...'}
        {phase === 'ready' && 'Wait...'}
        {phase === 'go' && 'TAP!'}
        {phase === 'done' && (reactionTime < 9999 ? `${Math.round(reactionTime)}ms` : 'Too early!')}
      </div>
    </div>
  );
}

// Minigame registry
const MINIGAME_CONTROLLERS = {
  tap_race: TapRaceController,
  balance: BalanceController,
  memory: MemoryController,
  tug_of_war: TugOfWarController,
  reaction: ReactionController,
};

export default function MinigamePhone({ gameState, clientId, send }) {
  // Pick a random minigame type for now
  const [gameType] = useState(() => {
    const types = Object.keys(MINIGAME_CONTROLLERS);
    return types[Math.floor(Math.random() * types.length)];
  });

  const Controller = MINIGAME_CONTROLLERS[gameType];

  if (!Controller) {
    return (
      <div className="minigame-phone">
        <p>Unknown minigame type</p>
      </div>
    );
  }

  return <Controller send={send} clientId={clientId} gameState={gameState} />;
}

export { MINIGAME_CONTROLLERS };
