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
  smokeSource?: ParticleSource; // This is the prop passed from controls
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
  fireParticleSource?: ParticleSource; // This is the prop passed from controls
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

const MAX_SMOKE_PARTICLES = 8000; // Adjusted based on previous user request
const MAX_FIRE_PARTICLES = 5000; // Adjusted based on previous user request

const BASE_FIRE_LIFESPAN = 60;
const BASE_SMOKE_LIFESPAN = 200;
const BOTTOM_SOURCE_X_SPREAD = 12.0; // Increased spread for bottom source

const TEXT_CANVAS_WIDTH = 512;
const TEXT_CANVAS_HEIGHT = 128;
const TEXT_FONT_SIZE = 80;
const TEXT_FONT = `bold ${TEXT_FONT_SIZE}px Arial, sans-serif`;
const TEXT_SAMPLE_DENSITY = 0.3;
const TEXT_SHAPE_SCALE = 0.02;

// Define a type for the effective source which could be text-based
type EffectiveParticleSource = ParticleSource | "Text";

const SmokeCanvas: React.FC<SmokeCanvasProps> = ({
  isSmokeEnabled = true,
  smokeDensity = 6500, // Default based on previous request
  smokeBaseColor = '#FFFFFF',
  smokeAccentColor = '#E0E0E0',
  smokeSpeed = 0.015,
  smokeSpread = 1.0, // Default based on previous request
  smokeBlendMode = "Normal",
  smokeSource: smokeSourceProp = "Bottom", // Rename prop to avoid conflict
  smokeOpacity = 0.6,
  smokeTurbulence = 1.2,
  smokeDissipation = 0.2,
  smokeBuoyancy = 0.005,
  particleText = "",

  isFireEnabled = false,
  fireBaseColor = '#FFA500',
  fireAccentColor = '#FFD700',
  fireDensity = 800,
  fireSpeed = 0.03,
  fireSpread = 1.5,
  fireParticleSource: fireSourceProp = "Bottom", // Rename prop to avoid conflict
  fireBlendMode = "Additive",
  fireOpacity = 0.7,
  fireTurbulence = 1.0,

  backgroundColor = '#000000',
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

  // Determine the effective source based on particleText
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
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const points: Array<{ x: number; y: number }> = [];
    const step = 3; // Adjusted step for performance
    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        const alphaIndex = (y * canvas.width + x) * 4 + 3;
        if (data[alphaIndex] > 128 && Math.random() < TEXT_SAMPLE_DENSITY) {
          // Center the points and apply scale
          const sceneX = (x - canvas.width / 2) * TEXT_SHAPE_SCALE;
          // Invert Y because canvas Y is top-down, Three.js Y is bottom-up
          const sceneY = -(y - canvas.height / 2) * TEXT_SHAPE_SCALE;
          points.push({ x: sceneX, y: sceneY });
        }
      }
    }
    textPointsRef.current = points;
    console.log(`Generated ${points.length} points for text: "${text}"`); // Debug log
  }, []);


  useEffect(() => {
    // Use debounce to avoid rapid regeneration if text input is fast
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
     if (canvasBounds.width === 0 || canvasBounds.height === 0) return;
     // Normalize mouse coordinates to NDC (-1 to +1)
     const mouseXNDC = ((event.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
     const mouseYNDC = -((event.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;

     // Unproject NDC coordinates to world space at z=0 plane
     const vec = new THREE_Module.Vector3(mouseXNDC, mouseYNDC, 0.5); // z=0.5 is between near and far plane
     vec.unproject(cameraRef.current); // Unproject the vector
     const dir = vec.sub(cameraRef.current.position).normalize(); // Direction from camera to point
     // Calculate distance to z=0 plane
     if (Math.abs(dir.z) < 1e-6) return; // Avoid division by zero if parallel to plane
     const distance = -cameraRef.current.position.z / dir.z;
     if (isNaN(distance) || !isFinite(distance) || distance < 0) return; // Ensure valid distance

     // Calculate intersection point on z=0 plane
     const pos = cameraRef.current.position.clone().add(dir.multiplyScalar(distance));
     if (isNaN(pos.x) || isNaN(pos.y)) return; // Check for NaN results

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
    canvas.width = 128; // Increased resolution
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (!context) return null;
    const gradient = context.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0,
      canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    // More realistic smoke gradient: denser center, softer edges
    gradient.addColorStop(0, 'rgba(255,255,255,0.7)'); // Denser center
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.6)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.3)'); // Gradual fade
    gradient.addColorStop(1, 'rgba(255,255,255,0)'); // Fully transparent edge
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    return new THREE_Module.CanvasTexture(canvas);
  }, [isThreeLoaded]);

  const fireParticleTexture = useMemo(() => {
    if (!THREE_Module || !isThreeLoaded) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    if (!context) return null;
    const gradient = context.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0,
      canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    // Sharper, brighter fire gradient
    gradient.addColorStop(0, 'rgba(255, 255, 220, 0.9)'); // Bright yellow-white core
    gradient.addColorStop(0.15, 'rgba(255, 200, 100, 0.8)'); // Orange transition
    gradient.addColorStop(0.4, 'rgba(255, 100, 0, 0.5)'); // Reddish outer part
    gradient.addColorStop(1, 'rgba(200, 0, 0, 0)'); // Fading red edge
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    return new THREE_Module.CanvasTexture(canvas);
  }, [isThreeLoaded]);


  // Define getParticleStartPosition within the component scope or pass necessary refs/state
  const getParticleStartPosition = useCallback((
      isFire: boolean,
      sourceType: EffectiveParticleSource,
      spreadValue: number,
      cameraPositionZ: number = 5 // Provide default or pass actual camera Z
    ): { x: number; y: number; z: number } => {
    if (!THREE_Module) return { x: 0, y: -2.0, z: 0 }; // Default if THREE not loaded

    let x = 0, y = 0, z = 0;
    // Adjust yBaseline based on camera position to keep it near the bottom of the view
    const yBaseline = -cameraPositionZ * 0.45; // Adjust multiplier as needed
    const safeSpread = isNaN(spreadValue) || !isFinite(spreadValue) ? 1.0 : spreadValue;

    switch (sourceType) {
      case "Text":
        if (textPointsRef.current.length > 0) {
          const point = textPointsRef.current[Math.floor(Math.random() * textPointsRef.current.length)];
          const pointX = isNaN(point.x) ? 0 : point.x;
          const pointY = isNaN(point.y) ? 0 : point.y;
          // Add slight random offset based on spread
          x = pointX + (Math.random() - 0.5) * safeSpread * 0.05;
          y = pointY + (Math.random() - 0.5) * safeSpread * 0.05;
          z = (Math.random() - 0.5) * safeSpread * 0.05; // Small depth variation
        } else {
          // Fallback if text points are not available (e.g., empty text)
          // Use Center logic as a fallback
          x = (Math.random() - 0.5) * safeSpread * (isFire ? 1.0 : 1.5);
          y = yBaseline + (isFire ? 0.0 : 0.5) + (Math.random() - 0.5) * 0.2;
          z = (Math.random() - 0.5) * safeSpread * (isFire ? 1.0 : 1.5);
        }
        break;
      case "Bottom":
         // Spread particles horizontally across the bottom
        x = (Math.random() - 0.5) * BOTTOM_SOURCE_X_SPREAD;
        // Start slightly above the baseline with minimal vertical spread
        y = yBaseline + (isFire ? Math.random() * 0.1 : Math.random() * 0.3);
        // Minimal depth spread for bottom source
        z = (Math.random() - 0.5) * safeSpread * 0.2;
        break;
      case "Mouse":
        const mouseX = isNaN(mouseSceneXRef.current) ? 0 : mouseSceneXRef.current;
        const mouseY = isNaN(mouseSceneYRef.current) ? 0 : mouseSceneYRef.current;
        const mouseSpreadFactor = isFire ? 0.2 : 0.3;
        x = mouseX + (Math.random() - 0.5) * safeSpread * mouseSpreadFactor;
        y = mouseY + (Math.random() - 0.5) * safeSpread * mouseSpreadFactor;
        z = (Math.random() - 0.5) * safeSpread * mouseSpreadFactor * 0.1; // Less depth spread
        break;
      case "Center":
      default:
        // Spread around the center, slightly above baseline for smoke
        x = (Math.random() - 0.5) * safeSpread * (isFire ? 1.0 : 1.5);
        y = yBaseline + (isFire ? 0.0 : 0.5) + (Math.random() - 0.5) * 0.2; // Smoke starts higher
        z = (Math.random() - 0.5) * safeSpread * (isFire ? 1.0 : 1.5);
        break;
    }

    // Final check for NaN values
    if (isNaN(x) || isNaN(y) || isNaN(z)) {
        console.warn("NaN detected in particle start position, resetting to default.");
        return { x: 0, y: yBaseline + (isFire ? 0 : 0.5), z: 0 };
    }
    return { x, y, z };
  }, [THREE_Module]); // Add dependencies if mouse refs or other state is used directly


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
    const turbulenceOffsets = new Float32Array(safeCount * 3); // For unique turbulence per particle

    const baseC = new THREE_Module.Color(baseColorVal);
    const accentC = new THREE_Module.Color(accentColorVal);
    const finalColor = new THREE_Module.Color();

    for (let i = 0; i < safeCount; i++) {
      const i3 = i * 3;

      // Get start position using the determined effective source
      const startPos = getParticleStartPosition(isFireSystem, currentParticleSourceType, safeSpread, cameraRef.current.position.z);
      positions[i3] = startPos.x;
      positions[i3 + 1] = startPos.y;
      positions[i3 + 2] = startPos.z;

      // Initial velocities
      let velX, velY, velZ;
      if (isFireSystem) {
        // Fire: stronger upward, wider spread
        velX = (Math.random() - 0.5) * 0.03 * safeSpread;
        velY = (Math.random() * 0.8 + 0.6) * safeSpeed * 2.0; // Stronger base Y velocity
        velZ = (Math.random() - 0.5) * 0.03 * safeSpread;
      } else { // Smoke
        // Smoke: slower upward, tighter horizontal spread initially
        velX = (Math.random() - 0.5) * 0.015 * safeSpread;
        velY = (Math.random() * 0.5 + 0.8) * safeSpeed; // Ensure positive Y velocity
        velZ = (Math.random() - 0.5) * 0.015 * safeSpread;
      }

      velocities[i3] = isNaN(velX) ? 0 : velX;
      velocities[i3 + 1] = isNaN(velY) ? (isFireSystem ? 0.02 : 0.01) : Math.max(0.001, velY); // Ensure minimum upward velocity
      velocities[i3 + 2] = isNaN(velZ) ? 0 : velZ;


      // Colors
      finalColor.copy(baseC).lerp(accentC, Math.random()); // Blend base and accent
      particleColors[i3] = finalColor.r;
      particleColors[i3 + 1] = finalColor.g;
      particleColors[i3 + 2] = finalColor.b;

      // Alpha, Size, Life
      let particleSize;
      let lifespan;
      if (isFireSystem) {
        alphas[i] = safeOpacity * (0.7 + Math.random() * 0.3); // Fire starts brighter
        particleSize = (0.5 + Math.random() * 0.5) * safeSpread * 1.2; // Fire slightly larger avg size
        lifespan = BASE_FIRE_LIFESPAN * (0.5 + Math.random() * 0.8); // More variation
      } else { // Smoke
        alphas[i] = safeOpacity * (0.4 + Math.random() * 0.3); // Smoke starts dimmer
        particleSize = (0.8 + Math.random() * 0.8) * safeSpread; // Smoke larger avg size
        lifespan = BASE_SMOKE_LIFESPAN * (0.6 + Math.random() * 0.7); // More variation
      }
      particleSizes[i] = isNaN(particleSize) ? 0.1 : Math.max(0.02, particleSize); // Ensure min size
      lives[i] = isNaN(lifespan) ? (isFireSystem ? BASE_FIRE_LIFESPAN : BASE_SMOKE_LIFESPAN) : lifespan;

      // Turbulence offsets (unique per particle)
      turbulenceOffsets[i3] = Math.random() * 2 * Math.PI; // Phase offset X
      turbulenceOffsets[i3 + 1] = Math.random() * 2 * Math.PI; // Phase offset Y
      turbulenceOffsets[i3 + 2] = Math.random() * 100; // Time offset
    }

    geometry.setAttribute('position', new THREE_Module.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE_Module.BufferAttribute(velocities, 3));
    geometry.setAttribute('color', new THREE_Module.BufferAttribute(particleColors, 3));
    geometry.setAttribute('alpha', new THREE_Module.BufferAttribute(alphas, 1));
    geometry.setAttribute('particleSize', new THREE_Module.BufferAttribute(particleSizes, 1));
    geometry.setAttribute('life', new THREE_Module.BufferAttribute(lives, 1));
    geometry.setAttribute('turbulenceOffset', new THREE_Module.BufferAttribute(turbulenceOffsets, 3));

    const material = new THREE_Module.PointsMaterial({
      map: isFireSystem ? fireParticleTexture : smokeParticleTexture,
      depthWrite: false,
      transparent: true,
      vertexColors: true,
      sizeAttenuation: true, // Make particles smaller further away
    });

    // Apply blending mode
     if (THREE_Module) {
        switch (currentBlendMode) {
            case "Additive":
                material.blending = THREE_Module.AdditiveBlending;
                break;
            case "Subtractive":
                 // Correct setup for Subtractive Blending
                 // Often requires adjustments based on desired visual outcome
                 material.blending = THREE_Module.CustomBlending;
                 material.blendEquation = THREE_Module.ReverseSubtractEquation; // Target = Dst - Src * SrcAlpha
                 material.blendSrc = THREE_Module.SrcAlphaFactor; // Use source alpha
                 material.blendDst = THREE_Module.OneFactor; // Subtract from destination color fully
                 material.blendSrcAlpha = THREE_Module.ZeroFactor; // Alpha channel calculation if needed
                 material.blendDstAlpha = THREE_Module.OneFactor;
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
        shader.vertexShader = `
            attribute float particleSize;
            attribute float alpha;
            attribute vec3 turbulenceOffset; // Use the 3-component offset
            varying float vAlpha;
            varying vec3 vTurbulenceOffsetData; // Pass offset data to fragment potentially

            ${shader.vertexShader}
        `.replace(
            `#include <begin_vertex>`,
            `#include <begin_vertex>
             transformed = vec3( position ); // Start with original position
             vAlpha = alpha;
             vTurbulenceOffsetData = turbulenceOffset; // Pass to varying
            `
        ).replace(
            // Replace the default size calculation logic
            `gl_PointSize = size;`,
            `// Custom Point Size Calculation
             #ifdef USE_SIZEATTENUATION
                // Perspective-aware size calculation
                float calculatedSize = particleSize; // Start with base size from attribute
                bool isPerspective = isPerspectiveMatrix( projectionMatrix );
                if ( isPerspective ) {
                    float eyeDistance = length( mvPosition.xyz ); // Distance from camera
                    // Adjust size based on distance - make 100.0 a float
                    calculatedSize *= ( 100.0 / max(1.0, eyeDistance) );
                 }
                 // Apply device pixel ratio for consistent size across displays
                 gl_PointSize = max(1.0, calculatedSize * ${pixelRatio.toFixed(1)});
            #else
                 gl_PointSize = max(1.0, particleSize * ${pixelRatio.toFixed(1)});
            #endif`
        ).replace(
             // Handle potential redefinition if scale exists elsewhere
             `uniform float scale;`,
             `` // Remove default scale uniform if we don't use it
        );

        shader.fragmentShader = `
            varying float vAlpha;
            // varying vec3 vTurbulenceOffsetData; // Can use if needed in fragment shader
            ${shader.fragmentShader}
        `.replace(
            `#include <color_fragment>`,
            `#include <color_fragment>
             // Apply vertex color and alpha
             diffuseColor = vec4( vColor, vAlpha );
            `
        ).replace(
            // Ensure texture mapping uses particle UVs correctly
            `#include <map_particle_fragment>`,
            `#include <map_particle_fragment>
             // Apply texture map (if used) multiplied by vertex color/alpha
             #ifdef USE_MAP
                 diffuseColor *= texture2D( map, gl_PointCoord );
             #endif
            `
        );
         // console.log("Vertex Shader:\n", shader.vertexShader); // Debugging
         // console.log("Fragment Shader:\n", shader.fragmentShader); // Debugging
    };


    return { geometry, material };
  }, [THREE_Module, smokeParticleTexture, fireParticleTexture, getParticleStartPosition]); // Added getParticleStartPosition dependency


  // Debounced function to update/recreate particles when settings change
  const debouncedUpdateParticles = useCallback(
    debounce(() => {
      if (!mountRef.current || !isThreeLoaded || !THREE_Module || !sceneRef.current) return;
      const scene = sceneRef.current;

      console.log("Debounced update running..."); // Debug log

      // Helper function to update or create particle systems
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
        sourceType: EffectiveParticleSource, // Use EffectiveParticleSource
        blendMode: BlendMode
      ) => {
        // Remove existing system if it exists
        if (particlesRef.current) {
          scene.remove(particlesRef.current);
          particlesRef.current.geometry.dispose();
          if (Array.isArray(particlesRef.current.material)) {
            particlesRef.current.material.forEach(m => m.dispose());
          } else {
             (particlesRef.current.material as THREE.Material).dispose();
          }
          particlesRef.current = null;
          console.log(`Removed existing ${isFire ? 'fire' : 'smoke'} system.`); // Debug log
        }

        // Create new system if enabled and count > 0
        if (isEnabled && count > 0) {
          console.log(`Creating new ${isFire ? 'fire' : 'smoke'} system with count: ${count}, source: ${sourceType}`); // Debug log
          const { geometry, material } = initParticles(
              count, isFire, baseColor, accentColor, speed, spread, opacity, sourceType, blendMode
          );
          if (geometry && material) {
            particlesRef.current = new THREE_Module.Points(geometry, material);
            scene.add(particlesRef.current);
            console.log(`Added new ${isFire ? 'fire' : 'smoke'} system to scene.`); // Debug log
          } else {
              console.warn(`Failed to initialize ${isFire ? 'fire' : 'smoke'} particle geometry/material.`);
          }
        } else {
           console.log(`${isFire ? 'Fire' : 'Smoke'} system is disabled or count is zero.`); // Debug log
        }
      };

      // Update smoke particles
      updateOrCreateParticles(
        smokeParticlesRef, isSmokeEnabled, actualSmokeParticleCount, false,
        smokeBaseColor, smokeAccentColor, smokeSpeed, smokeSpread, smokeOpacity,
        effectiveSmokeSource, smokeBlendMode // Pass effectiveSmokeSource
      );

      // Update fire particles
      updateOrCreateParticles(
        fireParticlesRef, isFireEnabled, actualFireParticleCount, true,
        fireBaseColor, fireAccentColor, fireSpeed, fireSpread, fireOpacity,
        effectiveFireSource, fireBlendMode // Pass effectiveFireSource
      );
    }, 300), // Slightly increased debounce time
    [ // Consolidate dependencies
      isThreeLoaded, THREE_Module, initParticles,
      isSmokeEnabled, actualSmokeParticleCount, smokeBaseColor, smokeAccentColor, smokeSpeed, smokeSpread, smokeOpacity, effectiveSmokeSource, smokeBlendMode,
      isFireEnabled, actualFireParticleCount, fireBaseColor, fireAccentColor, fireSpeed, fireSpread, fireOpacity, effectiveFireSource, fireBlendMode,
      // particleText // Already included via effectiveSource dependency
    ]
  );


   // Effect for initializing and updating the Three.js scene
   useEffect(() => {
     if (!mountRef.current || !isThreeLoaded || !THREE_Module ) return;
     const currentMountRef = mountRef.current;

     // --- Scene, Camera, Renderer Setup ---
     if (!sceneRef.current) sceneRef.current = new THREE_Module.Scene();
     if (!cameraRef.current) {
       cameraRef.current = new THREE_Module.PerspectiveCamera(
         75, // Field of View
         currentMountRef.clientWidth / currentMountRef.clientHeight, // Aspect Ratio
         0.1, // Near clipping plane
         100 // Far clipping plane (reduced for performance)
       );
       cameraRef.current.position.z = 5; // Move camera back
     }
     if (!rendererRef.current) {
       try {
         rendererRef.current = new THREE_Module.WebGLRenderer({
           antialias: true, // Smoother edges
           alpha: true, // Transparent background for the canvas itself
           preserveDrawingBuffer: true // Needed for recording canvas
         });
         rendererRef.current.setSize(currentMountRef.clientWidth, currentMountRef.clientHeight);
         rendererRef.current.setPixelRatio(typeof window !== 'undefined' ? window.devicePixelRatio : 1);
         currentMountRef.appendChild(rendererRef.current.domElement);
         console.log("Renderer initialized and appended.");
         if (onCanvasReady) onCanvasReady(rendererRef.current.domElement);
       } catch (error) {
          console.error("Error creating WebGLRenderer:", error);
          setLoadError("Could not initialize 3D graphics. Your browser might not support WebGL2 or it might be disabled.");
          return; // Stop execution if renderer fails
       }
     }

     // --- Initial Particle Setup ---
     // Call debounced update initially to create particles based on default settings
     console.log("Triggering initial debounced update...");
     debouncedUpdateParticles();


     // --- Animation Loop ---
     const clock = new THREE_Module.Clock();
     let time = 0; // Accumulated time for turbulence

     const animate = () => {
        // Ensure cleanup happens correctly if component unmounts or dependencies change
       if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !THREE_Module) {
         if(animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
         animationFrameIdRef.current = null; // Clear ref on stop
         return;
       }
       animationFrameIdRef.current = requestAnimationFrame(animate);

       const delta = clock.getDelta();
       // Clamp delta time to prevent large jumps if the tab was inactive
       const safeDelta = Math.min(delta, 0.05); // Max frame time ~20 FPS
       if (safeDelta <= 0) return; // Skip frame if delta is zero or negative

       time += safeDelta; // Accumulate time for noise functions


       if (isPlaying) {
          // --- Update Particle Systems ---
          const currentWindEffectX = (isNaN(windDirectionX) ? 0 : windDirectionX) * (isNaN(windStrength) ? 0 : windStrength) * safeDelta * 60;
          const timeFactorSmoke = time * 0.8; // Slower time factor for smoother smoke turbulence
          const timeFactorFire = time * 1.2; // Faster for more flicker in fire
          const currentSmokeBaseC = new THREE_Module.Color(smokeBaseColor);
          const currentSmokeAccentC = new THREE_Module.Color(smokeAccentColor);
          const finalSmokeColor = new THREE_Module.Color(); // Reusable color object
          const currentFireBaseC = new THREE_Module.Color(fireBaseColor);
          const currentFireAccentC = new THREE_Module.Color(fireAccentColor);
          const finalFireColor = new THREE_Module.Color(); // Reusable color object


         // --- SMOKE PARTICLE UPDATE ---
          if (smokeParticlesRef.current && isSmokeEnabled && actualSmokeParticleCount > 0) {
             const geom = smokeParticlesRef.current.geometry as THREE.BufferGeometry;
             // Ensure attributes exist before accessing .array
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

                // Pre-calculate constant factors for the loop
                const safeSmokeDissipation = isNaN(smokeDissipation ?? 0) ? 0.2 : (smokeDissipation ?? 0);
                const baseLifespan = BASE_SMOKE_LIFESPAN * (1.0 + Math.random() * 0.5 - 0.25); // Per-particle lifespan variation base
                // Faster life decrease, influenced by dissipation
                const lifeDecreaseFactor = safeDelta * (10 + safeSmokeDissipation * 30);
                const safeSmokeBuoyancy = isNaN(smokeBuoyancy ?? 0) ? 0.005 : (smokeBuoyancy ?? 0);
                const safeSmokeTurbulence = isNaN(smokeTurbulence) ? 1.0 : smokeTurbulence;
                const turbulenceStrength = safeSmokeTurbulence * 0.008; // Fine-tuned turbulence strength
                const turbulenceScale = 0.6; // How "large" the noise patterns are

                const camZ = cameraRef.current.position.z;

                for (let i = 0; i < positions.count; i++) {
                    const i3 = i * 3;
                    const currentLife = lifeArray[i] - lifeDecreaseFactor;
                    lifeArray[i] = currentLife;

                    if (currentLife <= 0) {
                        // --- Particle Reset ---
                        const startPos = getParticleStartPosition(false, effectiveSmokeSource, smokeSpread, camZ);
                        posArray[i3] = startPos.x;
                        posArray[i3 + 1] = startPos.y;
                        posArray[i3 + 2] = startPos.z;

                        // Reset velocity: ensure positive Y for smoke
                        const safeSmokeSpeed = isNaN(smokeSpeed) ? 0.01 : smokeSpeed;
                        velArray[i3] = (Math.random() - 0.5) * 0.015 * smokeSpread; // Horizontal
                        velArray[i3 + 1] = (Math.random() * 0.5 + 0.8) * safeSmokeSpeed; // Vertical (ensure positive)
                        velArray[i3 + 2] = (Math.random() - 0.5) * 0.015 * smokeSpread; // Depth

                        lifeArray[i] = BASE_SMOKE_LIFESPAN * (0.7 + Math.random() * 0.6); // Reset life with variation

                        // Reset color
                        finalSmokeColor.copy(currentSmokeBaseC).lerp(currentSmokeAccentC, Math.random());
                        colorArray[i3] = finalSmokeColor.r;
                        colorArray[i3 + 1] = finalSmokeColor.g;
                        colorArray[i3 + 2] = finalSmokeColor.b;

                        alphaArray[i] = smokeOpacity * (0.4 + Math.random() * 0.3); // Reset alpha
                        // Reset size with variation based on spread
                        const safeSmokeSpread = isNaN(smokeSpread) ? 1.0 : smokeSpread;
                        sizeArray[i] = (0.8 + Math.random() * 0.8) * safeSmokeSpread;

                        // Optionally reset turbulence offset if desired, or keep it persistent
                        // turbOffsetArray[i3] = Math.random() * 2 * Math.PI;
                        // turbOffsetArray[i3 + 1] = Math.random() * 2 * Math.PI;
                        // turbOffsetArray[i3 + 2] = Math.random() * 100;

                    } else {
                        // --- Particle Update ---
                        const lifeRatio = Math.max(0, Math.min(1, currentLife / Math.max(0.01, BASE_SMOKE_LIFESPAN))); // Normalize life

                        // Apply Turbulence (using pre-calculated offsets)
                        const tx = turbOffsetArray[i3]; // Offset X (phase)
                        const ty = turbOffsetArray[i3 + 1]; // Offset Y (phase)
                        const tz = turbOffsetArray[i3 + 2]; // Offset Z (time)
                        const noiseTime = timeFactorSmoke + tz * 0.01; // Incorporate time offset

                        // Simplex noise or Perlin noise would be better, but sin/cos is simpler
                        // Apply turbulence based on particle position and time-varied offsets
                        const turbX = Math.sin(posArray[i3 + 1] * turbulenceScale + noiseTime + tx) * turbulenceStrength;
                        const turbY = Math.cos(posArray[i3] * turbulenceScale + noiseTime + ty) * turbulenceStrength; // Use cos for variation
                        const turbZ = Math.sin(posArray[i3 + 2] * turbulenceScale + noiseTime + tx + ty) * turbulenceStrength; // Combine offsets

                        // Apply Velocity, Buoyancy, Wind, Turbulence
                        velArray[i3 + 1] += safeSmokeBuoyancy * safeDelta * 60; // Buoyancy affects Y velocity
                        posArray[i3] += (velArray[i3] + turbX + currentWindEffectX) * safeDelta * 60;
                        posArray[i3 + 1] += (velArray[i3 + 1] + turbY) * safeDelta * 60;
                        posArray[i3 + 2] += (velArray[i3 + 2] + turbZ) * safeDelta * 60;


                        // Update Alpha (Fade in/out smoothly)
                        const fadeInEnd = 0.9;
                        const fadeOutStart = 0.3;
                        let alphaMultiplier = 1.0;
                        if (lifeRatio > fadeInEnd) {
                            alphaMultiplier = THREE_Module.MathUtils.smoothstep(lifeRatio, 1.0, fadeInEnd);
                        } else if (lifeRatio < fadeOutStart) {
                            alphaMultiplier = THREE_Module.MathUtils.smoothstep(lifeRatio, 0.0, fadeOutStart);
                        }
                        alphaArray[i] = Math.max(0, Math.min(smokeOpacity, smokeOpacity * (0.4 + Math.random() * 0.3) * alphaMultiplier));


                        // Update Size (Grow slightly then maybe shrink)
                        const sizeFactor = 1.0 + (0.3 * Math.sin(lifeRatio * Math.PI)); // Grow then shrink slightly
                        const safeSpreadSize = isNaN(smokeSpread) ? 1.0 : smokeSpread;
                        const baseSize = (0.8 + Math.random() * 0.8) * safeSpreadSize; // Base size for this particle
                        sizeArray[i] = Math.max(0.02, baseSize * sizeFactor);

                    }
                 }
                 // Mark attributes for update
                 positions.needsUpdate = true;
                 velocities.needsUpdate = true;
                 alphas.needsUpdate = true;
                 particleSizesAttr.needsUpdate = true;
                 lives.needsUpdate = true;
                 colorsAttr.needsUpdate = true;
                 // turbulenceOffsets.needsUpdate = true; // Only if resetting offsets
             } else {
                  console.warn("Smoke attributes missing!");
             }
          }


         // --- FIRE PARTICLE UPDATE --- (Similar structure to smoke, with different parameters)
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

                 // Fire-specific parameters
                 const lifeDecreaseFactor = safeDelta * 15; // Fire fades faster generally
                 const safeFireTurbulence = isNaN(fireTurbulence) ? 1.0 : fireTurbulence;
                 const fireTurbulenceStrength = safeFireTurbulence * 0.015; // More vigorous turbulence
                 const fireTurbulenceScale = 0.8;
                 const camZ = cameraRef.current.position.z;

                 for (let i = 0; i < positions.count; i++) {
                    const i3 = i * 3;
                    const currentLife = lifeArray[i] - lifeDecreaseFactor;
                    lifeArray[i] = currentLife;

                    if (currentLife <= 0) {
                        // --- Fire Particle Reset ---
                        const startPos = getParticleStartPosition(true, effectiveFireSource, fireSpread, camZ);
                        posArray[i3] = startPos.x;
                        posArray[i3 + 1] = startPos.y;
                        posArray[i3 + 2] = startPos.z;

                        // Reset velocity
                        const safeFireSpeed = isNaN(fireSpeed) ? 0.03 : fireSpeed;
                        velArray[i3] = (Math.random() - 0.5) * 0.03 * fireSpread;
                        velArray[i3 + 1] = (Math.random() * 0.8 + 0.6) * safeFireSpeed * 2.0; // Stronger base Y
                        velArray[i3 + 2] = (Math.random() - 0.5) * 0.03 * fireSpread;

                        lifeArray[i] = BASE_FIRE_LIFESPAN * (0.5 + Math.random() * 0.8); // Reset life

                        // Reset color
                        finalFireColor.copy(currentFireBaseC).lerp(currentFireAccentC, Math.random());
                        colorArray[i3] = finalFireColor.r;
                        colorArray[i3 + 1] = finalFireColor.g;
                        colorArray[i3 + 2] = finalFireColor.b;

                        alphaArray[i] = fireOpacity * (0.7 + Math.random() * 0.3); // Reset alpha
                        const safeFireSpread = isNaN(fireSpread) ? 1.5 : fireSpread;
                        sizeArray[i] = (0.5 + Math.random() * 0.5) * safeFireSpread * 1.2; // Reset size

                    } else {
                        // --- Fire Particle Update ---
                        const lifeRatio = Math.max(0, Math.min(1, currentLife / Math.max(0.01, BASE_FIRE_LIFESPAN)));

                        // Apply Turbulence
                        const tx = turbOffsetArray[i3];
                        const ty = turbOffsetArray[i3 + 1];
                        const tz = turbOffsetArray[i3 + 2];
                        const noiseTime = timeFactorFire + tz * 0.01;

                        const turbX = Math.sin(posArray[i3 + 1] * fireTurbulenceScale + noiseTime + tx) * fireTurbulenceStrength;
                        const turbY = Math.cos(posArray[i3] * fireTurbulenceScale + noiseTime + ty) * fireTurbulenceStrength * 1.5; // More Y turbulence for flicker
                        const turbZ = Math.sin(posArray[i3 + 2] * fireTurbulenceScale + noiseTime + tx + ty) * fireTurbulenceStrength;

                        // Apply Velocity, Wind, Turbulence (Fire has less buoyancy, more speed)
                        posArray[i3] += (velArray[i3] + turbX + currentWindEffectX * 0.7) * safeDelta * 60; // Less wind effect
                        posArray[i3 + 1] += (velArray[i3 + 1] + turbY) * safeDelta * 60;
                        posArray[i3 + 2] += (velArray[i3 + 2] + turbZ) * safeDelta * 60;

                        // Update Alpha (Fade out quickly)
                        const fadeOutPower = 1.8; // Sharper fade for fire
                        alphaArray[i] = Math.max(0, Math.min(fireOpacity, fireOpacity * (0.7 + Math.random() * 0.3) * Math.pow(lifeRatio, fadeOutPower)));


                        // Update Size (Shrink over life)
                        const sizeFactor = Math.max(0.1, lifeRatio * 0.9 + 0.1); // Shrink more drastically
                        const safeSpreadSize = isNaN(fireSpread) ? 1.5 : fireSpread;
                        const baseSize = (0.5 + Math.random() * 0.5) * safeSpreadSize * 1.2;
                        sizeArray[i] = Math.max(0.02, baseSize * sizeFactor);
                    }
                 }
                 // Mark attributes for update
                 positions.needsUpdate = true;
                 velocities.needsUpdate = true;
                 alphas.needsUpdate = true;
                 particleSizesAttr.needsUpdate = true;
                 lives.needsUpdate = true;
                 colorsAttr.needsUpdate = true;
             } else {
                 console.warn("Fire attributes missing!");
             }
         }
       } // End if (isPlaying)

       // --- Render Scene ---
       try {
           rendererRef.current.render(sceneRef.current, cameraRef.current);
       } catch(e) {
           console.error("Error during render:", e);
           // Optionally stop the animation loop on render error
           // if(animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
           // animationFrameIdRef.current = null;
       }
     }; // End animate function

     animate(); // Start the loop

     // --- Resize Handling ---
     const handleResize = debounce(() => {
       if (mountRef.current && rendererRef.current && cameraRef.current && THREE_Module) {
         const width = mountRef.current.clientWidth;
         const height = mountRef.current.clientHeight;
         if (width > 0 && height > 0) {
             // Check if renderer size actually needs updating
             const currentSize = rendererRef.current.getSize(new THREE_Module.Vector2());
             if (currentSize.width !== width || currentSize.height !== height) {
                 rendererRef.current.setSize(width, height);
                 console.log(`Renderer resized to: ${width}x${height}`);
             }
             // Update camera aspect ratio
             if (cameraRef.current.aspect !== width / height) {
                 cameraRef.current.aspect = width / height;
                 cameraRef.current.updateProjectionMatrix();
                 console.log(`Camera aspect updated to: ${cameraRef.current.aspect}`);
             }
         } else {
              console.warn("Resize handler called with zero dimensions.");
         }
       }
     }, 250); // Debounce resize events

     window.addEventListener('resize', handleResize);

     // --- Cleanup ---
     return () => {
        console.log("Cleanup: Cancelling animation frame, removing resize listener.");
       if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
       animationFrameIdRef.current = null; // Clear ref on cleanup
       window.removeEventListener('resize', handleResize);
       // Consider disposing materials/geometries here if they are not managed by refs that trigger re-creation
       // sceneRef.current?.clear(); // If you want to fully clear scene on unmount
       // rendererRef.current?.dispose(); // If renderer should be disposed
     };
   }, [ // Consolidate ALL dependencies for the main setup/animation effect
     isThreeLoaded, THREE_Module, onCanvasReady, // Initialization
     debouncedUpdateParticles, // Particle creation/update trigger
     backgroundColor, isPlaying, // Scene/Control states
     windDirectionX, windStrength, // Scene physics
     smokeBaseColor, smokeAccentColor, smokeOpacity, smokeTurbulence, smokeDissipation, smokeBuoyancy, smokeSpeed, smokeSpread, // Smoke physics/appearance
     fireBaseColor, fireAccentColor, fireOpacity, fireTurbulence, fireSpeed, fireSpread, // Fire physics/appearance
     isSmokeEnabled, isFireEnabled, actualSmokeParticleCount, actualFireParticleCount, // Enabling and counts
     effectiveSmokeSource, effectiveFireSource, // Particle sources (derived)
     getParticleStartPosition // Function dependency
     // Note: smokeSourceProp/fireSourceProp/particleText are included via effectiveSource
     // Note: smokeBlendMode/fireBlendMode only affect material creation, handled by debouncedUpdate
   ]);


  // Effect to specifically update blend mode on existing materials when changed
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
                // Reset custom blending equations if switching away from Subtractive
                material.blendEquation = THREE_Module.AddEquation; // Reset equation
                material.blendSrc = THREE_Module.SrcAlphaFactor; // Reset source factor
                material.blendDst = THREE_Module.OneMinusSrcAlphaFactor; // Reset dest factor
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


   // Effect to update background color
   useEffect(() => {
     if (rendererRef.current && THREE_Module && isThreeLoaded) {
        try {
           rendererRef.current.setClearColor(new THREE_Module.Color(backgroundColor));
        } catch (e) {
            console.error("Invalid background color value:", backgroundColor, e);
            // Optionally reset to a default color
            // rendererRef.current.setClearColor(new THREE_Module.Color('#000000'));
        }
     }
   }, [backgroundColor, THREE_Module, isThreeLoaded]);


   // --- Render Logic ---

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
         {/* Basic loading text, could be replaced with a spinner */}
         <p className="text-lg animate-pulse">Loading 3D Simulation...</p>
       </div>
     );
   }

   // Render the mount point for Three.js canvas
   return <div ref={mountRef} className="w-full h-full" role="img" aria-label="Smoke and fire simulation canvas" data-ai-hint="smoke fire particles simulation" />;
 };

 export default SmokeCanvas;
