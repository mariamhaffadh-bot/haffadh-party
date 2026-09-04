import React, { useMemo } from 'react';
import * as THREE from 'three';

// Procedural palm tree
function PalmTree({ position, scale = 1, lean = 0 }) {
  return (
    <group position={position} scale={scale}>
      {/* Trunk - curved cylinder segments */}
      <mesh position={[0, 1.2, 0]} rotation={[lean * 0.2, 0, lean * 0.15]} castShadow>
        <cylinderGeometry args={[0.08, 0.15, 2.5, 8]} />
        <meshStandardMaterial color="#8B6914" roughness={0.9} />
      </mesh>
      <mesh position={[lean * 0.3, 2.8, lean * 0.2]} rotation={[lean * 0.1, 0, lean * 0.1]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 1.5, 8]} />
        <meshStandardMaterial color="#9B7924" roughness={0.9} />
      </mesh>

      {/* Fronds (simple cones) */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i / 6) * Math.PI * 2;
        const tilt = 0.6 + Math.random() * 0.3;
        return (
          <mesh
            key={i}
            position={[lean * 0.4 + Math.sin(angle) * 0.3, 3.4, lean * 0.2 + Math.cos(angle) * 0.3]}
            rotation={[Math.cos(angle) * tilt, angle, Math.sin(angle) * tilt]}
            castShadow
          >
            <coneGeometry args={[0.15, 1.8, 4]} />
            <meshStandardMaterial color="#2d7a2d" roughness={0.7} side={THREE.DoubleSide} />
          </mesh>
        );
      })}

      {/* Coconuts */}
      {[0, 1, 2].map((i) => (
        <mesh key={`c${i}`} position={[lean * 0.35 + (i - 1) * 0.12, 3.1, lean * 0.15 + (i % 2) * 0.1]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color="#5D4037" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// Bush/shrub
function Bush({ position, color = '#1a6b1a', scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow>
        <dodecahedronGeometry args={[0.4, 1]} />
        <meshStandardMaterial color={color} roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0.2, -0.1, 0.15]} castShadow>
        <dodecahedronGeometry args={[0.3, 1]} />
        <meshStandardMaterial color={color} roughness={0.8} flatShading />
      </mesh>
    </group>
  );
}

// Rock
function Rock({ position, scale = 1 }) {
  return (
    <mesh position={position} scale={scale} castShadow>
      <dodecahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial color="#555" roughness={0.95} metalness={0.1} flatShading />
    </mesh>
  );
}

export function Vegetation() {
  const items = useMemo(() => {
    const result = [];
    // Palm trees along beach and jungle edges
    const palmPositions = [
      [-12, 0.5, 6], [-10, 0.8, 8], [-8, 0.6, 10], [-14, 0.4, 3],
      [-6, 1.2, 9], [-4, 1.5, 8], [4, 0.8, 10], [6, 0.6, 8],
      [8, 0.5, 6], [10, 0.3, 4], [-8, 1.0, -4], [-6, 1.5, -6],
      [6, 1.0, -4], [8, 0.8, -2], [-10, 0.3, -2], [12, 0.4, 2],
      [-3, 1.8, 6], [0, 1.2, 9], [2, 1.0, 8],
    ];
    palmPositions.forEach((pos, i) => {
      result.push({ type: 'palm', pos, scale: 0.8 + Math.random() * 0.5, lean: (Math.random() - 0.5) * 0.6, key: `p${i}` });
    });

    // Bushes scattered in jungle area
    const bushPositions = [
      [-5, 1.5, 3], [-3, 2.0, 2], [-7, 1.2, 1], [-4, 1.8, -1],
      [-2, 2.2, 4], [0, 1.6, 5], [3, 1.4, 5], [5, 1.0, 3],
      [-6, 1.6, -3], [-3, 2.0, -4], [1, 1.8, -3], [4, 1.2, -1],
    ];
    bushPositions.forEach((pos, i) => {
      result.push({ type: 'bush', pos, scale: 0.6 + Math.random() * 0.6, key: `b${i}` });
    });

    // Rocks on cliffside
    const rockPositions = [
      [5, 2.5, -5], [7, 2.0, -4], [3, 3.0, -6], [6, 2.8, -6],
      [-1, 3.5, -5], [0, 4.0, -4], [1, 3.2, -3],
    ];
    rockPositions.forEach((pos, i) => {
      result.push({ type: 'rock', pos, scale: 0.5 + Math.random() * 0.8, key: `r${i}` });
    });

    return result;
  }, []);

  return (
    <group>
      {items.map((item) => {
        switch (item.type) {
          case 'palm':
            return <PalmTree key={item.key} position={item.pos} scale={item.scale} lean={item.lean} />;
          case 'bush':
            return <Bush key={item.key} position={item.pos} scale={item.scale} />;
          case 'rock':
            return <Rock key={item.key} position={item.pos} scale={item.scale} />;
          default:
            return null;
        }
      })}
    </group>
  );
}
