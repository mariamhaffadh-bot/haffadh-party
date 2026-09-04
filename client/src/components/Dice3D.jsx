import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Simple 3D die with tumble animation
export function Dice3D({ value, rolling, onRollComplete }) {
  const meshRef = useRef();
  const [tumblePhase, setTumblePhase] = useState(0);
  const startTime = useRef(0);

  useEffect(() => {
    if (rolling) {
      startTime.current = performance.now();
      setTumblePhase(1);
    }
  }, [rolling]);

  useFrame((state) => {
    if (!meshRef.current) return;

    if (tumblePhase === 1) {
      const elapsed = (performance.now() - startTime.current) / 1000;
      const duration = 1.2;

      if (elapsed < duration) {
        // Tumbling: spin fast then decelerate
        const progress = elapsed / duration;
        const speed = (1 - progress * progress) * 15;
        meshRef.current.rotation.x += speed * 0.016;
        meshRef.current.rotation.z += speed * 0.012;
        meshRef.current.position.y = 2 + Math.sin(progress * Math.PI) * 2;
      } else {
        // Settle to show the value
        setTumblePhase(2);
        if (onRollComplete) onRollComplete();
      }
    } else if (tumblePhase === 2) {
      // Settle animation
      const targetRotation = getDiceRotation(value);
      meshRef.current.rotation.x += (targetRotation.x - meshRef.current.rotation.x) * 0.1;
      meshRef.current.rotation.z += (targetRotation.z - meshRef.current.rotation.z) * 0.1;
      meshRef.current.position.y += (1.5 - meshRef.current.position.y) * 0.1;
    } else {
      // Idle gentle float
      meshRef.current.position.y = 1.5 + Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
      meshRef.current.rotation.y += 0.005;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 1.5, 0]} castShadow>
      <boxGeometry args={[0.8, 0.8, 0.8]} />
      <meshStandardMaterial
        color="#f5f5f0"
        roughness={0.3}
        metalness={0.1}
      />
      {/* Dot faces as children - simplified with basic markers */}
      <DiceDots value={value || 1} />
    </mesh>
  );
}

function getDiceRotation(value) {
  const rotations = {
    1: { x: 0, z: 0 },
    2: { x: Math.PI / 2, z: 0 },
    3: { x: 0, z: -Math.PI / 2 },
    4: { x: 0, z: Math.PI / 2 },
    5: { x: -Math.PI / 2, z: 0 },
    6: { x: Math.PI, z: 0 },
  };
  return rotations[value] || rotations[1];
}

function DiceDots({ value }) {
  // Simple colored circles on dice faces
  const dotMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: '#222' }), []);
  const dotGeo = useMemo(() => new THREE.CircleGeometry(0.08, 12), []);

  const faces = {
    1: [[0, 0]],
    2: [[-0.2, -0.2], [0.2, 0.2]],
    3: [[-0.2, -0.2], [0, 0], [0.2, 0.2]],
    4: [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]],
    5: [[-0.2, -0.2], [0.2, -0.2], [0, 0], [-0.2, 0.2], [0.2, 0.2]],
    6: [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0], [0.2, 0], [-0.2, 0.2], [0.2, 0.2]],
  };

  // Only render dots for face 1 (front face) — the rotation handles showing the right value
  const dots = faces[value] || faces[1];
  return (
    <group>
      {dots.map((pos, i) => (
        <mesh key={i} position={[pos[0], pos[1], 0.41]} geometry={dotGeo} material={dotMaterial} />
      ))}
    </group>
  );
}
