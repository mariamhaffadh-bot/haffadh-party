import React, { useMemo } from 'react';
import * as THREE from 'three';

// Procedural noise for terrain
function simplex2D(x, y) {
  const s = (x + y) * 0.3660254;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);
  const t = (i + j) * 0.2113249;
  return Math.sin(i * 12.9898 + j * 78.233) * 0.5 + 0.5 * Math.cos(x * 3.0 + y * 7.0);
}

function terrainHeight(x, z) {
  // Crescent island shape
  const angle = Math.atan2(z, x);
  const dist = Math.sqrt(x * x + z * z);

  // Crescent mask: stronger on one side
  const crescentBias = Math.sin(angle + 0.5) * 0.4 + 0.6;
  const islandRadius = 18 * crescentBias;
  const falloff = Math.max(0, 1 - (dist / islandRadius));
  const islandMask = Math.pow(falloff, 1.5);

  if (islandMask < 0.01) return -0.5;

  // Base terrain
  let h = islandMask * 2.5;

  // Hills and ridges
  h += simplex2D(x * 0.15, z * 0.15) * 1.5 * islandMask;
  h += simplex2D(x * 0.3, z * 0.3) * 0.5 * islandMask;

  // Central volcano peak
  const volcDist = Math.sqrt((x - 2) * (x - 2) + (z + 1) * (z + 1));
  const volcHeight = Math.max(0, 1 - volcDist / 6) * 5;
  h += volcHeight;

  // Beach: flatten near edges
  if (islandMask < 0.3) {
    h *= islandMask / 0.3;
  }

  return h;
}

export function Terrain() {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(50, 50, 200, 200);
    geo.rotateX(-Math.PI / 2);
    const positions = geo.attributes.position.array;
    const colors = new Float32Array(positions.length);

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];
      const h = terrainHeight(x, z);
      positions[i + 1] = h;

      // Color based on height and region
      let r, g, b;
      if (h < 0.1) {
        // Underwater / barely land
        r = 0.76; g = 0.7; b = 0.5; // sand
      } else if (h < 0.8) {
        // Beach sand
        r = 0.86; g = 0.8; b = 0.6;
      } else if (h < 2.5) {
        // Jungle green
        const variation = simplex2D(x * 0.5, z * 0.5) * 0.1;
        r = 0.15 + variation; g = 0.45 + variation; b = 0.12;
      } else if (h < 4.5) {
        // Rocky cliffside
        r = 0.45; g = 0.4; b = 0.35;
      } else {
        // Volcano dark
        r = 0.25; g = 0.2; b = 0.18;
        // Lava glow near peak
        const volcDist = Math.sqrt((x - 2) * (x - 2) + (z + 1) * (z + 1));
        if (volcDist < 2) {
          const glow = (1 - volcDist / 2) * 0.5;
          r += glow * 0.8;
          g += glow * 0.2;
        }
      }

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
        roughness={0.85}
        metalness={0.05}
        flatShading={false}
      />
    </mesh>
  );
}

export { terrainHeight };
