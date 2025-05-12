"use client";

import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import type * as THREE from 'three';
import { debounce } from '@/lib/utils';
import type { BlendMode, ParticleSource } from './types';

let THREE_Module: typeof THREE | null = null;

interface SmokeCanvasProps {
  // Smoke Props
  isSmokeEnabled?: boolean;
  smokeDensity?: number;
  smokeBaseColor?: string;
  smokeAccentColor?: string;
  smokeSpeed?: number;
  smokeSpread?: number;
  smokeBlendMode?: BlendMode;
  smokeSource?: ParticleSource;
  smokeOpacity?: number;
  smokeTurbulence?: number;
  smokeDissipation?: number;
  smokeBuoyancy?: number;
  particleText?: string;

  // Fire Props
  isFireEnabled?: boolean;
  fireBaseColor?: string;
  fireAccentColor?: string;
  fireDensity?: number;
  fireSpeed?: number;
  fireSpread?: number;
  fireParticleSource?: ParticleSource;
  fireBlendMode?: BlendMode;
  fireOpacity?: number;
  fireTurbulence?: number;

  // Scene Props
  backgroundColor?: string;
  windDirectionX?: number;
  windStrength?: number;
  isPlaying?: boolean;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

const MAX_SMOKE_PARTICLES = 8000;
const MAX_FIRE_PARTICLES = 5000;

const BASE_FIRE_LIFESPAN = 60; // Shorter lifespan for more dynamic fire
const BASE_SMOKE_LIFESPAN = 250; // Slightly longer for more lingering smoke
const BOTTOM_SOURCE_X_SPREAD = 12.0;

const TEXT_CANVAS_WIDTH = 512;
const TEXT_CANVAS_HEIGHT = 128;
const TEXT_FONT_SIZE = 80;
const TEXT_FONT = `bold ${TEXT_FONT_SIZE}px Arial, sans-serif`;
const TEXT_SAMPLE_DENSITY = 0.3; // Adjust for denser or sparser text shapes
const TEXT_SHAPE_SCALE = 0.02;

type EffectiveParticleSource = ParticleSource | "Text";

const SmokeCanvas: React.FC<SmokeCanvasProps> = ({
  isSmokeEnabled = true,
  smokeDensity = 6500, // Default from page.tsx
  smokeBaseColor = '#FFFFFF',
  smokeAccentColor = '#E0E0E0',
  smokeSpeed = 0.015,
  smokeSpread = 1.5, // Default from page.tsx
  smokeBlendMode = "Normal",
  smokeSource: smokeSourceProp = "Bottom",
  smokeOpacity = 0.5, // Default from page.tsx
  smokeTurbulence = 1.2,
  smokeDissipation = 0.15, // Default from page.tsx
  smokeBuoyancy = 0.005,
  particleText = "",

  isFireEnabled = false,
  fireBaseColor = '#FFA500',
  fireAccentColor = '#FFD700',
  fireDensity = 800,
  fireSpeed = 0.03,
  fireSpread = 1.5,
  fireParticleSource: fireSourceProp = "Bottom",
  fireBlendMode = "Additive",
  fireOpacity = 0.7,
  fireTurbulence = 1.0,

  backgroundColor = '#000000', // Default from page.tsx
  windDirectionX = 0,
  windStrength = 0,
  isPlaying = true,
  onCanvasReady,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const smokeParticlesRef = useRef<THREE.Points | null>(null);
  const fireParticlesRef = useRef<THREE.Points | null>(null);

  const animationFrameIdRef = useRef<number | null>(null);

  const [isThreeLoaded, setIsThreeLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const actualSmokeParticleCount = Math.min(smokeDensity, MAX_SMOKE_PARTICLES);
  const actualFireParticleCount = Math.min(fireDensity, MAX_FIRE_PARTICLES);

  const mouseSceneXRef = useRef(0);
  const mouseSceneYRef = useRef(0);

  const textPointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const textCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const effectiveSmokeSource: EffectiveParticleSource = particleText ? "Text" : smokeSourceProp;
  const effectiveFireSource: EffectiveParticleSource = particleText ? "Text" : fireSourceProp;

  useEffect(() => {
    textCanvasRef.current = document.createElement('canvas');
    textCanvasRef.current.width = TEXT_CANVAS_WIDTH;
    textCanvasRef.current.height = TEXT_CANVAS_HEIGHT;
  }, []);

  const generateTextPoints = useCallback((text: string) => {
    if (!textCanvasRef.current || !text) {
      textPointsRef.current = [];
      return;
    }
    const canvas = textCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      textPointsRef.current = [];
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = TEXT_FONT;
    ctx.fillStyle = '#ffffff'; // Solid color for sampling
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const points: Array<{ x: number; y: number }> = [];
    const step = Math.max(1, Math.floor(1 / Math.sqrt(TEXT_SAMPLE_DENSITY))); // Adjust step based on density

    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        // Check alpha channel of the pixel (index 3)
        const alphaIndex = (y * canvas.width + x) * 4 + 3;
        if (data[alphaIndex] > 128) { // If pixel is not transparent
            // Add some randomness to point selection within the step grid
             if (Math.random() < TEXT_SAMPLE_DENSITY * step * step ) { // Probabilistic sampling
                const sceneX = (x - canvas.width / 2) * TEXT_SHAPE_SCALE;
                const sceneY = -(y - canvas.height / 2) * TEXT_SHAPE_SCALE; // Invert Y for scene coords
                points.push({ x: sceneX, y: sceneY });
             }
        }
      }
    }
    textPointsRef.current = points;
  }, []);


  useEffect(() => {
    const debouncedGenerate = debounce(() => generateTextPoints(particleText), 300);
    debouncedGenerate();
  }, [particleText, generateTextPoints]);

  useEffect(() => {
    import('three').then(threeModule => {
      THREE_Module = threeModule;
      setIsThreeLoaded(true);
      setLoadError(null);
    }).catch(err => {
      console.error("Failed to load Three.js", err);
      setLoadError("Failed to load 3D rendering library. Please try refreshing the page.");
      setIsThreeLoaded(false);
    });
  }, []);

   const handleMouseMove = useCallback((event: MouseEvent) => {
     if (!mountRef.current || !cameraRef.current || !THREE_Module) return;
     const canvasBounds = mountRef.current.getBoundingClientRect();
     if (canvasBounds.width === 0 || canvasBounds.height === 0) return; // Avoid division by zero
     const mouseXNDC = ((event.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
     const mouseYNDC = -((event.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;

     const vec = new THREE_Module.Vector3(mouseXNDC, mouseYNDC, 0.5);
     vec.unproject(cameraRef.current);
     const dir = vec.sub(cameraRef.current.position).normalize();
     // Prevent issues if camera is looking straight along Z axis or if dir.z is very small
     if (Math.abs(dir.z) < 1e-6) return;
     const distance = -cameraRef.current.position.z / dir.z;
      // Ensure distance is valid
     if (isNaN(distance) || !isFinite(distance) || distance < 0) return;


     const pos = cameraRef.current.position.clone().add(dir.multiplyScalar(distance));
      // Ensure position components are valid
     if (isNaN(pos.x) || isNaN(pos.y)) return;


     mouseSceneXRef.current = pos.x;
     mouseSceneYRef.current = pos.y;
   }, []);


   useEffect(() => {
     if (!mountRef.current || !isThreeLoaded) return;
     const currentMountRef = mountRef.current;
     currentMountRef.addEventListener('mousemove', handleMouseMove);
     return () => {
       currentMountRef.removeEventListener('mousemove', handleMouseMove);
     };
   }, [isThreeLoaded, handleMouseMove]);

  const smokeParticleTexture = useMemo(() => {
    if (!THREE_Module || !isThreeLoaded) return null;
    const canvas = document.createElement('canvas');
    const size = 256;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) return null;

    // Create a softer radial gradient
    const gradient = context.createRadialGradient(
        size / 2, size / 2, size * 0.05, // Smaller inner radius
        size / 2, size / 2, size * 0.45  // Larger outer radius for softer falloff
    );
    // Adjust alpha stops for a more gradual fade
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)'); // Slightly less opaque center
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)'); // Fade quicker
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');   // Fully transparent edge

    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    // Optional: Add subtle noise/texture if needed, but keep it soft
    // Example: very light, low-opacity noise
    /*
    context.fillStyle = 'rgba(255, 255, 255, 0.02)'; // Very low opacity noise
    for (let i = 0; i < 500; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const radius = Math.random() * 2.0; // Slightly larger noise specks
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
    }
    */

    return new THREE_Module.CanvasTexture(canvas);
  }, [isThreeLoaded]);


  const fireParticleTexture = useMemo(() => {
    if (!THREE_Module || !isThreeLoaded) return null;
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) return null;

    const gradient = context.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, 'rgba(255, 255, 220, 1.0)');
    gradient.addColorStop(0.1, 'rgba(255, 220, 150, 0.9)');
    gradient.addColorStop(0.3, 'rgba(255, 150, 50, 0.7)');
    gradient.addColorStop(0.6, 'rgba(255, 50, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(200, 0, 0, 0)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    context.strokeStyle = 'rgba(255, 255, 200, 0.1)';
    context.lineWidth = 0.5;
    for(let i = 0; i < 30; i++) {
        context.beginPath();
        const angle = Math.random() * Math.PI * 2;
        const length = size * 0.3 + Math.random() * size * 0.2;
        context.moveTo(size/2, size/2);
        context.lineTo(size/2 + Math.cos(angle) * length, size/2 + Math.sin(angle) * length);
        context.stroke();
    }
    return new THREE_Module.CanvasTexture(canvas);
  }, [isThreeLoaded]);


  const getParticleStartPosition = useCallback((
      isFire: boolean,
      sourceType: EffectiveParticleSource,
      spreadValue: number,
      cameraPositionZ: number = 5 // Default camera Z if not available
    ): { x: number; y: number; z: number } => {
    if (!THREE_Module) return { x: 0, y: -2.0, z: 0 }; // Default position if THREE not loaded

    let x = 0, y = 0, z = 0;
    // Adjust yBaseline to be relative to camera's view frustum height at z=0
    const yBaseline = -cameraPositionZ * 0.45; // A bit above the bottom edge visible to camera
    const safeSpread = isNaN(spreadValue) || !isFinite(spreadValue) ? 1.0 : spreadValue;


    switch (sourceType) {
      case "Text":
        if (textPointsRef.current.length > 0) {
          const point = textPointsRef.current[Math.floor(Math.random() * textPointsRef.current.length)];
          const pointX = isNaN(point.x) ? 0 : point.x;
          const pointY = isNaN(point.y) ? 0 : point.y;

          x = pointX + (Math.random() - 0.5) * safeSpread * 0.05; // Small spread around text point
          y = pointY + (Math.random() - 0.5) * safeSpread * 0.05;
          z = (Math.random() - 0.5) * safeSpread * 0.05;
        } else { // Fallback if text points are not ready or text is empty
          x = (Math.random() - 0.5) * safeSpread * (isFire ? 1.0 : 1.5);
          y = yBaseline + (isFire ? 0.0 : 0.5) + (Math.random() - 0.5) * 0.2; // Adjusted for baseline
          z = (Math.random() - 0.5) * safeSpread * (isFire ? 1.0 : 1.5);
        }
        break;
      case "Bottom":
        x = (Math.random() - 0.5) * BOTTOM_SOURCE_X_SPREAD; // Use defined spread for bottom source
        y = yBaseline + (isFire ? Math.random() * 0.1 : Math.random() * 0.3); // Slightly above baseline
        z = (Math.random() - 0.5) * safeSpread * 0.2; // Less Z spread for bottom source
        break;
      case "Mouse":
        const mouseX = isNaN(mouseSceneXRef.current) ? 0 : mouseSceneXRef.current;
        const mouseY = isNaN(mouseSceneYRef.current) ? 0 : mouseSceneYRef.current;
        const mouseSpreadFactor = isFire ? 0.2 : 0.3;
        x = mouseX + (Math.random() - 0.5) * safeSpread * mouseSpreadFactor;
        y = mouseY + (Math.random() - 0.5) * safeSpread * mouseSpreadFactor;
        z = (Math.random() - 0.5) * safeSpread * mouseSpreadFactor * 0.1; // Very little Z spread for mouse
        break;
      case "Center":
      default:
        x = (Math.random() - 0.5) * safeSpread * (isFire ? 1.0 : 1.5);
        y = yBaseline + (isFire ? 0.0 : 0.5) + (Math.random() - 0.5) * 0.2; // Adjusted for baseline
        z = (Math.random() - 0.5) * safeSpread * (isFire ? 1.0 : 1.5);
        break;
    }
    if (isNaN(x) || isNaN(y) || isNaN(z)) {
        return { x: 0, y: yBaseline + (isFire ? 0 : 0.5), z: 0 };
    }
    return { x, y, z };
  }, [THREE_Module]);


  const initParticles = useCallback((
    count: number,
    isFireSystem: boolean,
    baseColorVal: string,
    accentColorVal: string,
    speedVal: number,
    spreadVal: number,
    opacityVal: number,
    currentParticleSourceType: EffectiveParticleSource,
    currentBlendMode?: BlendMode
  ): { geometry: THREE.BufferGeometry | null; material: THREE.PointsMaterial | null } => {
    if (!THREE_Module || count === 0 || !cameraRef.current) return { geometry: null, material: null };
    const safeCount = Math.floor(Math.max(0, count));
    if (safeCount === 0) return { geometry: null, material: null };

    const safeSpeed = isNaN(speedVal) ? 0.01 : speedVal;
    const safeSpread = isNaN(spreadVal) ? 1.0 : spreadVal;
    const safeOpacity = isNaN(opacityVal) ? 0.5 : opacityVal;

    const geometry = new THREE_Module.BufferGeometry();
    const positions = new Float32Array(safeCount * 3);
    const velocities = new Float32Array(safeCount * 3);
    const particleColors = new Float32Array(safeCount * 3);
    const alphas = new Float32Array(safeCount);
    const particleSizes = new Float32Array(safeCount);
    const lives = new Float32Array(safeCount);
    const turbulenceOffsets = new Float32Array(safeCount * 3); // For Perlin/Simplex noise like effects
    const rotationSpeeds = new Float32Array(safeCount);

    const baseC = new THREE_Module.Color(baseColorVal);
    const accentC = new THREE_Module.Color(accentColorVal);
    const finalColor = new THREE_Module.Color();

    for (let i = 0; i < safeCount; i++) {
      const i3 = i * 3;

      const startPos = getParticleStartPosition(isFireSystem, currentParticleSourceType, safeSpread, cameraRef.current.position.z);
      positions[i3] = startPos.x;
      positions[i3 + 1] = startPos.y;
      positions[i3 + 2] = startPos.z;

      let velX, velY, velZ;
      if (isFireSystem) {
        velX = (Math.random() - 0.5) * 0.03 * safeSpread;
        velY = (Math.random() * 0.8 + 0.6) * safeSpeed * 2.0;
        velZ = (Math.random() - 0.5) * 0.03 * safeSpread;
      } else {
        velX = (Math.random() - 0.5) * 0.015 * safeSpread;
        velY = (Math.random() * 0.5 + 0.8) * safeSpeed;
        velZ = (Math.random() - 0.5) * 0.015 * safeSpread;
      }

      velocities[i3] = isNaN(velX) ? 0 : velX;
      velocities[i3 + 1] = isNaN(velY) ? (isFireSystem ? 0.02 : 0.01) : Math.max(0.001, velY); // Ensure positive upward
      velocities[i3 + 2] = isNaN(velZ) ? 0 : velZ;

      finalColor.copy(baseC).lerp(accentC, Math.random());
      particleColors[i3] = finalColor.r;
      particleColors[i3 + 1] = finalColor.g;
      particleColors[i3 + 2] = finalColor.b;

      let particleSize;
      let lifespan;
      if (isFireSystem) {
        alphas[i] = safeOpacity * (0.7 + Math.random() * 0.3);
        particleSize = (0.5 + Math.random() * 0.5) * safeSpread * 1.2;
        lifespan = BASE_FIRE_LIFESPAN * (0.5 + Math.random() * 0.8);
      } else {
        // Smoke particles start with lower opacity and larger size for softness
        alphas[i] = safeOpacity * (0.1 + Math.random() * 0.2); // Lower starting opacity
        particleSize = (1.2 + Math.random() * 1.0) * safeSpread * 1.5; // Larger base size for smoke
        lifespan = BASE_SMOKE_LIFESPAN * (0.6 + Math.random() * 0.7);
      }
      particleSizes[i] = isNaN(particleSize) ? 0.1 : Math.max(0.02, particleSize);
      // Stagger initial lifespan to prevent all particles from starting/ending at the same time
      lives[i] = (isNaN(lifespan) ? (isFireSystem ? BASE_FIRE_LIFESPAN : BASE_SMOKE_LIFESPAN) : lifespan) * Math.random();

      turbulenceOffsets[i3] = Math.random() * 2 * Math.PI;
      turbulenceOffsets[i3 + 1] = Math.random() * 2 * Math.PI;
      turbulenceOffsets[i3 + 2] = Math.random() * 100;

      rotationSpeeds[i] = (Math.random() - 0.5) * 0.05; // Slow random rotation
    }

    geometry.setAttribute('position', new THREE_Module.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE_Module.BufferAttribute(velocities, 3));
    geometry.setAttribute('color', new THREE_Module.BufferAttribute(particleColors, 3));
    geometry.setAttribute('alpha', new THREE_Module.BufferAttribute(alphas, 1));
    geometry.setAttribute('particleSize', new THREE_Module.BufferAttribute(particleSizes, 1));
    geometry.setAttribute('life', new THREE_Module.BufferAttribute(lives, 1));
    geometry.setAttribute('turbulenceOffset', new THREE_Module.BufferAttribute(turbulenceOffsets, 3));
    geometry.setAttribute('rotationSpeed', new THREE_Module.BufferAttribute(rotationSpeeds, 1));


    const material = new THREE_Module.PointsMaterial({
      map: isFireSystem ? fireParticleTexture : smokeParticleTexture,
      depthWrite: false, // Crucial for smoke layering
      transparent: true,
      vertexColors: true,
      sizeAttenuation: true,
    });


    if (THREE_Module) {
        switch (currentBlendMode) {
            case "Additive":
                material.blending = THREE_Module.AdditiveBlending;
                break;
            case "Subtractive":
                 material.blending = THREE_Module.CustomBlending;
                 material.blendEquation = THREE_Module.ReverseSubtractEquation;
                 material.blendSrc = THREE_Module.SrcAlphaFactor;
                 material.blendDst = THREE_Module.OneFactor;
                 material.blendSrcAlpha = THREE_Module.SrcAlphaFactor;
                 material.blendDstAlpha = THREE_Module.OneMinusSrcAlphaFactor;
                break;
            case "Multiply":
                material.blending = THREE_Module.MultiplyBlending;
                break;
            case "Normal":
            default:
                material.blending = THREE_Module.NormalBlending;
                break;
        }
    }


    material.onBeforeCompile = shader => {
        const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

        let vertexShader = shader.vertexShader;
        vertexShader = `
            attribute float particleSize;
            attribute float alpha;
            attribute vec3 turbulenceOffset;
            attribute float rotationSpeed;
            varying float vAlpha;
            varying float vRotation;
            uniform float time;

            ${vertexShader}
        `;

        vertexShader = vertexShader.replace(
            `#include <begin_vertex>`,
            `#include <begin_vertex>
             transformed = vec3( position );
             vAlpha = alpha;
             vRotation = time * rotationSpeed;
             `
        );

        // Custom point size calculation logic
        vertexShader = vertexShader.replace(
          `#include <project_vertex>`,
          `
            vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );
            gl_Position = projectionMatrix * mvPosition;

            // Base size influenced by attribute, pixel ratio, and a base multiplier
            // Larger base multiplier for smoke-like appearance
            float basePointSize = particleSize * ${pixelRatio.toFixed(1)} * ${isFireSystem ? '1.3' : '2.5'}; // Larger base multiplier for smoke

            #ifdef USE_SIZEATTENUATION
                // Perspective scaling
                bool isPerspective = isPerspectiveMatrix( projectionMatrix );
                float pointScale = 1.0;
                if (isPerspective) {
                   // Use a gentle perspective scaling to prevent distant particles from becoming tiny dots
                   pointScale = clamp(100.0 / -mvPosition.z, 0.5, 5.0);
                }
                basePointSize *= pointScale;
            #endif

            // Ensure minimum size and apply final point size
            gl_PointSize = max(1.0, basePointSize);
            `
        );

        // Remove the default size calculations to avoid conflicts
        vertexShader = vertexShader.replace(/gl_PointSize\s*=\s*size\s*;\s*#ifdef USE_SIZEATTENUATION[\s\S]*?#endif/g, "");
        vertexShader = vertexShader.replace(/gl_PointSize\s*=\s*size\s*;/g, "");

        shader.vertexShader = vertexShader;

        shader.fragmentShader = `
            varying float vAlpha;
            varying float vRotation;
            ${shader.fragmentShader}
        `
        .replace(
            `#include <color_fragment>`,
            `#include <color_fragment>
             diffuseColor.a *= vAlpha;
             `
        )
        .replace(
            `#include <map_particle_fragment>`,
            `
             #ifdef USE_MAP
                vec2 center = vec2(0.5, 0.5);
                float cos_rot = cos(vRotation);
                float sin_rot = sin(vRotation);
                vec2 rotated_uv = mat2(cos_rot, -sin_rot, sin_rot, cos_rot) * (gl_PointCoord - center) + center;

                vec4 mapTexel = texture2D( map, rotated_uv );
                diffuseColor *= mapTexel;
             #endif
             `
        );
        shader.uniforms.time = { value: 0.0 };
    };

    return { geometry, material };
  }, [THREE_Module, smokeParticleTexture, fireParticleTexture, getParticleStartPosition]);


  const debouncedUpdateParticles = useCallback(
    debounce(() => {
      if (!mountRef.current || !isThreeLoaded || !THREE_Module || !sceneRef.current) return;
      const scene = sceneRef.current;

      const updateOrCreateParticles = (
        particlesRef: React.MutableRefObject<THREE.Points | null>,
        isEnabled: boolean,
        count: number,
        isFire: boolean,
        baseColor: string,
        accentColor: string,
        speed: number,
        spread: number,
        opacity: number,
        sourceType: EffectiveParticleSource,
        blendMode: BlendMode
      ) => {
        if (particlesRef.current) {
          scene.remove(particlesRef.current);
          particlesRef.current.geometry.dispose();
          if (Array.isArray(particlesRef.current.material)) {
            particlesRef.current.material.forEach(m => m.dispose());
          } else {
             (particlesRef.current.material as THREE.Material).dispose();
          }
          particlesRef.current = null;
        }

        if (isEnabled && count > 0) {
          const { geometry, material } = initParticles(
              count, isFire, baseColor, accentColor, speed, spread, opacity, sourceType, blendMode
          );
          if (geometry && material) {
            particlesRef.current = new THREE_Module.Points(geometry, material);
            scene.add(particlesRef.current);
          }
        }
      };

      updateOrCreateParticles(
        smokeParticlesRef, isSmokeEnabled, actualSmokeParticleCount, false,
        smokeBaseColor, smokeAccentColor, smokeSpeed, smokeSpread, smokeOpacity,
        effectiveSmokeSource, smokeBlendMode
      );

      updateOrCreateParticles(
        fireParticlesRef, isFireEnabled, actualFireParticleCount, true,
        fireBaseColor, fireAccentColor, fireSpeed, fireSpread, fireOpacity,
        effectiveFireSource, fireBlendMode
      );
    }, 300),
    [
      isThreeLoaded, THREE_Module, initParticles,
      isSmokeEnabled, actualSmokeParticleCount, smokeBaseColor, smokeAccentColor, smokeSpeed, smokeSpread, smokeOpacity, effectiveSmokeSource, smokeBlendMode,
      isFireEnabled, actualFireParticleCount, fireBaseColor, fireAccentColor, fireSpeed, fireSpread, fireOpacity, effectiveFireSource, fireBlendMode,
    ]
  );


   useEffect(() => {
     if (!mountRef.current || !isThreeLoaded || !THREE_Module ) return;
     const currentMountRef = mountRef.current;

     if (!sceneRef.current) sceneRef.current = new THREE_Module.Scene();
     if (!cameraRef.current) {
       cameraRef.current = new THREE_Module.PerspectiveCamera(
         75,
         currentMountRef.clientWidth / currentMountRef.clientHeight,
         0.1,
         100
       );
       cameraRef.current.position.z = 5;
     }
     if (!rendererRef.current) {
       try {
         rendererRef.current = new THREE_Module.WebGLRenderer({
           antialias: true,
           alpha: true,
           preserveDrawingBuffer: true
         });
         rendererRef.current.setSize(currentMountRef.clientWidth, currentMountRef.clientHeight);
         rendererRef.current.setPixelRatio(typeof window !== 'undefined' ? window.devicePixelRatio : 1);
         currentMountRef.appendChild(rendererRef.current.domElement);
         if (onCanvasReady) onCanvasReady(rendererRef.current.domElement);
       } catch (error) {
          console.error("Error creating WebGLRenderer:", error);
          setLoadError("Could not initialize 3D graphics. Your browser might not support WebGL2 or it might be disabled.");
          return;
       }
     }

     debouncedUpdateParticles();

     const clock = new THREE_Module.Clock();
     let time = 0;

     const animate = () => {
       if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !THREE_Module) {
         if(animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
         animationFrameIdRef.current = null;
         return;
       }
       animationFrameIdRef.current = requestAnimationFrame(animate);

       const delta = clock.getDelta();
       const safeDelta = Math.min(delta, 0.05);
       if (safeDelta <= 0) return;

       time += safeDelta;

        if (smokeParticlesRef.current?.material && (smokeParticlesRef.current.material as any).uniforms?.time) {
          (smokeParticlesRef.current.material as any).uniforms.time.value = time;
        }
        if (fireParticlesRef.current?.material && (fireParticlesRef.current.material as any).uniforms?.time) {
            (fireParticlesRef.current.material as any).uniforms.time.value = time;
        }


       if (isPlaying) {
          const currentWindEffectX = (isNaN(windDirectionX) ? 0 : windDirectionX) * (isNaN(windStrength) ? 0 : windStrength) * safeDelta * 60;
          const timeFactorSmoke = time * 0.8;
          const timeFactorFire = time * 1.2;

          const currentSmokeBaseC = new THREE_Module.Color(smokeBaseColor);
          const currentSmokeAccentC = new THREE_Module.Color(smokeAccentColor);
          const finalSmokeColor = new THREE_Module.Color();

          const currentFireBaseC = new THREE_Module.Color(fireBaseColor);
          const currentFireAccentC = new THREE_Module.Color(fireAccentColor);
          const finalFireColor = new THREE_Module.Color();


         // --- SMOKE PARTICLE UPDATE ---
          if (smokeParticlesRef.current && isSmokeEnabled && actualSmokeParticleCount > 0) {
             const geom = smokeParticlesRef.current.geometry as THREE.BufferGeometry;
             const positions = geom.attributes.position as THREE.BufferAttribute | undefined;
             const velocities = geom.attributes.velocity as THREE.BufferAttribute | undefined;
             const alphas = geom.attributes.alpha as THREE.BufferAttribute | undefined;
             const particleSizesAttr = geom.attributes.particleSize as THREE.BufferAttribute | undefined;
             const lives = geom.attributes.life as THREE.BufferAttribute | undefined;
             const colorsAttr = geom.attributes.color as THREE.BufferAttribute | undefined;
             const turbulenceOffsets = geom.attributes.turbulenceOffset as THREE.BufferAttribute | undefined;

             if (positions && velocities && alphas && particleSizesAttr && lives && colorsAttr && turbulenceOffsets) {
                const posArray = positions.array as Float32Array;
                const velArray = velocities.array as Float32Array;
                const alphaArray = alphas.array as Float32Array;
                const sizeArray = particleSizesAttr.array as Float32Array;
                const lifeArray = lives.array as Float32Array;
                const colorArray = colorsAttr.array as Float32Array;
                const turbOffsetArray = turbulenceOffsets.array as Float32Array;

                const safeSmokeDissipation = isNaN(smokeDissipation ?? 0) ? 0.2 : (smokeDissipation ?? 0);
                const baseLifespan = BASE_SMOKE_LIFESPAN;
                const lifeDecreaseFactor = safeDelta * (10 + safeSmokeDissipation * 30);
                const safeSmokeBuoyancy = isNaN(smokeBuoyancy ?? 0) ? 0.005 : (smokeBuoyancy ?? 0);
                const safeSmokeTurbulence = isNaN(smokeTurbulence) ? 1.0 : smokeTurbulence;
                const turbulenceStrength = safeSmokeTurbulence * 0.008;
                const turbulenceScale = 0.6;
                const safeSmokeOpacity = isNaN(smokeOpacity) ? 0.6 : smokeOpacity;
                const safeSmokeSpread = isNaN(smokeSpread) ? 1.0 : smokeSpread;

                const camZ = cameraRef.current.position.z;
                const resetHeight = camZ * 0.7; // Define reset boundary relative to camera

                for (let i = 0; i < positions.count; i++) {
                    const i3 = i * 3;
                    const currentLife = lifeArray[i] - lifeDecreaseFactor;
                    lifeArray[i] = currentLife;

                    if (currentLife <= 0 || posArray[i3 + 1] > resetHeight) {
                        const startPos = getParticleStartPosition(false, effectiveSmokeSource, safeSmokeSpread, camZ);
                        posArray[i3] = startPos.x;
                        posArray[i3 + 1] = startPos.y;
                        posArray[i3 + 2] = startPos.z;

                        const safeSmokeSpeed = isNaN(smokeSpeed) ? 0.01 : smokeSpeed;
                        velArray[i3] = (Math.random() - 0.5) * 0.015 * safeSmokeSpread;
                        velArray[i3 + 1] = (Math.random() * 0.5 + 0.8) * safeSmokeSpeed;
                        velArray[i3 + 2] = (Math.random() - 0.5) * 0.015 * safeSmokeSpread;

                        // Reset with randomized lifespan, not just full * random
                        lifeArray[i] = baseLifespan * (0.1 + Math.random() * 0.9); // Start at different life stages

                        finalSmokeColor.copy(currentSmokeBaseC).lerp(currentSmokeAccentC, Math.random());
                        colorArray[i3] = finalSmokeColor.r;
                        colorArray[i3 + 1] = finalSmokeColor.g;
                        colorArray[i3 + 2] = finalSmokeColor.b;

                        // Reset with softer initial alpha
                        alphaArray[i] = safeSmokeOpacity * (0.1 + Math.random() * 0.2);
                        // Reset with larger base size
                        sizeArray[i] = (1.2 + Math.random() * 1.0) * safeSmokeSpread * 1.5;

                    } else {
                        const lifeRatio = Math.max(0, Math.min(1, currentLife / Math.max(0.01, baseLifespan)));

                        const tx = turbOffsetArray[i3];
                        const ty = turbOffsetArray[i3 + 1];
                        const tz = turbOffsetArray[i3 + 2];
                        const noiseTime = timeFactorSmoke + tz * 0.01;

                        // More pronounced turbulence effect
                        const turbX = Math.sin(posArray[i3 + 1] * turbulenceScale * 0.5 + noiseTime + tx + Math.cos(posArray[i3] * turbulenceScale * 0.3 + noiseTime)) * turbulenceStrength * 1.5;
                        const turbY = Math.cos(posArray[i3] * turbulenceScale * 0.5 + noiseTime + ty + Math.sin(posArray[i3+1] * turbulenceScale * 0.2 + noiseTime)) * turbulenceStrength * 1.5;
                        const turbZ = Math.sin(posArray[i3 + 2] * turbulenceScale + noiseTime + tx + ty) * turbulenceStrength * 0.8;

                        velArray[i3 + 1] += safeSmokeBuoyancy * safeDelta * 60;
                        velArray[i3 + 1] *= 0.98;
                        velArray[i3] *= 0.97;
                        velArray[i3 + 2] *= 0.97;

                        posArray[i3] += (velArray[i3] + turbX + currentWindEffectX) * safeDelta * 60;
                        posArray[i3 + 1] += (velArray[i3 + 1] + turbY) * safeDelta * 60;
                        posArray[i3 + 2] += (velArray[i3 + 2] + turbZ) * safeDelta * 60;


                        // Smoother fade in/out based on lifeRatio
                        const fadeInEnd = 0.9; // Fully visible by 90% life remaining
                        const fadeOutStart = 0.4; // Start fading out at 40% life remaining
                        let alphaMultiplier = 1.0;
                         if (lifeRatio > fadeInEnd) { // Fading in
                            alphaMultiplier = THREE_Module.MathUtils.smoothstep(lifeRatio, 1.0, fadeInEnd);
                        } else if (lifeRatio < fadeOutStart) { // Fading out
                            alphaMultiplier = THREE_Module.MathUtils.smoothstep(lifeRatio, 0.0, fadeOutStart);
                        }
                        const baseAlphaRandomFactor = (turbOffsetArray[i3+2] % 100) / 100;
                        const baseAlpha = safeSmokeOpacity * (0.1 + baseAlphaRandomFactor * 0.2); // Use the softer base alpha
                        const calculatedAlpha = baseAlpha * alphaMultiplier;
                        alphaArray[i] = isNaN(calculatedAlpha) ? 0 : Math.max(0, Math.min(safeSmokeOpacity, calculatedAlpha));

                        // Size increases slightly then decreases
                        const sizePeak = 0.7; // Peak size around 70% life remaining
                        const sizeFactor = 1.0 + 1.5 * Math.sin(Math.min(1, lifeRatio / sizePeak) * Math.PI * 0.5) // Grows
                                           * Math.pow(Math.max(0, (lifeRatio - (1 - sizePeak)) / sizePeak), 0.5); // Then shrinks
                        const baseSizeRandomFactor = (turbOffsetArray[i3+1] % (2*Math.PI)) / (2*Math.PI);
                        const baseSize = (1.2 + baseSizeRandomFactor * 1.0) * safeSmokeSpread * 1.5; // Use the larger base size
                        const calculatedSize = baseSize * sizeFactor;
                        sizeArray[i] = isNaN(calculatedSize) ? 0.02 : Math.max(0.02, calculatedSize);
                    }
                 }
                 positions.needsUpdate = true;
                 velocities.needsUpdate = true;
                 alphas.needsUpdate = true;
                 particleSizesAttr.needsUpdate = true;
                 lives.needsUpdate = true;
                 colorsAttr.needsUpdate = true;
             }
          }


         // --- FIRE PARTICLE UPDATE ---
         if (fireParticlesRef.current && isFireEnabled && actualFireParticleCount > 0) {
             const geom = fireParticlesRef.current.geometry as THREE.BufferGeometry;
             const positions = geom.attributes.position as THREE.BufferAttribute | undefined;
             const velocities = geom.attributes.velocity as THREE.BufferAttribute | undefined;
             const alphas = geom.attributes.alpha as THREE.BufferAttribute | undefined;
             const particleSizesAttr = geom.attributes.particleSize as THREE.BufferAttribute | undefined;
             const lives = geom.attributes.life as THREE.BufferAttribute | undefined;
             const colorsAttr = geom.attributes.color as THREE.BufferAttribute | undefined;
             const turbulenceOffsets = geom.attributes.turbulenceOffset as THREE.BufferAttribute | undefined;

             if (positions && velocities && alphas && particleSizesAttr && lives && colorsAttr && turbulenceOffsets) {
                 const posArray = positions.array as Float32Array;
                 const velArray = velocities.array as Float32Array;
                 const alphaArray = alphas.array as Float32Array;
                 const sizeArray = particleSizesAttr.array as Float32Array;
                 const lifeArray = lives.array as Float32Array;
                 const colorArray = colorsAttr.array as Float32Array;
                 const turbOffsetArray = turbulenceOffsets.array as Float32Array;

                 const lifeDecreaseFactor = safeDelta * 15; // Fire lives shorter, fades faster
                 const safeFireTurbulence = isNaN(fireTurbulence) ? 1.0 : fireTurbulence;
                 const fireTurbulenceStrength = safeFireTurbulence * 0.015;
                 const fireTurbulenceScale = 0.8;
                 const safeFireOpacity = isNaN(fireOpacity) ? 0.7 : fireOpacity;
                 const safeFireSpread = isNaN(fireSpread) ? 1.5 : fireSpread;
                 const baseLifespan = BASE_FIRE_LIFESPAN;

                 const camZ = cameraRef.current.position.z;
                 const resetHeight = camZ * 0.8; // Fire might rise higher before reset

                 for (let i = 0; i < positions.count; i++) {
                    const i3 = i * 3;
                    const currentLife = lifeArray[i] - lifeDecreaseFactor;
                    lifeArray[i] = currentLife;

                    if (currentLife <= 0 || posArray[i3 + 1] > resetHeight) {
                        const startPos = getParticleStartPosition(true, effectiveFireSource, safeFireSpread, camZ);
                        posArray[i3] = startPos.x;
                        posArray[i3 + 1] = startPos.y;
                        posArray[i3 + 2] = startPos.z;

                        const safeFireSpeed = isNaN(fireSpeed) ? 0.03 : fireSpeed;
                        velArray[i3] = (Math.random() - 0.5) * 0.03 * safeFireSpread;
                        velArray[i3 + 1] = (Math.random() * 0.8 + 0.6) * safeFireSpeed * 2.0;
                        velArray[i3 + 2] = (Math.random() - 0.5) * 0.03 * safeFireSpread;

                        lifeArray[i] = baseLifespan * (0.1 + Math.random() * 0.9); // Start at different life stages

                        finalFireColor.copy(currentFireBaseC).lerp(currentFireAccentC, Math.random());
                        colorArray[i3] = finalFireColor.r;
                        colorArray[i3 + 1] = finalFireColor.g;
                        colorArray[i3 + 2] = finalFireColor.b;

                        alphaArray[i] = safeFireOpacity * (0.7 + Math.random() * 0.3);
                        sizeArray[i] = (0.5 + Math.random() * 0.5) * safeFireSpread * 1.2;

                    } else {
                        const lifeRatio = Math.max(0, Math.min(1, currentLife / Math.max(0.01, baseLifespan)));

                        const tx = turbOffsetArray[i3];
                        const ty = turbOffsetArray[i3 + 1];
                        const tz = turbOffsetArray[i3 + 2];
                        const noiseTime = timeFactorFire + tz * 0.01;

                        const turbX = Math.sin(posArray[i3 + 1] * fireTurbulenceScale + noiseTime + tx) * fireTurbulenceStrength * 1.2;
                        const turbY = Math.cos(posArray[i3] * fireTurbulenceScale + noiseTime + ty) * fireTurbulenceStrength * 2.0;
                        const turbZ = Math.sin(posArray[i3 + 2] * fireTurbulenceScale + noiseTime + tx + ty) * fireTurbulenceStrength * 0.8;

                        velArray[i3 + 1] *= 0.99; // Less vertical damping
                        velArray[i3] *= 0.96;
                        velArray[i3 + 2] *= 0.96;

                        posArray[i3] += (velArray[i3] + turbX + currentWindEffectX * 0.7) * safeDelta * 60;
                        posArray[i3 + 1] += (velArray[i3 + 1] + turbY) * safeDelta * 60;
                        posArray[i3 + 2] += (velArray[i3 + 2] + turbZ) * safeDelta * 60;

                        const fadeOutPower = 1.8; // Fire fades more sharply
                        const baseAlphaRandomFactor = (turbOffsetArray[i3+2] % 100) / 100;
                        const baseAlpha = safeFireOpacity * (0.7 + baseAlphaRandomFactor * 0.3);
                        const calculatedAlpha = baseAlpha * Math.pow(lifeRatio, fadeOutPower);
                         alphaArray[i] = isNaN(calculatedAlpha) ? 0 : Math.max(0, Math.min(safeFireOpacity, calculatedAlpha));

                        const sizeFactor = Math.max(0.1, lifeRatio * 0.9 + 0.1); // Shrinks more as it dies
                        const baseSizeRandomFactor = (turbOffsetArray[i3+1] % (2*Math.PI)) / (2*Math.PI);
                        const baseSize = (0.5 + baseSizeRandomFactor * 0.5) * safeFireSpread * 1.2;
                        const calculatedSize = baseSize * sizeFactor;
                        sizeArray[i] = isNaN(calculatedSize) ? 0.02 : Math.max(0.02, calculatedSize);
                    }
                 }
                 positions.needsUpdate = true;
                 velocities.needsUpdate = true;
                 alphas.needsUpdate = true;
                 particleSizesAttr.needsUpdate = true;
                 lives.needsUpdate = true;
                 colorsAttr.needsUpdate = true;
             }
         }
       }

       // --- Render Scene ---
       try {
           rendererRef.current.render(sceneRef.current, cameraRef.current);
       } catch(e) {
           console.error("Error during render:", e);
       }
     };
     animate();


     const handleResize = debounce(() => {
       if (mountRef.current && rendererRef.current && cameraRef.current && THREE_Module) {
         const width = mountRef.current.clientWidth;
         const height = mountRef.current.clientHeight;
         if (width > 0 && height > 0) {
             const currentSize = rendererRef.current.getSize(new THREE_Module.Vector2());
             if (currentSize.width !== width || currentSize.height !== height) {
                 rendererRef.current.setSize(width, height);
             }
             if (cameraRef.current.aspect !== width / height) {
                 cameraRef.current.aspect = width / height;
                 cameraRef.current.updateProjectionMatrix();
             }
         }
       }
     }, 250);

     window.addEventListener('resize', handleResize);

     return () => {
       if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
       animationFrameIdRef.current = null;
       window.removeEventListener('resize', handleResize);
     };
   }, [
     isThreeLoaded, THREE_Module, onCanvasReady,
     debouncedUpdateParticles,
     backgroundColor, isPlaying,
     windDirectionX, windStrength,
     smokeBaseColor, smokeAccentColor, smokeOpacity, smokeTurbulence, smokeDissipation, smokeBuoyancy, smokeSpeed, smokeSpread,
     fireBaseColor, fireAccentColor, fireOpacity, fireTurbulence, fireSpeed, fireSpread,
     isSmokeEnabled, isFireEnabled, actualSmokeParticleCount, actualFireParticleCount,
     effectiveSmokeSource, effectiveFireSource,
     getParticleStartPosition
   ]);


  useEffect(() => {
    if (smokeParticlesRef.current?.material && THREE_Module && isThreeLoaded) {
      const material = smokeParticlesRef.current.material as THREE.PointsMaterial;
      let needsUpdate = false;
        if (smokeBlendMode === "Subtractive") {
            if (material.blending !== THREE_Module.CustomBlending || material.blendEquation !== THREE_Module.ReverseSubtractEquation) {
                material.blending = THREE_Module.CustomBlending;
                material.blendEquation = THREE_Module.ReverseSubtractEquation;
                material.blendSrc = THREE_Module.SrcAlphaFactor;
                material.blendDst = THREE_Module.OneFactor;
                material.blendSrcAlpha = THREE_Module.SrcAlphaFactor;
                material.blendDstAlpha = THREE_Module.OneMinusSrcAlphaFactor;
                needsUpdate = true;
            }
        } else {
            let newBlendingMode = THREE_Module.NormalBlending;
            switch(smokeBlendMode) {
                case "Additive": newBlendingMode = THREE_Module.AdditiveBlending; break;
                case "Multiply": newBlendingMode = THREE_Module.MultiplyBlending; break;
                case "Normal": default: newBlendingMode = THREE_Module.NormalBlending; break;
            }
            if (material.blending !== newBlendingMode) {
                material.blending = newBlendingMode;
                material.blendEquation = THREE_Module.AddEquation;
                material.blendSrc = THREE_Module.SrcAlphaFactor;
                material.blendDst = THREE_Module.OneMinusSrcAlphaFactor;
                 needsUpdate = true;
            }
        }
      if (needsUpdate) material.needsUpdate = true;
    }
  }, [smokeBlendMode, isThreeLoaded, THREE_Module]);

  useEffect(() => {
    if (fireParticlesRef.current?.material && THREE_Module && isThreeLoaded) {
      const material = fireParticlesRef.current.material as THREE.PointsMaterial;
       let needsUpdate = false;
        if (fireBlendMode === "Subtractive") {
           if (material.blending !== THREE_Module.CustomBlending || material.blendEquation !== THREE_Module.ReverseSubtractEquation) {
               material.blending = THREE_Module.CustomBlending;
               material.blendEquation = THREE_Module.ReverseSubtractEquation;
               material.blendSrc = THREE_Module.SrcAlphaFactor;
               material.blendDst = THREE_Module.OneFactor;
               material.blendSrcAlpha = THREE_Module.SrcAlphaFactor;
               material.blendDstAlpha = THREE_Module.OneMinusSrcAlphaFactor;
               needsUpdate = true;
           }
        } else {
            let newBlendingMode = THREE_Module.AdditiveBlending; // Default for fire
            switch(fireBlendMode) {
                case "Additive": newBlendingMode = THREE_Module.AdditiveBlending; break;
                case "Multiply": newBlendingMode = THREE_Module.MultiplyBlending; break;
                case "Normal": newBlendingMode = THREE_Module.NormalBlending; break;
                default: newBlendingMode = THREE_Module.AdditiveBlending; break;
            }
             if (material.blending !== newBlendingMode) {
                material.blending = newBlendingMode;
                material.blendEquation = THREE_Module.AddEquation;
                material.blendSrc = THREE_Module.SrcAlphaFactor;
                material.blendDst = THREE_Module.OneMinusSrcAlphaFactor;
                 needsUpdate = true;
            }
        }
      if (needsUpdate) material.needsUpdate = true;
    }
  }, [fireBlendMode, isThreeLoaded, THREE_Module]);


   useEffect(() => {
     if (rendererRef.current && THREE_Module && isThreeLoaded) {
        try {
           rendererRef.current.setClearColor(new THREE_Module.Color(backgroundColor));
        } catch (e) {
            console.error("Invalid background color value:", backgroundColor, e);
        }
     }
   }, [backgroundColor, THREE_Module, isThreeLoaded]);


   if (loadError) {
     return (
       <div className="w-full h-full flex items-center justify-center p-4 bg-destructive/10 text-destructive-foreground" role="alert">
         <div className="text-center">
           <p className="font-semibold text-lg">Error Loading Simulation</p>
           <p>{loadError}</p>
         </div>
       </div>
     );
   }

   if (!isThreeLoaded) {
     return (
       <div className="w-full h-full flex items-center justify-center" data-ai-hint="loading indicator">
         <p className="text-lg animate-pulse">Loading 3D Simulation...</p>
       </div>
     );
   }

   return <div ref={mountRef} className="w-full h-full" role="img" aria-label="Smoke and fire simulation canvas" data-ai-hint="smoke fire particles simulation" />;
 };

 export default SmokeCanvas;
