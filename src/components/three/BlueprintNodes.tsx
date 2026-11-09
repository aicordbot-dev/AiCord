'use client';

/**
 * src/components/three/BlueprintNodes.tsx
 * Interactive 3D Holographic Blueprint Topology Nodes for the 10-34% scroll sequence.
 * Renders instanced 3D node blocks representing Categories, Channels, and Roles.
 * Seamlessly interpolates between Structure (Tree), Security (Shield Ring), and Hierarchy (Stacked Layers).
 * Zero allocations in useFrame with automatic resource disposal on unmount.
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useScrollStore } from '@/lib/scroll-store';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { useBlueprintSceneStore, ReviewTab } from '@/lib/blueprint-scene-store';

export const TOTAL_NODES = 24;

// Pre-allocated math structures and buffers for zero garbage collection
const _matrix = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _currentColor = new THREE.Color();
const _targetColor = new THREE.Color();
const _nodePositions = new Float32Array(TOTAL_NODES * 3);

// Color palettes for the 3 tabs
const COLORS = {
  structure: {
    root: new THREE.Color('#00F0FF'), // Cyan
    category: new THREE.Color('#5865F2'), // Blurple
    leaf: new THREE.Color('#38BDF8'), // Sky
  },
  security: {
    core: new THREE.Color('#10B981'), // Emerald
    ring: new THREE.Color('#F59E0B'), // Amber
    guard: new THREE.Color('#059669'), // Forest Emerald
  },
  hierarchy: {
    sovereign: new THREE.Color('#FFD700'), // Gold
    admin: new THREE.Color('#A855F7'), // Purple
    moderator: new THREE.Color('#EC4899'), // Pink
    member: new THREE.Color('#6366F1'), // Indigo
  },
};

/**
 * Generates formation coordinates and target colors for a given tab mode.
 */
function generateFormation(tab: ReviewTab): { positions: THREE.Vector3[]; colors: THREE.Color[] } {
  const positions: THREE.Vector3[] = [];
  const colors: THREE.Color[] = [];

  if (tab === 'structure') {
    // 1. Structure Formation: Hierarchical Branching Tree
    // Root Node (Guild Nexus)
    positions.push(new THREE.Vector3(0, 1.8, 0));
    colors.push(COLORS.structure.root);

    // 4 Category Nodes at y = 0.8
    const catX = [-1.8, -0.6, 0.6, 1.8];
    for (let c = 0; c < 4; c++) {
      positions.push(new THREE.Vector3(catX[c], 0.8, c % 2 === 0 ? 0.3 : -0.3));
      colors.push(COLORS.structure.category);
    }

    // 19 Leaf Channel Nodes branching under categories (y from 0.1 down to -1.4)
    for (let i = 5; i < TOTAL_NODES; i++) {
      const catIdx = (i - 5) % 4;
      const slot = Math.floor((i - 5) / 4);
      const baseX = catX[catIdx];
      const offsetX = ((i % 3) - 1) * 0.35;
      const y = 0.1 - slot * 0.45;
      const z = Math.sin(i * 1.3) * 0.4;
      positions.push(new THREE.Vector3(baseX + offsetX, y, z));
      colors.push(COLORS.structure.leaf);
    }
  } else if (tab === 'security') {
    // 2. Security Formation: Emerald / Amber Orbital Shield Ring
    // Core Shield Sentinel
    positions.push(new THREE.Vector3(0, 0.2, 0));
    colors.push(COLORS.security.core);

    // Inner orbital shield nodes (12 nodes in an ellipse)
    const ringCount = 12;
    for (let i = 0; i < ringCount; i++) {
      const angle = (i / ringCount) * Math.PI * 2;
      const r = 1.7;
      const x = Math.cos(angle) * r;
      const y = 0.2 + Math.sin(angle) * (r * 0.35);
      const z = Math.sin(angle) * (r * 0.8);
      positions.push(new THREE.Vector3(x, y, z));
      colors.push(i % 3 === 0 ? COLORS.security.ring : COLORS.security.guard);
    }

    // Outer perimeter security sentinels (11 nodes)
    const outerCount = TOTAL_NODES - 1 - ringCount;
    for (let i = 0; i < outerCount; i++) {
      const angle = (i / outerCount) * Math.PI * 2 + 0.3;
      const r = 2.4;
      const x = Math.cos(angle) * r;
      const y = 0.2 + Math.sin(angle * 2) * 0.4;
      const z = Math.sin(angle) * r;
      positions.push(new THREE.Vector3(x, y, z));
      colors.push(COLORS.security.ring);
    }
  } else {
    // 3. Hierarchy Formation: Stacked Gold / Purple Layered Roles
    // 6 horizontal tiers from top (y = 1.6) to bottom (y = -1.4)
    const tierHeights = [1.6, 1.0, 0.4, -0.2, -0.8, -1.4];
    const tierColors = [
      COLORS.hierarchy.sovereign,
      COLORS.hierarchy.admin,
      COLORS.hierarchy.moderator,
      COLORS.hierarchy.member,
      COLORS.hierarchy.member,
      new THREE.Color('#99AAB5'),
    ];

    let nodeIndex = 0;
    for (let t = 0; t < tierHeights.length && nodeIndex < TOTAL_NODES; t++) {
      const y = tierHeights[t];
      const color = tierColors[t];
      const countInTier = t === 0 ? 1 : t === 1 ? 2 : t === 2 ? 4 : 5;

      for (let j = 0; j < countInTier && nodeIndex < TOTAL_NODES; j++) {
        const spread = (countInTier - 1) * 0.7;
        const x = countInTier === 1 ? 0 : -spread / 2 + j * 0.7;
        const z = j % 2 === 0 ? 0.2 : -0.2;
        positions.push(new THREE.Vector3(x, y, z));
        colors.push(color);
        nodeIndex++;
      }
    }

    // Fill remaining if any
    while (positions.length < TOTAL_NODES) {
      positions.push(new THREE.Vector3(0, -1.5, 0));
      colors.push(tierColors[5]);
    }
  }

  return { positions, colors };
}

export function BlueprintNodes() {
  const groupRef = useRef<THREE.Group>(null);
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const linesRef = useRef<THREE.LineSegments>(null);

  const qualityTier = useScrollStore((state) => state.qualityTier);
  const scrollProgress = useScrollStore((state) => state.progress);
  const activeTab = useBlueprintSceneStore((state) => state.activeTab);
  const isRollbackActive = useBlueprintSceneStore((state) => state.isRollbackActive);
  const prefersReducedMotion = useReducedMotion();

  // Formations cache
  const formations = useMemo(
    () => ({
      structure: generateFormation('structure'),
      security: generateFormation('security'),
      hierarchy: generateFormation('hierarchy'),
    }),
    []
  );

  // Initialize initial positions to structure
  useEffect(() => {
    const initForm = formations[activeTab] || formations.structure;
    for (let i = 0; i < TOTAL_NODES; i++) {
      const p = initForm.positions[i];
      _nodePositions[i * 3] = p.x;
      _nodePositions[i * 3 + 1] = p.y;
      _nodePositions[i * 3 + 2] = p.z;
    }
  }, [formations, activeTab]);

  // Instanced Geometry & Material
  const nodeGeo = useMemo(() => new THREE.BoxGeometry(0.2, 0.2, 0.2), []);
  const nodeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 0.2,
        metalness: 0.8,
        emissive: new THREE.Color('#000000'),
        emissiveIntensity: 0.4,
      }),
    []
  );

  // Lines Geometry & Material
  const linesGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array((TOTAL_NODES - 1) * 2 * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  const linesMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  // Clean unmount disposal
  useEffect(() => {
    return () => {
      nodeGeo.dispose();
      nodeMat.dispose();
      linesGeo.dispose();
      linesMat.dispose();
    };
  }, [nodeGeo, nodeMat, linesGeo, linesMat]);

  // Frame update
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const time = state.clock.getElapsedTime();

    // 1. Calculate Visibility & Scale based on scroll range (10% to 34% of scroll)
    // Ramp up from 0.08 to 0.14, sustain until 0.32, ramp down to 0.38
    let targetScale = 0;
    if (scrollProgress >= 0.08 && scrollProgress <= 0.38) {
      if (scrollProgress < 0.14) {
        targetScale = (scrollProgress - 0.08) / 0.06;
      } else if (scrollProgress > 0.32) {
        targetScale = 1 - (scrollProgress - 0.32) / 0.06;
      } else {
        targetScale = 1.0;
      }
    }
    targetScale = Math.max(0, Math.min(1.0, targetScale));

    // If rollback is active, trigger collapse pulse
    if (isRollbackActive) {
      targetScale *= 0.15;
    }

    if (!groupRef.current || !instancedMeshRef.current) return;

    // Smoothly scale group
    groupRef.current.scale.lerp(
      _scale.set(targetScale, targetScale, targetScale),
      dt * 6
    );

    // If completely invisible, bypass node computations to preserve CPU/GPU
    if (groupRef.current.scale.x < 0.01) {
      groupRef.current.visible = false;
      return;
    }
    groupRef.current.visible = true;

    // Gentle global float and rotation
    groupRef.current.rotation.y = Math.sin(time * 0.3) * 0.15;
    groupRef.current.position.y = Math.cos(time * 0.6) * 0.08;

    // 2. Interpolate Node Positions & Colors
    const targetFormation = formations[activeTab] || formations.structure;
    const mesh = instancedMeshRef.current;
    const posAttr = linesRef.current?.geometry.attributes.position as THREE.BufferAttribute | undefined;
    const lPos = posAttr ? (posAttr.array as Float32Array) : null;
    let lineIdx = 0;

    for (let i = 0; i < TOTAL_NODES; i++) {
      const targetPos = targetFormation.positions[i];
      const targetCol = targetFormation.colors[i];

      // Current position indices
      const idxX = i * 3;
      const idxY = i * 3 + 1;
      const idxZ = i * 3 + 2;

      // Damp current position towards target
      const lerpSpeed = isRollbackActive ? 12 : 5;
      _nodePositions[idxX] = THREE.MathUtils.damp(_nodePositions[idxX], targetPos.x, lerpSpeed, dt);
      _nodePositions[idxY] = THREE.MathUtils.damp(_nodePositions[idxY], targetPos.y, lerpSpeed, dt);
      _nodePositions[idxZ] = THREE.MathUtils.damp(_nodePositions[idxZ], targetPos.z, lerpSpeed, dt);

      // Micro floating jitter per node
      const jitterY = Math.sin(time * 1.5 + i) * 0.02;

      _position.set(
        _nodePositions[idxX],
        _nodePositions[idxY] + jitterY,
        _nodePositions[idxZ]
      );

      // Node size: root/categories slightly larger
      const nodeSize = i === 0 ? 1.3 : i < 5 ? 1.0 : 0.75;
      _scale.set(nodeSize, nodeSize, nodeSize);
      _matrix.compose(_position, _quaternion, _scale);
      mesh.setMatrixAt(i, _matrix);

      // Color interpolation
      _targetColor.copy(targetCol);
      if (mesh.getColorAt(i, _currentColor)) {
        _currentColor.lerp(_targetColor, Math.min(1, dt * 6));
        mesh.setColorAt(i, _currentColor);
      } else {
        mesh.setColorAt(i, _targetColor);
      }

      // Connect to parent / adjacent node with lines
      if (i > 0 && lPos && lineIdx < (TOTAL_NODES - 1) * 6) {
        const parentIdx = activeTab === 'structure' ? (i < 5 ? 0 : ((i - 5) % 4) + 1) : i - 1;
        lPos[lineIdx++] = _nodePositions[parentIdx * 3];
        lPos[lineIdx++] = _nodePositions[parentIdx * 3 + 1];
        lPos[lineIdx++] = _nodePositions[parentIdx * 3 + 2];

        lPos[lineIdx++] = _nodePositions[idxX];
        lPos[lineIdx++] = _nodePositions[idxY] + jitterY;
        lPos[lineIdx++] = _nodePositions[idxZ];
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    // Update line positions
    if (posAttr) {
      posAttr.needsUpdate = true;
    }
  });

  if (qualityTier === 'low' || prefersReducedMotion) {
    return null;
  }

  return (
    <group ref={groupRef} position={[1.8, 0.4, 0]}>
      {/* Instanced Mesh Nodes */}
      <instancedMesh
        ref={instancedMeshRef}
        args={[nodeGeo, nodeMat, TOTAL_NODES]}
        castShadow
        receiveShadow
      />

      {/* Network Connecting Lines */}
      <lineSegments ref={linesRef} geometry={linesGeo} material={linesMat} />
    </group>
  );
}

export default BlueprintNodes;
