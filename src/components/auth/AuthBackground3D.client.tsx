'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type * as THREE from 'three';

function FloatingShape({
  position,
  rotation,
  scale,
  color,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  color: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.15;
      meshRef.current.rotation.y += delta * 0.2;
      meshRef.current.position.y =
        position[1] + Math.sin(state.clock.elapsedTime * 0.4) * 0.25;
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={rotation} scale={scale}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color={color}
        metalness={0.85}
        roughness={0.25}
        transparent
        opacity={0.35}
      />
    </mesh>
  );
}

function ParticleField({ count = 120 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 18;
  }

  useFrame(() => {
    if (points.current) {
      points.current.rotation.y += 0.002;
      points.current.rotation.x += 0.001;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#10B989"
        transparent
        opacity={0.35}
        sizeAttenuation
      />
    </points>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[8, 8, 8]} intensity={1.2} color="#059669" />
      <pointLight position={[-8, -8, -8]} intensity={0.6} color="#334155" />

      <FloatingShape
        position={[3.5, 1.2, -2.5]}
        rotation={[0, 0, 0]}
        scale={1.3}
        color="#064E3B"
      />
      <FloatingShape
        position={[-3.8, -1.5, -3.2]}
        rotation={[Math.PI / 4, Math.PI / 4, 0]}
        scale={0.9}
        color="#047857"
      />
      <FloatingShape
        position={[0.5, 3.2, -4]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={0.7}
        color="#1E293B"
      />

      <ParticleField count={120} />
    </>
  );
}

// Loaded only on the client (see AuthBackground3D.tsx). R3F bundles
// react-reconciler, which reads React internals at import time and crashes
// Next.js prerendering — ssr:false in the dynamic import keeps this module
// out of the server bundle.
export default function AuthBackground3DCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 50 }}
      style={{ background: 'transparent' }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
    >
      <Scene />
    </Canvas>
  );
}