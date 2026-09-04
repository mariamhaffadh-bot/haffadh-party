import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getSpacePositions } from './BoardPath';
import { getCharacter } from '../utils/characters';

function PlayerToken({ player, targetPosition, index }) {
  const meshRef = useRef();
  const character = getCharacter(player.characterId);
  const color = character?.color || '#ffffff';
  const [currentPos] = useState(() => new THREE.Vector3(...targetPosition));
  const targetVec = useMemo(() => new THREE.Vector3(...targetPosition), [targetPosition]);

  // Smooth movement
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    currentPos.lerp(targetVec, 3 * delta);

    // Hop animation during movement
    const dist = currentPos.distanceTo(targetVec);
    const hop = dist > 0.1 ? Math.abs(Math.sin(state.clock.elapsedTime * 8)) * 0.5 : 0;

    meshRef.current.position.set(currentPos.x + index * 0.4, currentPos.y + 0.5 + hop, currentPos.z);

    // Idle bobbing
    meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 2 + index) * 0.05;

    // Gentle rotation
    meshRef.current.rotation.y += delta * 0.5;
  });

  return (
    <group ref={meshRef}>
      {/* Body capsule */}
      <mesh castShadow>
        <capsuleGeometry args={[0.2, 0.3, 8, 12]} />
        <meshStandardMaterial
          color={color}
          roughness={0.3}
          metalness={0.2}
          emissive={color}
          emissiveIntensity={0.15}
        />
      </mesh>
      {/* Eyes */}
      <mesh position={[0.08, 0.15, 0.18]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color="white" />
      </mesh>
      <mesh position={[-0.08, 0.15, 0.18]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color="white" />
      </mesh>
      {/* Pupils */}
      <mesh position={[0.08, 0.15, 0.22]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshBasicMaterial color="#111" />
      </mesh>
      <mesh position={[-0.08, 0.15, 0.22]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshBasicMaterial color="#111" />
      </mesh>
      {/* Name label glow */}
      <pointLight position={[0, 0.6, 0]} color={color} intensity={0.5} distance={2} />
    </group>
  );
}

export function PlayerTokens({ gameState }) {
  const players = gameState?.players || {};
  const boardSpaces = gameState?.boardSpaces || [];
  const positions = useMemo(() => getSpacePositions(boardSpaces.length || 35), [boardSpaces.length]);

  const playerList = Object.values(players);

  return (
    <group>
      {playerList.map((player, i) => {
        const pos = positions[player.position] || positions[0] || [0, 1, 0];
        return (
          <PlayerToken
            key={player.id}
            player={player}
            targetPosition={pos}
            index={i}
          />
        );
      })}
    </group>
  );
}
