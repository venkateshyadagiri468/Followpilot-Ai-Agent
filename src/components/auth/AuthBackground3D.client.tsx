'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function AuthBackground3DCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Dimensions
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 0, 6);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'low-power',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x059669, 1.2, 50);
    pointLight1.position.set(8, 8, 8);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x334155, 0.6, 50);
    pointLight2.position.set(-8, -8, -8);
    scene.add(pointLight2);

    // Floating shapes (icosahedrons)
    const shapesConfig = [
      {
        pos: [3.5, 1.2, -2.5] as const,
        rot: [0, 0, 0] as const,
        scale: 1.3,
        color: '#064E3B',
      },
      {
        pos: [-3.8, -1.5, -3.2] as const,
        rot: [Math.PI / 4, Math.PI / 4, 0] as const,
        scale: 0.9,
        color: '#047857',
      },
      {
        pos: [0.5, 3.2, -4] as const,
        rot: [Math.PI / 2, 0, 0] as const,
        scale: 0.7,
        color: '#1E293B',
      },
    ];

    const shapes = shapesConfig.map((cfg) => {
      const geometry = new THREE.IcosahedronGeometry(1, 0);
      const material = new THREE.MeshStandardMaterial({
        color: cfg.color,
        metalness: 0.85,
        roughness: 0.25,
        transparent: true,
        opacity: 0.35,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
      mesh.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
      mesh.scale.setScalar(cfg.scale);
      scene.add(mesh);
      return { mesh, initialY: cfg.pos[1] };
    });

    // Particle field
    const count = 120;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 18;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.04,
      color: '#10B989',
      transparent: true,
      opacity: 0.35,
      sizeAttenuation: true,
    });
    const particlePoints = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particlePoints);

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth || window.innerWidth;
      const newHeight = container.clientHeight || window.innerHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Animate shapes
      shapes.forEach(({ mesh, initialY }) => {
        mesh.rotation.x += delta * 0.15;
        mesh.rotation.y += delta * 0.2;
        mesh.position.y = initialY + Math.sin(elapsedTime * 0.4) * 0.25;
      });

      // Animate particles
      particlePoints.rotation.y += 0.002;
      particlePoints.rotation.x += 0.001;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);

      // Dispose Three.js objects
      renderer.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      shapes.forEach(({ mesh }) => {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m: THREE.Material) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      });
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 h-full w-full" />;
}
