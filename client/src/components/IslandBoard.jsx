import React from 'react';
import { BoardPath } from './BoardPath';
import { Water } from './Water';
import { Terrain } from './Terrain';
import { Vegetation } from './Vegetation';
import { Volcano } from './Volcano';
import { PlayerTokens } from './PlayerTokens';

export default function IslandBoard({ gameState }) {
  return (
    <group>
      <Water />
      <Terrain />
      <Volcano />
      <Vegetation />
      <BoardPath nodes={gameState?.boardNodes} />
      <PlayerTokens gameState={gameState} />
    </group>
  );
}
