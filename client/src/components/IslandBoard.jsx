import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BoardPath } from './BoardPath';
import { Water } from './Water';
import { Terrain } from './Terrain';
import { Vegetation } from './Vegetation';
import { Volcano } from './Volcano';
import { PlayerTokens } from './PlayerTokens';

export default function IslandBoard({ gameState }) {
  const groupRef = useRef();

  return (
    <group ref={groupRef}>
      {/* Ocean water plane */}
      <Water />

      {/* Island terrain */}
      <Terrain />

      {/* Volcano */}
      <Volcano />

      {/* Vegetation (palms, bushes, jungle) */}
      <Vegetation />

      {/* Board path with space markers */}
      <BoardPath spaces={gameState?.boardSpaces} />

      {/* Player tokens */}
      <PlayerTokens gameState={gameState} />
    </group>
  );
}
