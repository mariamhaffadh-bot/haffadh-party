import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Simple wave vertex shader
const waterVertexShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying float vElevation;

  void main() {
    vUv = uv;
    vec3 pos = position;

    float wave1 = sin(pos.x * 0.8 + uTime * 0.6) * 0.15;
    float wave2 = sin(pos.z * 0.6 + uTime * 0.4) * 0.1;
    float wave3 = sin((pos.x + pos.z) * 0.5 + uTime * 0.8) * 0.08;
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
    vec3 deepColor = vec3(0.0, 0.15, 0.35);
    vec3 shallowColor = vec3(0.0, 0.55, 0.7);
    vec3 foamColor = vec3(0.8, 0.9, 1.0);

    float mixVal = smoothstep(-0.1, 0.2, vElevation);
    vec3 color = mix(deepColor, shallowColor, mixVal);

    // Foam on wave crests
    float foam = smoothstep(0.15, 0.22, vElevation);
    color = mix(color, foamColor, foam * 0.4);

    // Subtle shimmer
    float shimmer = sin(vUv.x * 60.0 + uTime * 2.0) * sin(vUv.y * 60.0 + uTime * 1.5);
    color += shimmer * 0.02;

    gl_FragColor = vec4(color, 0.85);
  }
`;

export function Water() {
  const meshRef = useRef();
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
  }), []);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
      <planeGeometry args={[120, 120, 128, 128]} />
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
