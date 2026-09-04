import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getNodePosition } from './BoardPath';
import { getCharacter } from '../utils/characters';

function PlayerToken({ player, targetPosition, index }) {
  const meshRef = useRef();
  const character = getCharacter(player.characterId);
  const color = character?.color || '#ffffff';
  const [currentPos] = useState(() => new THREE.Vector3(...targetPosition));
  const targetVec = useMemo(() => new THREE.Vector3(...targetPosition), [targetPosition]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    currentPos.lerp(targetVec, 3 * delta);
    const dist = currentPos.distanceTo(targetVec);
    const hop = dist > 0.1 ? Math.abs(Math.sin(state.clock.elapsedTime * 8)) * 0.5 : 0;

    // Offset tokens so they don't overlap
    const offsetAngle = (index / 8) * Math.PI * 2;
    const offsetR = 0.35;
    meshRef.current.position.set(
      currentPos.x + Math.cos(offsetAngle) * offsetR,
      currentPos.y + 0.5 + hop + Math.sin(state.clock.elapsedTime * 2 + index) * 0.04,
      currentPos.z + Math.sin(offsetAngle) * offsetR
    );
    meshRef.current.rotation.y += delta * 0.5;
  });

  return (
    <group ref={meshRef}>
      {/* Body — stylized capsule */}
      <mesh castShadow>
        <capsuleGeometry args={[0.18, 0.28, 4, 8]} />
        <meshStandardMaterial
          color={color}
          roughness={0.5}
          metalness={0.0}
          flatShading
        />
      </mesh>
      {/* Eyes */}
      <mesh position={[0.07, 0.14, 0.16]}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <meshBasicMaterial color="white" />
      </mesh>
      <mesh position={[-0.07, 0.14, 0.16]}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <meshBasicMaterial color="white" />
      </mesh>
      <mesh position={[0.07, 0.14, 0.2]}>
        <sphereGeometry args={[0.025, 6, 6]} />
        <meshBasicMaterial color="#111" />
      </mesh>
      <mesh position={[-0.07, 0.14, 0.2]}>
        <sphereGeometry args={[0.025, 6, 6]} />
        <meshBasicMaterial color="#111" />
      </mesh>
      {/* Outline ring at feet */}
      <mesh position={[0, -0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.18, 0.24, 12]} />
        <meshBasicMaterial color="#111" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function PlayerTokens({ gameState }) {
  const players = gameState?.players || {};
  const nodes = gameState?.boardNodes || [];
  const playerList = Object.values(players);

  return (
    <group>
      {playerList.map((player, i) => {
        const pos = getNodePosition(nodes, player.nodeId);
        return (
          <PlayerToken key={player.id} player={player} targetPosition={pos} index={i} />
        );
      })}
    </group>
  );
}
