import React, { useMemo } from 'react';
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════
// STYLIZED DIORAMA TERRAIN — flat-shaded, bold colors
// Volcano island with distinct color zones
// ═══════════════════════════════════════════════════════

function noise2D(x, y) {
  return (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
}

function terrainHeight(x, z) {
  const dist = Math.sqrt(x * x + z * z);

  // Island shape — irregular circle
  const angle = Math.atan2(z, x);
  const edgeNoise = Math.sin(angle * 3) * 1.5 + Math.sin(angle * 7) * 0.8;
  const islandRadius = 19 + edgeNoise;
  const falloff = Math.max(0, 1 - (dist / islandRadius));
  const islandMask = Math.pow(falloff, 1.0);

  if (islandMask < 0.01) return -0.8;

  // Flat stepped terrain for diorama look
  let h = islandMask * 1.5;

  // Broad hills
  h += Math.sin(x * 0.15 + 1) * Math.cos(z * 0.12 + 2) * 0.8 * islandMask;

  // Volcano cone
  const volcRadius = 8;
  if (dist < volcRadius) {
    const volcMask = 1 - dist / volcRadius;
    h += Math.pow(volcMask, 1.6) * 9;

    // Crater at top
    if (dist < 1.8) {
      h -= (1 - dist / 1.8) * 1.5;
    }
  }

  // Beach flatten
  if (islandMask < 0.12) {
    h = h * (islandMask / 0.12) * 0.3;
  }

  return h;
}

// Region color by height
function getRegionColor(h, x, z) {
  const dist = Math.sqrt(x * x + z * z);

  if (h < 0.05) return [0.2, 0.6, 0.7]; // shallow water tint
  if (h < 0.4) return [0.94, 0.87, 0.65]; // beach sand (warm cream)
  if (h < 0.8) return [0.9, 0.84, 0.6];  // upper beach

  if (h < 2.5) {
    // Jungle: rich saturated green, slight variation
    const v = Math.sin(x * 2 + z * 3) * 0.04;
    return [0.15 + v, 0.6 + v, 0.2];
  }
  if (h < 4.5) {
    // Cliffside: warm tan/grey stone
    const v = Math.sin(x * 5 + z * 7) * 0.03;
    return [0.55 + v, 0.48 + v, 0.38];
  }
  if (h < 6.5) {
    // Volcano rim: dark ash grey
    return [0.35, 0.3, 0.28];
  }

  // Summit: very dark with lava glow seams
  if (dist < 2.5) {
    const glow = Math.max(0, (1 - dist / 2.5));
    return [0.25 + glow * 0.7, 0.18 + glow * 0.15, 0.14];
  }
  return [0.25, 0.2, 0.18];
}

export function Terrain() {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(52, 52, 160, 160);
    geo.rotateX(-Math.PI / 2);
    const positions = geo.attributes.position.array;
    const colors = new Float32Array(positions.length);

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];
      const h = terrainHeight(x, z);
      positions[i + 1] = h;

      const [r, g, b] = getRegionColor(h, x, z);
      colors[i] = r;
      colors[i + 1] = g;
      colors[i + 2] = b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial
        vertexColors
        roughness={1.0}
        metalness={0.0}
        flatShading  // KEY: diorama flat-shaded look
      />
    </mesh>
  );
}

export { terrainHeight };
