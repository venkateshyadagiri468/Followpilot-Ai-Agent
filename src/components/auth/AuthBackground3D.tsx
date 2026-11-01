'use client';

import { useRef, Component, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type * as THREE from 'three';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class CanvasErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch() {
    // Graceful degradation when WebGL is unavailable or loses context
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

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
        color="#10B981"
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

export function AuthBackground3D() {
  const fallback = (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.12),rgba(255,255,255,0))]"
    />
  );

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* Studio lighting base layers */}
      <div className="absolute inset-0 bg-[#0B0D12]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(16,185,129,0.08),rgba(0,0,0,0))]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)]" />

      {/* 3D Canvas with error boundary */}
      <CanvasErrorBoundary fallback={fallback}>
        <Canvas
          camera={{ position: [0, 0, 6], fov: 50 }}
          style={{ background: 'transparent' }}
          gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        >
          <Scene />
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  );
}