import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════
// STYLIZED WATER — bright turquoise, cartoony waves
// ═══════════════════════════════════════════════════════

const waterVertexShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying float vElevation;

  void main() {
    vUv = uv;
    vec3 pos = position;
    float wave1 = sin(pos.x * 0.6 + uTime * 0.8) * 0.2;
    float wave2 = sin(pos.z * 0.5 + uTime * 0.5) * 0.15;
    float wave3 = cos((pos.x + pos.z) * 0.4 + uTime * 0.7) * 0.1;
    pos.y += wave1 + wave2 + wave3;
    vElevation = wave1 + wave2 + wave3;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const waterFragmentShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying float vElevation;

  void main() {
    // Bright stylized turquoise water
    vec3 deepColor = vec3(0.05, 0.35, 0.55);
    vec3 shallowColor = vec3(0.1, 0.7, 0.75);
    vec3 foamColor = vec3(0.85, 0.95, 1.0);

    float mixVal = smoothstep(-0.15, 0.25, vElevation);
    vec3 color = mix(deepColor, shallowColor, mixVal);

    // Cartoony foam bands
    float foam = smoothstep(0.18, 0.24, vElevation);
    color = mix(color, foamColor, foam * 0.5);

    // Subtle sparkle
    float sparkle = step(0.98, sin(vUv.x * 80.0 + uTime * 3.0) * sin(vUv.y * 80.0 + uTime * 2.0));
    color += sparkle * 0.15;

    gl_FragColor = vec4(color, 0.9);
  }
`;

export function Water() {
  const ref = useRef();
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame((state) => { uniforms.uTime.value = state.clock.elapsedTime; });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}>
      <planeGeometry args={[120, 120, 80, 80]} />
      <shaderMaterial
        vertexShader={waterVertexShader}
        fragmentShader={waterFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
