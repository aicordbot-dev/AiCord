/**
 * src/lib/three-utils.ts
 * In-memory procedural Three.js texture generation, CSS color bridge, and WebGL availability detection.
 */

import * as THREE from 'three';

/**
 * Checks if WebGL or WebGL2 is supported in the current environment.
 * Safe to execute in SSR / Node.js test environments.
 */
export function isWebGLAvailable(version: 'webgl' | 'webgl2' = 'webgl'): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  try {
    const canvas = document.createElement('canvas');
    if (version === 'webgl2') {
      return Boolean(window.WebGL2RenderingContext && canvas.getContext('webgl2'));
    }
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

/**
 * Converts CSS hex or named string into a Three.js Color object.
 * Robust to various prefixes ('#', '0x', or bare hex) and validates inputs safely.
 */
export function hexToThreeColor(hexInput: string, fallback = '#00f0ff'): THREE.Color {
  if (!hexInput || typeof hexInput !== 'string') {
    return new THREE.Color(fallback);
  }

  let cleaned = hexInput.trim();

  // Strip 8-digit hex alpha channel if present (e.g., #00f0ffcc -> #00f0ff)
  if (cleaned.startsWith('#') && cleaned.length === 9) {
    cleaned = cleaned.substring(0, 7);
  }

  // Handle bare hex without # prefix
  if (/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(cleaned)) {
    cleaned = `#${cleaned}`;
  }

  // Validate hex format
  const isValidHex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(cleaned);
  if (!isValidHex) {
    return new THREE.Color(fallback);
  }

  try {
    return new THREE.Color(cleaned);
  } catch {
    return new THREE.Color(fallback);
  }
}

/**
 * Alias for hexToThreeColor.
 */
export const cssToThreeColor = hexToThreeColor;

/**
 * Procedurally generates a 4-point luminous sparkle/star texture using in-memory HTML5 Canvas.
 * Zero external asset dependencies. Additively blends perfectly with particles and holographic meshes.
 */
export function createSparkleTexture(size = 128): THREE.CanvasTexture {
  if (typeof document === 'undefined') {
    // SSR / Node test fallback: create dummy texture
    const dummyCanvas = {
      width: size,
      height: size,
      nodeType: 1,
      nodeName: 'CANVAS',
    } as unknown as HTMLCanvasElement;
    return new THREE.CanvasTexture(dummyCanvas);
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  const center = size / 2;
  const radius = size / 2;

  // Clear canvas transparent
  ctx.clearRect(0, 0, size, size);

  // 1. Soft ambient radial glow
  const radialGlow = ctx.createRadialGradient(center, center, 0, center, center, radius * 0.9);
  radialGlow.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  radialGlow.addColorStop(0.15, 'rgba(210, 240, 255, 0.85)');
  radialGlow.addColorStop(0.4, 'rgba(100, 200, 255, 0.35)');
  radialGlow.addColorStop(0.8, 'rgba(0, 160, 255, 0.08)');
  radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = radialGlow;
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fill();

  // 2. High-intensity 4-point diamond cross rays
  ctx.save();
  ctx.translate(center, center);

  const drawRay = (w: number, h: number) => {
    ctx.beginPath();
    ctx.moveTo(0, -h);
    ctx.quadraticCurveTo(w * 0.15, 0, 0, h);
    ctx.quadraticCurveTo(-w * 0.15, 0, 0, -h);
    ctx.closePath();
    ctx.fill();
  };

  const rayGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.95);
  rayGradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  rayGradient.addColorStop(0.3, 'rgba(200, 245, 255, 0.9)');
  rayGradient.addColorStop(0.7, 'rgba(120, 210, 255, 0.4)');
  rayGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = rayGradient;

  // Vertical flare
  drawRay(size * 0.12, radius * 0.95);
  // Horizontal flare
  drawRay(radius * 0.95, size * 0.12);

  // Core bright pinpoint
  const coreGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.18);
  coreGlow.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  coreGlow.addColorStop(0.8, 'rgba(230, 250, 255, 0.9)');
  coreGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = coreGlow;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  return texture;
}
