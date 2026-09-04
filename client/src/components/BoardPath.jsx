import React, { useMemo } from 'react';
import * as THREE from 'three';
import { terrainHeight } from './Terrain';

// Space type colors and geometry
const SPACE_STYLES = {
  start:     { color: '#ffffff', emissive: '#444444', shape: 'star' },
  coin_gain: { color: '#f7b731', emissive: '#8B6914', shape: 'cylinder' },
  coin_loss: { color: '#e74c3c', emissive: '#922B21', shape: 'cylinder' },
  event:     { color: '#9b59b6', emissive: '#6C3483', shape: 'octahedron' },
  landmark:  { color: '#ffd700', emissive: '#B8860B', shape: 'totem' },
  duel:      { color: '#e67e22', emissive: '#D35400', shape: 'box' },
  minigame:  { color: '#3498db', emissive: '#1A5276', shape: 'sphere' },
  branch:    { color: '#2ecc71', emissive: '#196F3D', shape: 'diamond' },
};

// Define the path the spaces follow around the island
// This creates a winding path: beach → tidal → jungle → cliffside → volcano → lagoon
function getSpacePositions(count) {
  const positions = [];

  for (let i = 0; i < count; i++) {
    const t = i / count;
    const angle = t * Math.PI * 2 - Math.PI * 0.3;
    // Vary radius to create interesting path
    let radius;
    if (t < 0.15) radius = 14; // Beach
    else if (t < 0.28) radius = 12; // Tidal
    else if (t < 0.45) radius = 8 + Math.sin(t * 10) * 2; // Jungle (wavy)
    else if (t < 0.6) radius = 6; // Cliffside
    else if (t < 0.75) radius = 4 + t * 3; // Volcano area
    else radius = 10 + (1 - t) * 6; // Lagoon back to beach

    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = terrainHeight(x, z) + 0.4;

    positions.push([x, Math.max(y, 0.3), z]);
  }

  return positions;
}

function SpaceMarker({ position, type, index, name }) {
  const style = SPACE_STYLES[type] || SPACE_STYLES.start;

  let geometry;
  switch (style.shape) {
    case 'star':
      geometry = <cylinderGeometry args={[0.4, 0.4, 0.15, 6]} />;
      break;
    case 'cylinder':
      geometry = <cylinderGeometry args={[0.3, 0.3, 0.2, 12]} />;
      break;
    case 'octahedron':
      geometry = <octahedronGeometry args={[0.3, 0]} />;
      break;
    case 'totem':
      geometry = <cylinderGeometry args={[0.2, 0.35, 0.5, 6]} />;
      break;
    case 'box':
      geometry = <boxGeometry args={[0.35, 0.2, 0.35]} />;
      break;
    case 'sphere':
      geometry = <sphereGeometry args={[0.3, 12, 12]} />;
      break;
    case 'diamond':
      geometry = <octahedronGeometry args={[0.3, 0]} />;
      break;
    default:
      geometry = <cylinderGeometry args={[0.3, 0.3, 0.15, 8]} />;
  }

  return (
    <group position={position}>
      {/* Base platform */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <cylinderGeometry args={[0.45, 0.5, 0.1, 16]} />
        <meshStandardMaterial color="#333" roughness={0.8} metalness={0.2} />
      </mesh>
      {/* Space marker */}
      <mesh position={[0, 0.15, 0]} castShadow>
        {geometry}
        <meshStandardMaterial
          color={style.color}
          emissive={style.emissive}
          emissiveIntensity={0.3}
          roughness={0.4}
          metalness={0.3}
        />
      </mesh>
    </group>
  );
}

// Path line connecting spaces
function PathLine({ positions }) {
  const points = useMemo(() => {
    return positions.map((p) => new THREE.Vector3(p[0], p[1] - 0.1, p[2]));
  }, [positions]);

  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3(points, true);
  }, [points]);

  const tubeGeo = useMemo(() => {
    return new THREE.TubeGeometry(curve, 200, 0.08, 8, true);
  }, [curve]);

  return (
    <mesh geometry={tubeGeo}>
      <meshStandardMaterial color="#d4a574" roughness={0.9} metalness={0.1} />
    </mesh>
  );
}

export function BoardPath({ spaces }) {
  const spaceList = spaces || [];
  const positions = useMemo(() => getSpacePositions(spaceList.length || 35), [spaceList.length]);

  return (
    <group>
      <PathLine positions={positions} />
      {positions.map((pos, i) => {
        const space = spaceList[i] || { type: 'start', name: `Space ${i}` };
        return (
          <SpaceMarker
            key={i}
            position={pos}
            type={space.type}
            index={i}
            name={space.name}
          />
        );
      })}
    </group>
  );
}

export { getSpacePositions };
