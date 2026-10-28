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
      meshRef.current.rotation.x += delta * 0.2;
      meshRef.current.rotation.y += delta * 0.3;
      meshRef.current.position.y =
        position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={rotation} scale={scale}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color={color}
        metalness={0.8}
        roughness={0.2}
        transparent
        opacity={0.6}
      />
    </mesh>
  );
}

function ParticleField({ count = 100 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 20;
  }

  useFrame(() => {
    if (points.current) {
      points.current.rotation.y += 0.005;
      points.current.rotation.x += 0.002;
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
        size={0.05}
        color="#2f5a3f"
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#4a7c59" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#7ba897" />

      <FloatingShape
        position={[3, 1, -2]}
        rotation={[0, 0, 0]}
        scale={1.5}
        color="#2f5a3f"
      />
      <FloatingShape
        position={[-3, -1, -3]}
        rotation={[Math.PI / 4, Math.PI / 4, 0]}
        scale={1}
        color="#4a7c59"
      />
      <FloatingShape
        position={[0, 3, -4]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={0.8}
        color="#7ba897"
      />

      <ParticleField count={150} />
    </>
  );
}

export function AuthBackground3D() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        style={{ background: 'transparent' }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}