import React, { useMemo } from 'react';
import * as THREE from 'three';
import { terrainHeight } from './Terrain';

// ─── Space type visual styles ───
const SPACE_STYLES = {
  start:       { color: '#ffffff', emissive: '#444444', shape: 'star' },
  coin_gain:   { color: '#f7b731', emissive: '#8B6914', shape: 'cylinder' },
  coin_loss:   { color: '#e74c3c', emissive: '#922B21', shape: 'cylinder' },
  event:       { color: '#9b59b6', emissive: '#6C3483', shape: 'octahedron' },
  idol_shrine: { color: '#ffd700', emissive: '#ff8c00', shape: 'totem' },
  item_shop:   { color: '#2ecc71', emissive: '#196F3D', shape: 'box' },
  duel:        { color: '#e67e22', emissive: '#D35400', shape: 'pyramid' },
  branch:      { color: '#3498db', emissive: '#1A5276', shape: 'diamond' },
};

// ─── Spiral path from beach up the volcano to the summit ───
// Starts at outer radius (beach), spirals inward and upward to the peak
function getSpacePositions(count) {
  const positions = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1); // 0..1

    // Spiral: starts far out, comes inward toward the volcano center
    // 2.5 full rotations around the volcano
    const angle = t * Math.PI * 5 - Math.PI * 0.6;
    const radius = 16 - t * 14; // 16 (beach) → 2 (summit)

    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    // Height follows terrain but with a path-specific uplift
    const baseHeight = terrainHeight(x, z);
    const pathHeight = Math.max(baseHeight + 0.3, t * 8.5 + 0.3);

    positions.push([x, pathHeight, z]);
  }
  return positions;
}

function SpaceMarker({ position, type, index, name }) {
  const style = SPACE_STYLES[type] || SPACE_STYLES.start;
  const isShrine = type === 'idol_shrine';

  let geometry;
  switch (style.shape) {
    case 'star':
      geometry = <cylinderGeometry args={[0.45, 0.45, 0.15, 6]} />;
      break;
    case 'cylinder':
      geometry = <cylinderGeometry args={[0.3, 0.3, 0.2, 12]} />;
      break;
    case 'octahedron':
      geometry = <octahedronGeometry args={[0.3, 0]} />;
      break;
    case 'totem':
      geometry = <cylinderGeometry args={[0.15, 0.35, 0.7, 6]} />;
      break;
    case 'box':
      geometry = <boxGeometry args={[0.35, 0.25, 0.35]} />;
      break;
    case 'pyramid':
      geometry = <coneGeometry args={[0.3, 0.4, 4]} />;
      break;
    case 'diamond':
      geometry = <octahedronGeometry args={[0.3, 0]} />;
      break;
    default:
      geometry = <cylinderGeometry args={[0.3, 0.3, 0.15, 8]} />;
  }

  return (
    <group position={position}>
      {/* Base disc */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <cylinderGeometry args={[0.5, 0.55, 0.1, 16]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.8} metalness={0.2} />
      </mesh>
      {/* Marker */}
      <mesh position={[0, isShrine ? 0.25 : 0.15, 0]} castShadow>
        {geometry}
        <meshStandardMaterial
          color={style.color}
          emissive={style.emissive}
          emissiveIntensity={isShrine ? 0.6 : 0.3}
          roughness={0.4}
          metalness={isShrine ? 0.5 : 0.3}
        />
      </mesh>
      {/* Shrine glow */}
      {isShrine && (
        <pointLight
          position={[0, 0.6, 0]}
          color="#ffd700"
          intensity={1.5}
          distance={3}
          decay={2}
        />
      )}
    </group>
  );
}

function PathLine({ positions }) {
  const points = useMemo(() => {
    return positions.map((p) => new THREE.Vector3(p[0], p[1] - 0.08, p[2]));
  }, [positions]);

  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3(points, false);
  }, [points]);

  const tubeGeo = useMemo(() => {
    return new THREE.TubeGeometry(curve, 300, 0.06, 8, false);
  }, [curve]);

  return (
    <mesh geometry={tubeGeo}>
      <meshStandardMaterial color="#d4a574" roughness={0.9} metalness={0.1} />
    </mesh>
  );
}

export function BoardPath({ spaces }) {
  const spaceList = spaces || [];
  const positions = useMemo(
    () => getSpacePositions(spaceList.length || 36),
    [spaceList.length]
  );

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
