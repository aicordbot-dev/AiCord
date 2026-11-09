'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function Hero3DCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webGLSupported, setWebGLSupported] = useState<boolean>(true);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    // Check WebGL availability
    const checkWebGL = (): boolean => {
      try {
        const testCanvas = document.createElement('canvas');
        return Boolean(
          window.WebGLRenderingContext &&
            (testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')),
        );
      } catch {
        return false;
      }
    };

    if (!checkWebGL()) {
      setWebGLSupported(false);
      return;
    }

    const container = mountRef.current;
    if (!container) return;

    // Dimensions
    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || 600;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070913, 0.035);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 0, 7.5);

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      container.appendChild(renderer.domElement);
    } catch {
      setWebGLSupported(false);
      return;
    }

    // ─── Holographic Core Group ───────────────────────────────────────────────
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // 1. Inner Glowing Icosahedron
    const innerGeo = new THREE.IcosahedronGeometry(1.6, 2);
    const innerMat = new THREE.MeshPhysicalMaterial({
      color: 0x00f0ff,
      emissive: 0x004466,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    const innerCore = new THREE.Mesh(innerGeo, innerMat);
    coreGroup.add(innerCore);

    // 2. Central Quantum Octahedron
    const centerOctaGeo = new THREE.OctahedronGeometry(1.0, 0);
    const centerOctaMat = new THREE.MeshStandardMaterial({
      color: 0xff007f,
      emissive: 0x880044,
      emissiveIntensity: 1.2,
      roughness: 0.1,
      metalness: 0.9,
    });
    const centerOcta = new THREE.Mesh(centerOctaGeo, centerOctaMat);
    coreGroup.add(centerOcta);

    // 3. Floating Dodecahedron Shield Shell
    const shellGeo = new THREE.DodecahedronGeometry(2.2, 0);
    const shellMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      emissive: 0x3b0764,
      emissiveIntensity: 0.6,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });
    const shellMesh = new THREE.Mesh(shellGeo, shellMat);
    coreGroup.add(shellMesh);

    // 4. Glowing Orbital Rings
    const ringGroup = new THREE.Group();
    coreGroup.add(ringGroup);

    const ringGeometries: THREE.TorusGeometry[] = [];
    const ringMaterials: THREE.MeshBasicMaterial[] = [];
    const rings: THREE.Mesh[] = [];

    const ringConfigs = [
      { radius: 2.7, tube: 0.025, color: 0x00f0ff, rotX: 0.8, rotY: 0.4 },
      { radius: 3.1, tube: 0.02, color: 0xa855f7, rotX: -0.6, rotY: 0.9 },
      { radius: 3.5, tube: 0.015, color: 0x10b981, rotX: 1.2, rotY: -0.5 },
      { radius: 3.9, tube: 0.018, color: 0xf59e0b, rotX: -0.3, rotY: 1.4 },
    ];

    ringConfigs.forEach((cfg) => {
      const geo = new THREE.TorusGeometry(cfg.radius, cfg.tube, 16, 100);
      const mat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        wireframe: false,
        transparent: true,
        opacity: 0.75,
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = cfg.rotX;
      ring.rotation.y = cfg.rotY;
      ringGeometries.push(geo);
      ringMaterials.push(mat);
      rings.push(ring);
      ringGroup.add(ring);
    });

    // 5. Floating Orbital Stardust & Spark Particles
    const particleCount = 1000;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const palette = [
      new THREE.Color(0x00f0ff), // Cyan
      new THREE.Color(0xa855f7), // Purple
      new THREE.Color(0xec4899), // Pink
      new THREE.Color(0x10b981), // Emerald
      new THREE.Color(0x38bdf8), // Sky
    ];

    for (let i = 0; i < particleCount; i++) {
      // Fibonacci spherical distribution with radius jitter
      const r = 2.0 + Math.random() * 5.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const picked = palette[Math.floor(Math.random() * palette.length)];
      particleColors[i * 3] = picked.r;
      particleColors[i * 3 + 1] = picked.g;
      particleColors[i * 3 + 2] = picked.b;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);

    // ─── Dynamic Lights ──────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0x0f172a, 2.0);
    scene.add(ambientLight);

    const coreLight = new THREE.PointLight(0x00f0ff, 4, 15);
    coreLight.position.set(0, 0, 0);
    scene.add(coreLight);

    const cursorLight = new THREE.PointLight(0xa855f7, 5, 20);
    cursorLight.position.set(0, 2, 4);
    scene.add(cursorLight);

    const rimLight = new THREE.DirectionalLight(0xec4899, 1.5);
    rimLight.position.set(5, 5, 5);
    scene.add(rimLight);

    // ─── Mouse / Pointer Parallax Tracking ────────────────────────────────────
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      let clientX = 0;
      let clientY = 0;
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      targetX = (clientX / window.innerWidth - 0.5) * 2;
      targetY = (clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });

    // ─── Responsive Resize Listener ───────────────────────────────────────────
    const handleResize = () => {
      if (!container || !renderer) return;
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener('resize', handleResize);

    // ─── Animation Loop ───────────────────────────────────────────────────────
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth pointer lerp
      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;

      // Parallax camera tilt
      camera.position.x = mouseX * 1.2;
      camera.position.y = -mouseY * 0.9;
      camera.lookAt(0, 0, 0);

      // Light tracks mouse subtly
      cursorLight.position.x = mouseX * 5;
      cursorLight.position.y = -mouseY * 5 + 1;

      // Core rotation with mathematical layering
      innerCore.rotation.x = elapsedTime * 0.25;
      innerCore.rotation.y = elapsedTime * 0.35;

      centerOcta.rotation.x = -elapsedTime * 0.45;
      centerOcta.rotation.z = elapsedTime * 0.3;
      const octaScale = 1.0 + Math.sin(elapsedTime * 2.5) * 0.08;
      centerOcta.scale.set(octaScale, octaScale, octaScale);

      shellMesh.rotation.y = -elapsedTime * 0.15;
      shellMesh.rotation.z = elapsedTime * 0.1;

      // Rings spin along their local axes
      rings.forEach((ring, idx) => {
        const factor = (idx % 2 === 0 ? 1 : -1) * (0.2 + idx * 0.08);
        ring.rotation.z = elapsedTime * factor;
      });

      // Stardust drift & breathe
      particleSystem.rotation.y = elapsedTime * 0.04;
      particleSystem.rotation.x = Math.sin(elapsedTime * 0.05) * 0.1;

      if (renderer) {
        renderer.render(scene, camera);
      }
    };

    animate();
    setIsLoaded(true);

    // ─── Clean Unmount Cleanup ────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('resize', handleResize);

      // Dispose geometries
      innerGeo.dispose();
      centerOctaGeo.dispose();
      shellGeo.dispose();
      ringGeometries.forEach((g) => g.dispose());
      particleGeometry.dispose();

      // Dispose materials
      innerMat.dispose();
      centerOctaMat.dispose();
      shellMat.dispose();
      ringMaterials.forEach((m) => m.dispose());
      particleMaterial.dispose();

      // Dispose renderer
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="relative w-full h-full min-h-[520px] lg:min-h-[640px] flex items-center justify-center overflow-hidden select-none pointer-events-auto"
      aria-label="Interactive 3D Holographic Cyber Core Canvas"
    >
      {/* Visual Loader Overlay */}
      {!isLoaded && webGLSupported && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 space-y-3 pointer-events-none">
          <div className="w-12 h-12 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <span className="text-xs font-mono text-cyan-400 tracking-widest uppercase animate-pulse">
            Booting 3D Cyber Core...
          </span>
        </div>
      )}

      {/* Accessible Non-WebGL / Fallback View */}
      {!webGLSupported && (
        <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
          <div className="relative w-48 h-48 mb-6 flex items-center justify-center">
            {/* Pulsing CSS Cyber Ring */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-500 animate-spin" />
            <div className="absolute inset-3 rounded-full border-2 border-purple-500 animate-ping opacity-30" />
            <div className="absolute inset-6 rounded-full bg-gradient-to-tr from-cyan-500/20 via-purple-500/20 to-pink-500/20 backdrop-blur-md border border-cyan-400/50 flex items-center justify-center shadow-[0_0_50px_rgba(0,240,255,0.4)]">
              <span className="text-4xl">🤖</span>
            </div>
          </div>
          <h3 className="text-lg font-bold text-white font-mono tracking-wider">
            AiCord Holographic Nexus
          </h3>
          <p className="text-xs text-gray-400 mt-2 font-mono">
            3D WebGL acceleration standby • High-Performance Fallback Mode Active
          </p>
        </div>
      )}

      {/* Futuristic HUD Edge Accents */}
      <div className="absolute top-4 left-4 font-mono text-[10px] text-cyan-400/60 uppercase tracking-widest pointer-events-none hidden sm:block">
        [ SYS_CORE: V2.4_ONLINE ]
        <br />
        [ PARALLAX: ACTIVE ]
      </div>
      <div className="absolute bottom-4 right-4 font-mono text-[10px] text-purple-400/60 uppercase tracking-widest pointer-events-none hidden sm:block">
        [ 3D_GEOMETRY: QUANTUM_MESH ]
        <br />
        [ 1,000 ORBITAL PARTICLES ]
      </div>
    </div>
  );
}
