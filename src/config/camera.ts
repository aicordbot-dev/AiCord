/**
 * src/config/camera.ts
 * 3D WebGL Camera Poses and spatial waypoints for scroll-synchronized scenes.
 */

export interface CameraPose {
  id: string;
  name: string;
  sceneIndex: number;
  scrollRange: [number, number]; // [progressStart, progressEnd]
  position: [number, number, number]; // [x, y, z] in Three.js world units
  target: [number, number, number]; // Look-at point [x, y, z]
  fov: number; // Field of view in degrees
  rotation?: [number, number, number]; // Euler angles [x, y, z]
  duration?: number; // Transition duration factor
  description: string;
}

export interface CameraConfig {
  defaultFov: number;
  nearPlane: number;
  farPlane: number;
  dampening: number;
  poses: Record<string, CameraPose>;
  poseList: CameraPose[];
}

export const CAMERA_POSES: Record<string, CameraPose> = {
  hero: {
    id: 'hero',
    name: 'Hero Overview',
    sceneIndex: 0,
    scrollRange: [0.0, 0.18],
    position: [0, 1.2, 5.0],
    target: [0, 0, 0],
    fov: 45,
    description: 'Frontal perspective centered on the pulsating holographic Discord guild nexus.',
  },
  sandbox: {
    id: 'sandbox',
    name: 'Architecture Sandbox',
    sceneIndex: 1,
    scrollRange: [0.18, 0.38],
    position: [2.5, 3.2, 4.2],
    target: [0.3, 0.4, 0],
    fov: 42,
    description: 'Angled elevated view focusing on hierarchical channel and category branch synthesis.',
  },
  themes: {
    id: 'themes',
    name: 'Universal Themes Deck',
    sceneIndex: 2,
    scrollRange: [0.38, 0.58],
    position: [-3.0, 1.6, 3.8],
    target: [-0.5, 0.2, 0],
    fov: 40,
    description: 'Close-range orbital view emphasizing color spectrum radiance and ASCII terminal textures.',
  },
  features: {
    id: 'features',
    name: 'Services Constellation',
    sceneIndex: 3,
    scrollRange: [0.58, 0.78],
    position: [0, 4.5, 6.5],
    target: [0, 0, 0],
    fov: 48,
    description: 'Panoramic bird-eye camera encompassing the 28+ orbital service constellation nodes.',
  },
  pricing: {
    id: 'pricing',
    name: 'Sovereign Tiers',
    sceneIndex: 4,
    scrollRange: [0.78, 0.92],
    position: [1.8, 2.0, 4.6],
    target: [0, -0.2, 0],
    fov: 42,
    description: 'Structured perspective aligning with tiered crystalline entitlement monoliths.',
  },
  cta: {
    id: 'cta',
    name: 'Warp Portal CTA',
    sceneIndex: 5,
    scrollRange: [0.92, 1.0],
    position: [0, 0.8, 3.2],
    target: [0, 0, 0],
    fov: 38,
    description: 'Deep immersion focal view into the deployment warp singularity.',
  },
};

export const cameraConfig: CameraConfig = {
  defaultFov: 45,
  nearPlane: 0.1,
  farPlane: 1000,
  dampening: 0.08,
  poses: CAMERA_POSES,
  poseList: Object.values(CAMERA_POSES),
};

/**
 * Interpolates between two camera poses based on normalized scroll progress (0-1).
 */
export function getPoseForProgress(progress: number): {
  fromPose: CameraPose;
  toPose: CameraPose;
  blend: number;
} {
  const clamped = Math.max(0, Math.min(1, progress));
  const poses = cameraConfig.poseList;

  for (let i = 0; i < poses.length; i++) {
    const current = poses[i];
    const next = poses[Math.min(i + 1, poses.length - 1)];

    if (clamped >= current.scrollRange[0] && clamped <= current.scrollRange[1]) {
      const range = current.scrollRange[1] - current.scrollRange[0];
      const blend = range > 0 ? (clamped - current.scrollRange[0]) / range : 0;
      return { fromPose: current, toPose: next, blend };
    }
  }

  return {
    fromPose: poses[poses.length - 1],
    toPose: poses[poses.length - 1],
    blend: 1,
  };
}
