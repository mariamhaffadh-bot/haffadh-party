import React, { useMemo } from 'react';
import * as THREE from 'three';

// Procedural noise
function noise2D(x, y) {
  return Math.sin(x * 12.9898 + y * 78.233) * 0.5 + 0.5 * Math.cos(x * 3.0 + y * 7.0);
}

function terrainHeight(x, z) {
  const dist = Math.sqrt(x * x + z * z);

  // Island base shape — circular with irregular edges
  const angle = Math.atan2(z, x);
  const edgeNoise = noise2D(angle * 2, dist * 0.1) * 3;
  const islandRadius = 20 + edgeNoise;
  const falloff = Math.max(0, 1 - (dist / islandRadius));
  const islandMask = Math.pow(falloff, 1.2);

  if (islandMask < 0.01) return -0.5;

  // Base terrain with beach
  let h = islandMask * 1.5;

  // Rolling hills
  h += noise2D(x * 0.12, z * 0.12) * 1.0 * islandMask;
  h += noise2D(x * 0.25, z * 0.25) * 0.4 * islandMask;

  // VOLCANO: tall central peak
  const volcRadius = 8;
  const volcDist = dist;
  if (volcDist < volcRadius) {
    const volcMask = 1 - volcDist / volcRadius;
    // Steep sides
    const volcHeight = Math.pow(volcMask, 1.8) * 10;
    h += volcHeight;

    // Crater depression at the very top
    if (volcDist < 1.5) {
      const craterDepth = (1 - volcDist / 1.5) * 2;
      h -= craterDepth;
    }
  }

  // Beach: flatten near water
  if (islandMask < 0.15) {
    h = h * (islandMask / 0.15) * 0.5;
  }

  return h;
}

export function Terrain() {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(55, 55, 220, 220);
    geo.rotateX(-Math.PI / 2);
    const positions = geo.attributes.position.array;
    const colors = new Float32Array(positions.length);

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];
      const h = terrainHeight(x, z);
      positions[i + 1] = h;

      let r, g, b;
      if (h < 0.05) {
        // Water edge / wet sand
        r = 0.7; g = 0.65; b = 0.45;
      } else if (h < 0.6) {
        // Beach sand
        r = 0.88; g = 0.82; b = 0.62;
      } else if (h < 2.5) {
        // Jungle green
        const v = noise2D(x * 0.5, z * 0.5) * 0.08;
        r = 0.12 + v; g = 0.42 + v; b = 0.1;
      } else if (h < 5.0) {
        // Rocky cliffside
        const v = noise2D(x * 0.8, z * 0.8) * 0.05;
        r = 0.42 + v; g = 0.38 + v; b = 0.32;
      } else if (h < 7.5) {
        // Dark volcanic rock
        r = 0.28; g = 0.22; b = 0.2;
      } else {
        // Summit / near crater — dark with lava glow
        const dist = Math.sqrt(x * x + z * z);
        r = 0.22; g = 0.16; b = 0.14;
        if (dist < 2) {
          const glow = (1 - dist / 2) * 0.6;
          r += glow * 0.9;
          g += glow * 0.25;
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
      />
    </mesh>
  );
}

export { terrainHeight };
