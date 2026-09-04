import React, { useMemo } from 'react';
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════
// STYLIZED VEGETATION — bold flat-shaded cartoon trees
// ═══════════════════════════════════════════════════════

function PalmTree({ position, scale = 1, lean = 0 }) {
  return (
    <group position={position} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 1.2, 0]} rotation={[lean * 0.2, 0, lean * 0.15]} castShadow>
        <cylinderGeometry args={[0.08, 0.16, 2.5, 5]} />
        <meshStandardMaterial color="#b8860b" roughness={1} metalness={0} flatShading />
      </mesh>
      <mesh position={[lean * 0.3, 2.8, lean * 0.2]} rotation={[lean * 0.1, 0, lean * 0.1]} castShadow>
        <cylinderGeometry args={[0.05, 0.08, 1.5, 5]} />
        <meshStandardMaterial color="#c99a2e" roughness={1} metalness={0} flatShading />
      </mesh>
      {/* Fronds — bright green cones */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i / 6) * Math.PI * 2;
        const tilt = 0.5 + Math.random() * 0.4;
        return (
          <mesh
            key={i}
            position={[lean * 0.4 + Math.sin(angle) * 0.25, 3.3, lean * 0.2 + Math.cos(angle) * 0.25]}
            rotation={[Math.cos(angle) * tilt, angle, Math.sin(angle) * tilt]}
            castShadow
          >
            <coneGeometry args={[0.15, 1.6, 3]} />
            <meshStandardMaterial color="#33aa44" roughness={1} metalness={0} flatShading side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
}

function Bush({ position, color = '#228833', scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow>
        <dodecahedronGeometry args={[0.45, 0]} />
        <meshStandardMaterial color={color} roughness={1} metalness={0} flatShading />
      </mesh>
      <mesh position={[0.25, -0.05, 0.15]} castShadow>
        <dodecahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color={color} roughness={1} metalness={0} flatShading />
      </mesh>
    </group>
  );
}

function Rock({ position, scale = 1, color = '#777' }) {
  return (
    <mesh position={position} scale={scale} castShadow>
      <dodecahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial color={color} roughness={1} metalness={0} flatShading />
    </mesh>
  );
}

export function Vegetation() {
  const items = useMemo(() => {
    const result = [];
    // Beach palms
    const palms = [
      [-13, 0.5, 5], [-11, 0.7, 8], [-8, 0.5, 10], [5, 0.6, 10],
      [8, 0.5, 7], [10, 0.4, 4], [12, 0.3, 1], [-14, 0.3, 2],
      [-5, 0.8, 11], [0, 0.6, 12], [3, 0.7, 11], [7, 0.5, 9],
      [-10, 0.4, -1], [10, 0.3, -2], [-8, 0.8, 5], [6, 0.5, 5],
    ];
    palms.forEach((pos, i) => {
      result.push({ type: 'palm', pos, scale: 0.7 + Math.random() * 0.5, lean: (Math.random() - 0.5) * 0.5, key: `p${i}` });
    });

    // Jungle bushes
    const bushes = [
      [-6, 1.5, 4], [-4, 1.8, 2], [-7, 1.3, 1], [-5, 2.0, -1],
      [-3, 2.2, 4], [0, 1.8, 6], [3, 1.5, 5], [5, 1.2, 3],
      [-7, 1.6, -3], [-4, 2.0, -5], [1, 1.8, -2], [4, 1.3, -1],
      [-8, 1.4, 3], [-2, 1.6, 1], [2, 1.5, 3],
    ];
    bushes.forEach((pos, i) => {
      result.push({ type: 'bush', pos, scale: 0.5 + Math.random() * 0.5, key: `b${i}` });
    });

    // Cliffside rocks
    const rocks = [
      [5, 3.0, -6], [7, 2.5, -5], [3, 3.5, -7], [6, 3.2, -7],
      [-1, 4.0, -6], [0, 4.5, -5], [1, 3.8, -4], [-3, 3.5, -8],
    ];
    rocks.forEach((pos, i) => {
      result.push({ type: 'rock', pos, scale: 0.4 + Math.random() * 0.6, key: `r${i}` });
    });

    return result;
  }, []);

  return (
    <group>
      {items.map((item) => {
        switch (item.type) {
          case 'palm': return <PalmTree key={item.key} position={item.pos} scale={item.scale} lean={item.lean} />;
          case 'bush': return <Bush key={item.key} position={item.pos} scale={item.scale} />;
          case 'rock': return <Rock key={item.key} position={item.pos} scale={item.scale} />;
          default: return null;
        }
      })}
    </group>
  );
}
