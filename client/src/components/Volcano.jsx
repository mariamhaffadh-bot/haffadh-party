import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Lava glow particles
function LavaParticles() {
  const ref = useRef();
  const count = 30;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = 2 + (Math.random() - 0.5) * 1.5;
      arr[i * 3 + 1] = 6 + Math.random() * 3;
      arr[i * 3 + 2] = -1 + (Math.random() - 0.5) * 1.5;
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] += 0.02 + Math.random() * 0.01;
      // Reset particles that go too high
      if (pos[i * 3 + 1] > 12) {
        pos[i * 3 + 1] = 6;
        pos[i * 3] = 2 + (Math.random() - 0.5) * 1.5;
        pos[i * 3 + 2] = -1 + (Math.random() - 0.5) * 1.5;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.3} color="#ff4500" transparent opacity={0.7} />
    </points>
  );
}

export function Volcano() {
  // Volcano smoke/glow light
  const lightRef = useRef();

  useFrame((state) => {
    if (lightRef.current) {
      lightRef.current.intensity = 2 + Math.sin(state.clock.elapsedTime * 1.5) * 0.5;
    }
  });

  return (
    <group>
      {/* Glow light at volcano top */}
      <pointLight
        ref={lightRef}
        position={[2, 7, -1]}
        color="#ff4500"
        intensity={2}
        distance={15}
        decay={2}
      />
      {/* Lava pool at top */}
      <mesh position={[2, 6.5, -1]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 16]} />
        <meshBasicMaterial color="#ff3300" transparent opacity={0.8} />
      </mesh>
      <LavaParticles />
    </group>
  );
}
