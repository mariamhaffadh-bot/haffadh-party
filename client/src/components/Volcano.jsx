import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════
// STYLIZED VOLCANO — glowing lava pool, cartoon particles
// ═══════════════════════════════════════════════════════

function LavaParticles() {
  const ref = useRef();
  const count = 25;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 2;
      arr[i * 3 + 1] = 8 + Math.random() * 3;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    return arr;
  }, []);

  useFrame(() => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] += 0.03 + Math.random() * 0.015;
      if (pos[i * 3 + 1] > 14) {
        pos[i * 3 + 1] = 8;
        pos[i * 3] = (Math.random() - 0.5) * 2;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 2;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.35} color="#ff5500" transparent opacity={0.8} />
    </points>
  );
}

// Lava seam rings on volcano slopes
function LavaSeams() {
  return (
    <group>
      {[3, 4.5, 6].map((h, i) => (
        <mesh key={i} position={[0, h, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.5 - i * 0.5, 2.8 - i * 0.5, 16]} />
          <meshBasicMaterial color="#ff3300" transparent opacity={0.3 + i * 0.1} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

export function Volcano() {
  const lightRef = useRef();

  useFrame((state) => {
    if (lightRef.current) {
      lightRef.current.intensity = 2.5 + Math.sin(state.clock.elapsedTime * 1.5) * 0.8;
    }
  });

  return (
    <group>
      {/* Crater lava pool */}
      <mesh position={[0, 8.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.5, 12]} />
        <meshBasicMaterial color="#ff4400" transparent opacity={0.9} />
      </mesh>
      {/* Inner glow ring */}
      <mesh position={[0, 8.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.3, 1.6, 12]} />
        <meshBasicMaterial color="#ffaa00" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* Glow light */}
      <pointLight ref={lightRef} position={[0, 9, 0]} color="#ff4400" intensity={2.5} distance={20} decay={2} />
      {/* Secondary warm fill */}
      <pointLight position={[0, 6, 0]} color="#ff6600" intensity={1} distance={12} decay={2} />
      <LavaParticles />
      <LavaSeams />
    </group>
  );
}
