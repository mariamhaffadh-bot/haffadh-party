import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════
// 3D DICE — proper cube with pipped faces, scripted
// tumble with gravity/bounce/settle, squash-stretch pop
// ═══════════════════════════════════════════════════════

// Pip positions for each face value (in local face coordinates, -0.3 to +0.3)
const PIP_LAYOUTS = {
  1: [[0, 0]],
  2: [[-0.18, -0.18], [0.18, 0.18]],
  3: [[-0.18, -0.18], [0, 0], [0.18, 0.18]],
  4: [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]],
  5: [[-0.18, -0.18], [0.18, -0.18], [0, 0], [-0.18, 0.18], [0.18, 0.18]],
  6: [[-0.18, -0.2], [0.18, -0.2], [-0.18, 0], [0.18, 0], [-0.18, 0.2], [0.18, 0.2]],
};

// Face rotations to show each value on top
const FACE_ROTATIONS = {
  1: { x: 0, z: 0 },
  2: { x: -Math.PI / 2, z: 0 },
  3: { x: 0, z: Math.PI / 2 },
  4: { x: 0, z: -Math.PI / 2 },
  5: { x: Math.PI / 2, z: 0 },
  6: { x: Math.PI, z: 0 },
};

function DicePips() {
  const pipGeo = useMemo(() => new THREE.CircleGeometry(0.055, 10), []);
  const pipMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#222' }), []);

  // Render pips on all 6 faces
  const faces = [
    { value: 1, pos: [0, 0, 0.401], rot: [0, 0, 0] },           // front (z+)
    { value: 6, pos: [0, 0, -0.401], rot: [0, Math.PI, 0] },     // back (z-)
    { value: 2, pos: [0, 0.401, 0], rot: [-Math.PI/2, 0, 0] },   // top (y+)
    { value: 5, pos: [0, -0.401, 0], rot: [Math.PI/2, 0, 0] },   // bottom (y-)
    { value: 3, pos: [0.401, 0, 0], rot: [0, Math.PI/2, 0] },    // right (x+)
    { value: 4, pos: [-0.401, 0, 0], rot: [0, -Math.PI/2, 0] },  // left (x-)
  ];

  return (
    <group>
      {faces.map((face) =>
        PIP_LAYOUTS[face.value].map((pip, i) => (
          <mesh
            key={`${face.value}-${i}`}
            position={face.pos}
            rotation={face.rot}
            geometry={pipGeo}
            material={pipMat}
          >
            <group position={[pip[0], pip[1], 0.001]} />
          </mesh>
        ))
      )}
      {/* Simplified: render pips as small spheres embedded in faces */}
      {faces.map((face) => {
        const [fx, fy, fz] = face.pos;
        const [rx, ry, rz] = face.rot;
        return PIP_LAYOUTS[face.value].map((pip, i) => {
          // Transform pip position into face-local coords
          const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
          const localPos = new THREE.Vector3(pip[0], pip[1], 0).applyQuaternion(q);
          return (
            <mesh key={`s${face.value}-${i}`} position={[fx + localPos.x, fy + localPos.y, fz + localPos.z]}>
              <sphereGeometry args={[0.045, 8, 8]} />
              <meshStandardMaterial color="#222" roughness={0.8} />
            </mesh>
          );
        });
      })}
    </group>
  );
}

export function Dice3D({ value, rolling, onRollComplete, size = 1 }) {
  const groupRef = useRef();
  const [phase, setPhase] = useState('idle'); // idle, tumble, bounce, settle, pop
  const startTime = useRef(0);
  const tumbleVel = useRef({ x: 0, y: 0, z: 0 });
  const posY = useRef(2);
  const velY = useRef(0);
  const bounceCount = useRef(0);
  const scaleRef = useRef(1);

  useEffect(() => {
    if (rolling) {
      startTime.current = performance.now();
      // Random tumble velocity
      tumbleVel.current = {
        x: (Math.random() * 8 + 6) * (Math.random() > 0.5 ? 1 : -1),
        y: (Math.random() * 4 + 3) * (Math.random() > 0.5 ? 1 : -1),
        z: (Math.random() * 6 + 4) * (Math.random() > 0.5 ? 1 : -1),
      };
      posY.current = 4;
      velY.current = 2;
      bounceCount.current = 0;
      scaleRef.current = 1;
      setPhase('tumble');
    }
  }, [rolling]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.05);

    if (phase === 'tumble') {
      const elapsed = (performance.now() - startTime.current) / 1000;

      // Angular velocity with drag
      const drag = Math.max(0, 1 - elapsed * 0.6);
      groupRef.current.rotation.x += tumbleVel.current.x * drag * dt;
      groupRef.current.rotation.y += tumbleVel.current.y * drag * dt;
      groupRef.current.rotation.z += tumbleVel.current.z * drag * dt;

      // Gravity + bounce
      velY.current -= 18 * dt; // gravity
      posY.current += velY.current * dt;

      if (posY.current <= 1.5) {
        posY.current = 1.5;
        bounceCount.current++;
        velY.current = Math.abs(velY.current) * (0.4 / bounceCount.current); // decreasing bounce

        if (bounceCount.current >= 3 || velY.current < 0.3) {
          setPhase('settle');
        }
      }

      groupRef.current.position.y = posY.current;
    }

    if (phase === 'settle') {
      // Lerp rotation to target face
      const target = FACE_ROTATIONS[value] || FACE_ROTATIONS[1];
      groupRef.current.rotation.x += (target.x - groupRef.current.rotation.x) * 6 * dt;
      groupRef.current.rotation.z += (target.z - groupRef.current.rotation.z) * 6 * dt;
      // Dampen y rotation
      groupRef.current.rotation.y *= (1 - 4 * dt);
      groupRef.current.position.y += (1.5 - groupRef.current.position.y) * 8 * dt;

      const dx = Math.abs(target.x - groupRef.current.rotation.x);
      const dz = Math.abs(target.z - groupRef.current.rotation.z);
      if (dx < 0.02 && dz < 0.02) {
        setPhase('pop');
        startTime.current = performance.now();
      }
    }

    if (phase === 'pop') {
      // Squash-stretch pop animation
      const elapsed = (performance.now() - startTime.current) / 1000;
      if (elapsed < 0.15) {
        // Squash
        const t = elapsed / 0.15;
        scaleRef.current = 1 + Math.sin(t * Math.PI) * 0.25;
        groupRef.current.scale.set(
          scaleRef.current,
          1 / scaleRef.current, // inverse for squash
          scaleRef.current
        );
      } else if (elapsed < 0.35) {
        // Settle back
        const t = (elapsed - 0.15) / 0.2;
        const s = 1 + (1 - t) * 0.08;
        groupRef.current.scale.set(s, s, s);
      } else {
        groupRef.current.scale.set(1, 1, 1);
        setPhase('idle');
        onRollComplete?.();
      }
    }

    if (phase === 'idle') {
      // Gentle float
      groupRef.current.position.y = 1.5 + Math.sin(state.clock.elapsedTime * 1.5) * 0.08;
      groupRef.current.rotation.y += 0.003;
    }
  });

  return (
    <group ref={groupRef} position={[0, 2, 0]} scale={size}>
      {/* Die body — rounded edges via slightly larger geometry */}
      <mesh castShadow>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial
          color="#f8f8f0"
          roughness={0.25}
          metalness={0.05}
        />
      </mesh>
      {/* Edge bevel (subtle dark outline) */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(0.81, 0.81, 0.81)]} />
        <lineBasicMaterial color="#999" linewidth={1} />
      </lineSegments>
      {/* Pips */}
      <DicePips />
    </group>
  );
}
