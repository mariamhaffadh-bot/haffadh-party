import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════
// BOARD GRAPH RENDERER — stylized diorama markers
// Each space = raised platform + floating animated icon
// Edges = visible path tubes connecting nodes
// ═══════════════════════════════════════════════════════

const ZONE_COLORS = {
  beach:       { platform: '#d4a56a', accent: '#2ed8d8' },
  jungle:      { platform: '#5a8a3c', accent: '#7ddf4a' },
  cliffside:   { platform: '#7a6b5a', accent: '#b8a88a' },
  volcano_rim: { platform: '#4a3a35', accent: '#ff6633' },
  summit:      { platform: '#2a2020', accent: '#ffaa00' },
};

const SPACE_STYLES = {
  start:         { color: '#ffffff', icon: 'flag',      glow: '#88ccff', scale: 1.2 },
  coin_gain:     { color: '#3399ff', icon: 'coin',      glow: '#3399ff', scale: 1.0 },
  coin_loss:     { color: '#ee4444', icon: 'crack',     glow: '#ee4444', scale: 1.0 },
  event:         { color: '#44cc66', icon: 'question',  glow: '#44cc66', scale: 1.0 },
  item_shop:     { color: '#cc88ff', icon: 'shop',      glow: '#cc88ff', scale: 1.1 },
  idol_shrine:   { color: '#ffcc00', icon: 'idol',      glow: '#ffaa00', scale: 1.3 },
  summit_shrine: { color: '#ff6600', icon: 'crown',     glow: '#ff4400', scale: 1.6 },
  duel:          { color: '#ff8833', icon: 'swords',    glow: '#ff8833', scale: 1.0 },
  fork:          { color: '#44aaee', icon: 'fork',      glow: '#44aaee', scale: 0.9 },
};

// ─── Floating Icon shapes ───
function FloatingIcon({ type, color, position, scale = 1 }) {
  const ref = useRef();
  const baseY = position[1];

  useFrame((state) => {
    if (!ref.current) return;
    // Bob up and down
    ref.current.position.y = baseY + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.12;
    // Slow spin
    ref.current.rotation.y += 0.01;
  });

  let iconGeo;
  switch (type) {
    case 'coin':
      iconGeo = <cylinderGeometry args={[0.2, 0.2, 0.06, 12]} />;
      break;
    case 'crack':
      iconGeo = <octahedronGeometry args={[0.18, 0]} />;
      break;
    case 'question':
      iconGeo = <dodecahedronGeometry args={[0.2, 0]} />;
      break;
    case 'shop':
      iconGeo = <boxGeometry args={[0.3, 0.25, 0.2]} />;
      break;
    case 'idol':
      iconGeo = <coneGeometry args={[0.15, 0.5, 6]} />;
      break;
    case 'crown':
      iconGeo = <coneGeometry args={[0.25, 0.6, 5]} />;
      break;
    case 'swords':
      iconGeo = <tetrahedronGeometry args={[0.22, 0]} />;
      break;
    case 'fork':
      iconGeo = <torusGeometry args={[0.15, 0.05, 8, 12]} />;
      break;
    case 'flag':
      iconGeo = <boxGeometry args={[0.25, 0.3, 0.05]} />;
      break;
    default:
      iconGeo = <sphereGeometry args={[0.15, 8, 8]} />;
  }

  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh castShadow>
        {iconGeo}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          roughness={0.3}
          metalness={0.1}
          flatShading
        />
      </mesh>
    </group>
  );
}

// ─── Space platform (raised tile) ───
function SpaceNode({ node, isDisabled }) {
  const style = SPACE_STYLES[node.type] || SPACE_STYLES.start;
  const zone = ZONE_COLORS[node.region] || ZONE_COLORS.beach;
  const [x, y, z] = node.position;
  const isSummit = node.type === 'summit_shrine';
  const isShrine = node.type === 'idol_shrine' || isSummit;

  return (
    <group position={[x, y, z]}>
      {/* Platform base — raised hexagonal tile */}
      <mesh position={[0, -0.1, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.55 * style.scale, 0.65 * style.scale, 0.25, 6]} />
        <meshStandardMaterial
          color={zone.platform}
          roughness={0.9}
          metalness={0.0}
          flatShading
        />
      </mesh>
      {/* Top surface — colored by type */}
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.5 * style.scale, 0.5 * style.scale, 0.06, 6]} />
        <meshStandardMaterial
          color={style.color}
          roughness={0.6}
          metalness={0.1}
          flatShading
        />
      </mesh>
      {/* Floating icon above */}
      <FloatingIcon
        type={style.icon}
        color={style.color}
        position={[0, 0.6, 0]}
        scale={style.scale * 0.9}
      />
      {/* Glow light for shrines */}
      {isShrine && (
        <pointLight
          position={[0, 0.8, 0]}
          color={style.glow}
          intensity={isSummit ? 3 : 1.5}
          distance={isSummit ? 6 : 3}
          decay={2}
        />
      )}
      {/* Outline ring for readability */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5 * style.scale, 0.58 * style.scale, 6]} />
        <meshBasicMaterial color="#222" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ─── Path edges between connected nodes ───
function PathEdges({ nodes }) {
  const tubes = useMemo(() => {
    const edges = [];
    const seen = new Set();

    nodes.forEach((node) => {
      node.connections.forEach((targetId) => {
        const key = [node.id, targetId].sort().join('-');
        if (seen.has(key)) return;
        seen.add(key);

        const target = nodes.find((n) => n.id === targetId);
        if (!target) return;

        const isDisabled = node.disabled?.includes(targetId);
        const isBridge = node.bridgeEdge || target.bridgeEdge;
        const isTidal = node.tidalEdge || target.tidalEdge;
        const isLava = node.lavaEdge || target.lavaEdge;

        const from = new THREE.Vector3(...node.position);
        const to = new THREE.Vector3(...target.position);
        const mid = from.clone().add(to).multiplyScalar(0.5);
        mid.y += 0.15; // slight arc

        const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
        const geo = new THREE.TubeGeometry(curve, 20, 0.04, 6, false);

        let color = '#c4a06a'; // default warm path
        if (isDisabled) color = '#661111';
        else if (isBridge) color = '#8B6914';
        else if (isTidal) color = '#2299aa';
        else if (isLava) color = '#993300';

        edges.push({ geo, color, isDisabled, key });
      });
    });

    return edges;
  }, [nodes]);

  return (
    <group>
      {tubes.map((edge) => (
        <mesh key={edge.key} geometry={edge.geo}>
          <meshStandardMaterial
            color={edge.color}
            roughness={0.9}
            metalness={0.0}
            transparent={edge.isDisabled}
            opacity={edge.isDisabled ? 0.3 : 1}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}

export function BoardPath({ nodes }) {
  const nodeList = nodes || [];

  return (
    <group>
      <PathEdges nodes={nodeList} />
      {nodeList.map((node) => (
        <SpaceNode key={node.id} node={node} />
      ))}
    </group>
  );
}

// Helper: get a node's 3D position by id
export function getNodePosition(nodes, nodeId) {
  const node = (nodes || []).find((n) => n.id === nodeId);
  return node ? node.position : [0, 0.5, 0];
}
