import React, { useRef, useState, useCallback } from 'react';

// ═══════════════════════════════════════════════════════
// VIRTUAL JOYSTICK — bottom-left thumb zone
// Draggable base + knob, returns normalized {x, y} and
// fires onDirection when pushed past threshold
// ═══════════════════════════════════════════════════════

const RADIUS = 55;
const KNOB_SIZE = 40;
const DEAD_ZONE = 0.3;

export default function VirtualJoystick({ onDirection, disabled }) {
  const baseRef = useRef(null);
  const [active, setActive] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const hasFired = useRef(false);

  const getOffset = useCallback((clientX, clientY) => {
    const dx = clientX - startPos.current.x;
    const dy = clientY - startPos.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clamped = Math.min(dist, RADIUS);
    const angle = Math.atan2(dy, dx);
    return {
      x: Math.cos(angle) * clamped,
      y: Math.sin(angle) * clamped,
      nx: (Math.cos(angle) * clamped) / RADIUS, // -1..1
      ny: (Math.sin(angle) * clamped) / RADIUS,
      dist: clamped / RADIUS,
    };
  }, []);

  const handleStart = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    const touch = e.touches ? e.touches[0] : e;
    startPos.current = { x: touch.clientX, y: touch.clientY };
    setActive(true);
    setKnobPos({ x: 0, y: 0 });
    hasFired.current = false;
  }, [disabled]);

  const handleMove = useCallback((e) => {
    if (!active || disabled) return;
    e.preventDefault();
    const touch = e.touches ? e.touches[0] : e;
    const off = getOffset(touch.clientX, touch.clientY);
    setKnobPos({ x: off.x, y: off.y });

    // Fire direction when pushed past dead zone
    if (off.dist > DEAD_ZONE && !hasFired.current) {
      hasFired.current = true;
      onDirection?.({ x: off.nx, y: off.ny });
    }
  }, [active, disabled, getOffset, onDirection]);

  const handleEnd = useCallback((e) => {
    e.preventDefault();
    setActive(false);
    setKnobPos({ x: 0, y: 0 });
    hasFired.current = false;
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 40,
        left: 30,
        width: RADIUS * 2 + 20,
        height: RADIUS * 2 + 20,
        zIndex: 500,
        touchAction: 'none',
        pointerEvents: disabled ? 'none' : 'auto',
        opacity: disabled ? 0.3 : 1,
      }}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      ref={baseRef}
    >
      {/* Base circle */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: RADIUS * 2,
        height: RADIUS * 2,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.08)',
        border: '2px solid rgba(255,255,255,0.2)',
        backdropFilter: 'blur(4px)',
      }} />
      {/* Knob */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: `translate(calc(-50% + ${knobPos.x}px), calc(-50% + ${knobPos.y}px))`,
        width: KNOB_SIZE,
        height: KNOB_SIZE,
        borderRadius: '50%',
        background: active
          ? 'radial-gradient(circle, rgba(247,183,49,0.9), rgba(247,183,49,0.5))'
          : 'radial-gradient(circle, rgba(255,255,255,0.4), rgba(255,255,255,0.15))',
        border: '2px solid rgba(255,255,255,0.4)',
        boxShadow: active ? '0 0 15px rgba(247,183,49,0.4)' : 'none',
        transition: active ? 'none' : 'transform 0.2s ease-out',
      }} />
    </div>
  );
}
