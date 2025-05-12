
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
  particleText?: string; // New: Text for shaping

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

const BASE_FIRE_LIFESPAN = 70;
const BASE_SMOKE_LIFESPAN = 220;
const BOTTOM_SOURCE_X_SPREAD = 12.0;

// Text shaping related constants
const TEXT_CANVAS_WIDTH = 512;
const TEXT_CANVAS_HEIGHT = 128;
const TEXT_FONT_SIZE = 80;
const TEXT_FONT = `bold ${TEXT_FONT_SIZE}px Arial, sans-serif`;
const TEXT_SAMPLE_DENSITY = 0.5; // Lower = fewer points per pixel
const TEXT_SHAPE_SCALE = 0.02; // Scale text shape in 3D space

const SmokeCanvas: React.FC<SmokeCanvasProps> = ({
  // Smoke Props
  isSmokeEnabled = true,
  smokeDensity = 6500,
  smokeBaseColor = '#FFFFFF',
  smokeAccentColor = '#E0E0E0',
  smokeSpeed = 0.015,
  smokeSpread = 1.0,
  smokeBlendMode = "Normal",
  smokeSource: smokeSourceProp = "Bottom",
  smokeOpacity = 0.6,
  smokeTurbulence = 1.2,
  smokeDissipation = 0.2,
  smokeBuoyancy = 0.005,
  particleText = "", // Default empty text

  // Fire Props
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

  // Scene Props
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

  // State for text shaping points
  const textPointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const textCanvasRef = useRef<HTMLCanvasElement | null>(null); // Hidden canvas for text rendering


  // Determine effective source, overridden by text
  const smokeSource = particleText ? "Text" : smokeSourceProp;
  const fireParticleSource = particleText ? "Text" : fireSourceProp;

  // Initialize hidden canvas for text rendering
  useEffect(() => {
    textCanvasRef.current = document.createElement('canvas');
    textCanvasRef.current.width = TEXT_CANVAS_WIDTH;
    textCanvasRef.current.height = TEXT_CANVAS_HEIGHT;
    // Optional: Append to body for debugging, but keep hidden
    // textCanvasRef.current.style.position = 'absolute';
    // textCanvasRef.current.style.top = '-9999px';
    // document.body.appendChild(textCanvasRef.current);

    // return () => {
    //   if (textCanvasRef.current && textCanvasRef.current.parentElement) {
    //     textCanvasRef.current.parentElement.removeChild(textCanvasRef.current);
    //   }
    // }
  }, []);

  // Function to generate points from text
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

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set text properties
    ctx.font = TEXT_FONT;
    ctx.fillStyle = '#ffffff'; // Color doesn't matter, just need alpha
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw text
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const points: Array<{ x: number; y: number }> = [];

    // Sample points from pixels
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const alphaIndex = (y * canvas.width + x) * 4 + 3;
        if (data[alphaIndex] > 128 && Math.random() < TEXT_SAMPLE_DENSITY) { // Check alpha and density
          // Map canvas coords to centered 3D scene coords
          const sceneX = (x - canvas.width / 2) * TEXT_SHAPE_SCALE;
          const sceneY = -(y - canvas.height / 2) * TEXT_SHAPE_SCALE; // Invert Y for typical 3D coords
          points.push({ x: sceneX, y: sceneY });
        }
      }
    }
    console.log(`Generated ${points.length} points for text: "${text}"`);
    textPointsRef.current = points;

  }, []); // Depends only on initialization refs

  // Update text points when particleText prop changes
  useEffect(() => {
    generateTextPoints(particleText);
  }, [particleText, generateTextPoints]);


  useEffect(() => {
    import('three').then(three => {
      THREE_Module = three;
      setIsThreeLoaded(true);
      setLoadError(null);
    }).catch(err => {
      console.error("Failed to load Three.js", err);
      setLoadError("Failed to load 3D rendering library. Please try refreshing the page.");
      setIsThreeLoaded(false);
    });
  }, []);

  useEffect(() => {
    if (!mountRef.current || !isThreeLoaded || !THREE_Module) {
      return;
    }

    const currentMountRef = mountRef.current;
    if (!currentMountRef) return;


    const handleMouseMove = (event: MouseEvent) => {
      if (!mountRef.current || !cameraRef.current || !THREE_Module) return;

      const canvasBounds = mountRef.current.getBoundingClientRect();

      const mouseXNDC = ((event.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
      const mouseYNDC = -((event.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;

      const vec = new THREE_Module.Vector3(mouseXNDC, mouseYNDC, 0.5);
      vec.unproject(cameraRef.current);
      const dir = vec.sub(cameraRef.current.position).normalize();
      const distance = -cameraRef.current.position.z / dir.z;
      const pos = cameraRef.current.position.clone().add(dir.multiplyScalar(distance));
      mouseSceneXRef.current = pos.x;
      mouseSceneYRef.current = pos.y;
    };

    currentMountRef.addEventListener('mousemove', handleMouseMove);

    return () => {
      currentMountRef.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isThreeLoaded, THREE_Module]);


  const smokeParticleTexture = useMemo(() => {
    if (!THREE_Module || !isThreeLoaded) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context) return null;

    const gradient = context.createRadialGradient(
      canvas.width / 2, canvas.height / 2, canvas.width / 10,
      canvas.width / 2, canvas.height / 2, canvas.width / 2.2
    );
    gradient.addColorStop(0, 'rgba(255,255,255,0.85)');
    gradient.addColorStop(0.3, 'rgba(245,245,245,0.6)');
    gradient.addColorStop(0.6, 'rgba(230,230,230,0.25)');
    gradient.addColorStop(1, 'rgba(200,200,200,0)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Add some subtle noise/variation
    for (let i = 0; i < 4; i++) {
      const x = canvas.width / 2 + (Math.random() - 0.5) * canvas.width / 3;
      const y = canvas.height / 2 + (Math.random() - 0.5) * canvas.height / 3;
      const r = (Math.random() * canvas.width / 10) + canvas.width / 20;
      const g = context.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,255,255,${Math.random() * 0.1 + 0.05})`);
      g.addColorStop(1, `rgba(255,255,255,0)`);
      context.fillStyle = g;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    return new THREE_Module.CanvasTexture(canvas);
  }, [isThreeLoaded, THREE_Module]);

  const fireParticleTexture = useMemo(() => {
    if (!THREE_Module || !isThreeLoaded) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (!context) return null;

    const gradient = context.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0,
      canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    gradient.addColorStop(0, 'rgba(255, 220, 180, 0.9)'); // Brighter center
    gradient.addColorStop(0.2, 'rgba(255, 180, 100, 0.7)');
    gradient.addColorStop(0.5, 'rgba(255, 120, 30, 0.4)');
    gradient.addColorStop(1, 'rgba(200, 50, 0, 0)'); // Fades to transparent red

    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    return new THREE_Module.CanvasTexture(canvas);
  }, [isThreeLoaded, THREE_Module]);


  // Function to get a starting position for a particle
  const getParticleStartPosition = useCallback((
      isFire: boolean,
      source: ParticleSource | "Text",
      spreadVal: number
    ): { x: number; y: number; z: number } => {

    let x, y, z;

    switch (source) {
      case "Text":
        if (textPointsRef.current.length > 0) {
          const point = textPointsRef.current[Math.floor(Math.random() * textPointsRef.current.length)];
          // Add small random offset to avoid perfect alignment
          x = point.x + (Math.random() - 0.5) * spreadVal * 0.1;
          y = point.y + (Math.random() - 0.5) * spreadVal * 0.1;
          z = (Math.random() - 0.5) * spreadVal * 0.1; // Small depth variation
        } else {
          // Fallback to Center if text is empty or no points generated
          x = (Math.random() - 0.5) * spreadVal * (isFire ? 1.8 : 2.2);
          y = isFire ? -2.5 + (Math.random() - 0.5) * 0.2 : (Math.random() - 0.5) * 0.5 - 2.0;
          z = (Math.random() - 0.5) * spreadVal * (isFire ? 1.8 : 2.2);
        }
        break;
      case "Bottom":
        x = (Math.random() - 0.5) * BOTTOM_SOURCE_X_SPREAD;
        y = isFire ? -2.5 + (Math.random() * 0.1) : -2.8 + (Math.random() * 0.3);
        z = (Math.random() - 0.5) * spreadVal * (isFire ? 0.6 : 0.8);
        break;
      case "Mouse":
        const mouseSpreadFactor = isFire ? 0.3 : 0.4;
        x = mouseSceneXRef.current + (Math.random() - 0.5) * spreadVal * mouseSpreadFactor;
        y = mouseSceneYRef.current + (Math.random() - 0.5) * spreadVal * mouseSpreadFactor;
        z = (Math.random() - 0.5) * spreadVal * mouseSpreadFactor * 0.5;
        break;
      case "Center":
      default:
        x = (Math.random() - 0.5) * spreadVal * (isFire ? 1.8 : 2.2);
        y = isFire ? -2.5 + (Math.random() - 0.5) * 0.2 : (Math.random() - 0.5) * 0.5 - 2.0;
        z = (Math.random() - 0.5) * spreadVal * (isFire ? 1.8 : 2.2);
        break;
    }
    return { x, y, z };
  }, []); // Dependencies managed within function scope or stable refs


  const initParticles = useCallback((
    count: number,
    isFireSystem: boolean,
    baseColorVal: string,
    accentColorVal: string,
    speedVal: number,
    spreadVal: number,
    opacityVal: number,
    currentParticleSourceType: ParticleSource | "Text", // Accept "Text"
    currentBlendMode?: BlendMode
  ): { geometry: THREE.BufferGeometry | null; material: THREE.PointsMaterial | null } => {
    if (!THREE_Module || count === 0 || !THREE_Module) return { geometry: null, material: null };

    const geometry = new THREE_Module.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const particleColors = new Float32Array(count * 3);
    const alphas = new Float32Array(count);
    const particleSizes = new Float32Array(count);
    const lives = new Float32Array(count);
    // Store initial turbulence offsets per particle for variation
    const turbulenceOffsets = new Float32Array(count * 3);


    const baseC = new THREE_Module.Color(baseColorVal);
    const accentC = new THREE_Module.Color(accentColorVal);
    const finalColor = new THREE_Module.Color();


    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const startPos = getParticleStartPosition(isFireSystem, currentParticleSourceType, spreadVal);
      positions[i3] = startPos.x;
      positions[i3 + 1] = startPos.y;
      positions[i3 + 2] = startPos.z;

      // Set initial velocities
      if (isFireSystem) {
        velocities[i3] = (Math.random() - 0.5) * 0.02 * spreadVal; // Less horizontal start speed for fire
        velocities[i3 + 1] = (Math.random() * speedVal * 1.8) + speedVal * 1.5; // Faster base speed
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.02 * spreadVal;
      } else { // Smoke
        velocities[i3] = (Math.random() - 0.5) * 0.025 * spreadVal;
        velocities[i3 + 1] = Math.random() * speedVal * 0.8 + speedVal * 0.2; // Base upward speed
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.025 * spreadVal;
      }


      // Set colors with variation
      finalColor.copy(baseC);
      finalColor.lerp(accentC, Math.random() * (isFireSystem ? 0.7 : 0.3)); // More accent for fire

      if (isFireSystem) {
        const fireHsl = { h: 0, s: 0, l: 0 };
        finalColor.getHSL(fireHsl);
        finalColor.setHSL(
          fireHsl.h + (Math.random() - 0.5) * 0.05, // Slight hue shift
          Math.max(0.85, fireHsl.s - Math.random() * 0.1), // Keep saturation high
          Math.min(0.95, fireHsl.l + Math.random() * 0.1) // Keep lightness high
        );
      }
      particleColors[i3] = finalColor.r;
      particleColors[i3 + 1] = finalColor.g;
      particleColors[i3 + 2] = finalColor.b;

      // Set alpha and size
       if (isFireSystem) {
        alphas[i] = opacityVal * (0.7 + Math.random() * 0.3); // Fire starts more opaque
        particleSizes[i] = (0.6 + Math.random() * 0.6) * (spreadVal / 1.1); // Smaller base size for fire
        lives[i] = Math.random() * BASE_FIRE_LIFESPAN * 0.5 + BASE_FIRE_LIFESPAN * 0.5; // Fire lifespan
      } else { // Smoke
        alphas[i] = opacityVal * (0.1 + Math.random() * 0.2); // Smoke starts less opaque
        particleSizes[i] = (0.6 + Math.random() * 0.6) * (spreadVal / 1.5) ; // Smoke base size
        lives[i] = Math.random() * BASE_SMOKE_LIFESPAN * 0.7 + BASE_SMOKE_LIFESPAN * 0.3; // Smoke lifespan
      }

       // Initialize turbulence offsets
      turbulenceOffsets[i3] = Math.random() * 100;
      turbulenceOffsets[i3 + 1] = Math.random() * 100;
      turbulenceOffsets[i3 + 2] = Math.random() * 100;
    }

    geometry.setAttribute('position', new THREE_Module.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE_Module.BufferAttribute(velocities, 3));
    geometry.setAttribute('color', new THREE_Module.BufferAttribute(particleColors, 3));
    geometry.setAttribute('alpha', new THREE_Module.BufferAttribute(alphas, 1));
    geometry.setAttribute('particleSize', new THREE_Module.BufferAttribute(particleSizes, 1));
    geometry.setAttribute('life', new THREE_Module.BufferAttribute(lives, 1));
    geometry.setAttribute('turbulenceOffset', new THREE_Module.BufferAttribute(turbulenceOffsets, 3)); // Add turbulence offset attribute

    const material = new THREE_Module.PointsMaterial({
      map: isFireSystem ? fireParticleTexture : smokeParticleTexture,
      depthWrite: false, // Usually true for smoke, false for additive fire
      transparent: true,
      vertexColors: true,
      sizeAttenuation: true, // Make particles smaller further away
    });

     // --- Blending Mode Logic ---
    if (currentBlendMode === "Subtractive" && THREE_Module) {
      material.blending = THREE_Module.CustomBlending;
      material.blendEquation = THREE_Module.ReverseSubtractEquation;
      material.blendSrc = THREE_Module.SrcAlphaFactor;
      material.blendDst = THREE_Module.OneFactor;
      // Set alpha blending separately if needed, default AddEquation is usually fine
      material.blendSrcAlpha = THREE_Module.SrcAlphaFactor;
      material.blendDstAlpha = THREE_Module.OneFactor;
      material.blendEquationAlpha = THREE_Module.AddEquation;
    } else if (THREE_Module) {
      let blendingModeEnum = THREE_Module.NormalBlending; // Default
      switch (currentBlendMode) {
        case "Additive": blendingModeEnum = THREE_Module.AdditiveBlending; break;
        case "Multiply": blendingModeEnum = THREE_Module.MultiplyBlending; break;
        case "Normal": // Explicitly handle Normal
        default: blendingModeEnum = THREE_Module.NormalBlending; break; // Fallback to Normal
      }
      material.blending = blendingModeEnum;
    }


    // --- Shader Customization ---
    material.onBeforeCompile = shader => {
      const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
       // Inject attributes and varyings
      shader.vertexShader = `
        attribute float particleSize;
        attribute float alpha;
        attribute vec3 turbulenceOffset; // Receive offset

        varying float vAlpha;
        varying vec3 vTurbulenceOffset; // Pass offset to fragment if needed (optional)

        ${shader.vertexShader}
      `.replace(
        `#include <begin_vertex>`,
        `#include <begin_vertex>
         transformed = vec3( position );
         vAlpha = alpha;
         vTurbulenceOffset = turbulenceOffset; // Assign to varying
        `
      ).replace(
         // Use sizeAttenuation formula for perspective scaling
         `gl_PointSize = size;`,
         `gl_PointSize = particleSize * ${pixelRatio.toFixed(1)};` // Start with base size * pixelRatio
      ).replace(
        `#include <project_vertex>`,
         `
          #include <project_vertex> // Keep original projection
          #ifdef USE_SIZEATTENUATION
            bool isPerspective = isPerspectiveMatrix( projectionMatrix );
            if ( isPerspective ) gl_PointSize *= ( 100.0 / -mvPosition.z ); // Perspective scaling factor (adjust 100.0 as needed)
          #endif
         `
      );


      shader.fragmentShader = `
        varying float vAlpha;
        varying vec3 vTurbulenceOffset; // Receive offset if needed

        ${shader.fragmentShader}
      `.replace(
        // Use varying alpha for transparency
        `vec4 diffuseColor = vec4( diffuse, opacity );`,
        `vec4 diffuseColor = vec4( vColor, vAlpha * opacity );`
      ).replace(
        // Apply texture map correctly with alpha
        `#include <map_particle_fragment>`,
         `
          #if defined( USE_MAP ) || defined( USE_ALPHAMAP )
            vec2 uv = vUv; // Use vUv if USE_POINTS_UV is defined (which it is by default for PointsMaterial)
          #endif
          #ifdef USE_MAP
            diffuseColor *= texture2D( map, uv );
          #endif
          #ifdef USE_ALPHAMAP
             diffuseColor.a *= texture2D( alphaMap, uv ).g; // Often use green channel for alpha maps
          #endif
         `
      );
    };


    return { geometry, material };
  }, [THREE_Module, smokeParticleTexture, fireParticleTexture, getParticleStartPosition]);


  useEffect(() => {
    if (!mountRef.current || !isThreeLoaded || !THREE_Module || !smokeParticleTexture || !fireParticleTexture) return;

    const scene = sceneRef.current || new THREE_Module.Scene();
    sceneRef.current = scene;

    const camera = cameraRef.current || new THREE_Module.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    camera.position.z = 5;
    cameraRef.current = camera;

    if (!rendererRef.current) {
      rendererRef.current = new THREE_Module.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      rendererRef.current.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      rendererRef.current.setPixelRatio(typeof window !== 'undefined' ? window.devicePixelRatio : 1);
      mountRef.current.appendChild(rendererRef.current.domElement);
      if (onCanvasReady) {
        onCanvasReady(rendererRef.current.domElement);
      }
    }
    rendererRef.current.setClearColor(new THREE_Module.Color(backgroundColor));

    // --- Particle System Initialization/Update ---
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
      sourceType: ParticleSource | "Text",
      blendMode: BlendMode
    ) => {
      if (particlesRef.current) {
        scene.remove(particlesRef.current);
        particlesRef.current.geometry.dispose();
        (particlesRef.current.material as THREE.Material).dispose();
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

    updateOrCreateParticles(smokeParticlesRef, isSmokeEnabled, actualSmokeParticleCount, false, smokeBaseColor, smokeAccentColor, smokeSpeed, smokeSpread, smokeOpacity, smokeSource, smokeBlendMode);
    updateOrCreateParticles(fireParticlesRef, isFireEnabled, actualFireParticleCount, true, fireBaseColor, fireAccentColor, fireSpeed, fireSpread, fireOpacity, fireParticleSource, fireBlendMode);


    // --- Animation Loop ---
    const clock = new THREE_Module.Clock();
    let time = 0; // Accumulate time for noise function

    const animate = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !THREE_Module) return;

      animationFrameIdRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      time += delta;

      if (isPlaying) {
        // --- Update Smoke Particles ---
        if (smokeParticlesRef.current && isSmokeEnabled && actualSmokeParticleCount > 0) {
          const geom = smokeParticlesRef.current.geometry as THREE.BufferGeometry;
          const positions = geom.getAttribute('position') as THREE.BufferAttribute;
          const velocities = geom.getAttribute('velocity') as THREE.BufferAttribute;
          const alphas = geom.getAttribute('alpha') as THREE.BufferAttribute;
          const particleSizesAttr = geom.getAttribute('particleSize') as THREE.BufferAttribute;
          const lives = geom.getAttribute('life') as THREE.BufferAttribute;
          const colorsAttr = geom.getAttribute('color') as THREE.BufferAttribute;
          const turbulenceOffsets = geom.getAttribute('turbulenceOffset') as THREE.BufferAttribute; // Get turbulence offsets

          const currentSmokeBaseC = new THREE_Module.Color(smokeBaseColor);
          const currentSmokeAccentC = new THREE_Module.Color(smokeAccentColor);
          const finalSmokeColor = new THREE_Module.Color();

          const baseLifespan = BASE_SMOKE_LIFESPAN * (1.0 - (smokeDissipation ?? 0) * 0.8);

          for (let i = 0; i < positions.count; i++) {
            lives.setX(i, lives.getX(i) - delta * 15 * (1 + (smokeDissipation ?? 0) * 2));

            if (lives.getX(i) <= 0) { // Reset particle
              const startPos = getParticleStartPosition(false, smokeSource, smokeSpread);
              positions.setXYZ(i, startPos.x, startPos.y, startPos.z);
              velocities.setXYZ(i, (Math.random() - 0.5) * 0.025 * smokeSpread, Math.random() * smokeSpeed * 0.8 + smokeSpeed * 0.2, (Math.random() - 0.5) * 0.025 * smokeSpread);
              lives.setX(i, baseLifespan * (0.7 + Math.random() * 0.6));

              finalSmokeColor.copy(currentSmokeBaseC);
              finalSmokeColor.lerp(currentSmokeAccentC, Math.random() * 0.3);
              colorsAttr.setXYZ(i, finalSmokeColor.r, finalSmokeColor.g, finalSmokeColor.b);

              alphas.setX(i, smokeOpacity * (0.05 + Math.random() * 0.15)); // Reset alpha
              particleSizesAttr.setX(i, (0.6 + Math.random() * 0.6) * (smokeSpread / 1.5)); // Reset size

            } else { // Update existing particle
              const lifeRatio = Math.max(0, lives.getX(i) / (baseLifespan * (0.7 + Math.random() * 0.6))); // Approximate original lifespan used for calculation

               // Turbulence Calculation (using Perlin noise idea)
              const noiseScale = 0.5; // How "zoomed in" the noise pattern is
              const turbulenceStrength = smokeTurbulence * 0.015 * (1.0 + smokeSpread * 0.1); // Scale turbulence with parameter

              const offset = turbulenceOffsets.getX(i * 3); // Use stored offset
              const pX = positions.getX(i) * noiseScale + offset;
              const pY = positions.getY(i) * noiseScale + offset;
              const pZ = positions.getZ(i) * noiseScale + offset;

              // Simple pseudo-random noise (replace with better noise if needed)
              // Using sine functions for some swirling motion
              const timeFactor = time * 0.5; // Noise evolves over time
              const turbX = Math.sin(pY + timeFactor) * Math.cos(pZ + timeFactor) * turbulenceStrength;
              const turbY = Math.sin(pX + timeFactor) * Math.cos(pZ + timeFactor) * turbulenceStrength * 0.5; // Less Y turbulence usually
              const turbZ = Math.sin(pX + timeFactor) * Math.cos(pY + timeFactor) * turbulenceStrength;


              const windEffectX = (windDirectionX || 0) * (windStrength || 0) * delta * 60;
              const buoyancyEffectY = (smokeBuoyancy ?? 0) * delta * 60 * (1.0 + lifeRatio * 0.5); // Buoyancy stronger when young?


              positions.setXYZ(
                i,
                positions.getX(i) + velocities.getX(i) * delta * 60 + turbX + windEffectX,
                positions.getY(i) + velocities.getY(i) * delta * 60 + turbY + buoyancyEffectY,
                positions.getZ(i) + velocities.getZ(i) * delta * 60 + turbZ
              );

              // Fade alpha based on life
              const fadeInEnd = 0.85;
              const fadeOutStart = 0.35;
              let alphaMod = 1.0;
              if (lifeRatio > fadeInEnd) {
                alphaMod = (1.0 - lifeRatio) / (1.0 - fadeInEnd);
              } else if (lifeRatio < fadeOutStart) {
                alphaMod = lifeRatio / fadeOutStart;
              }
              // Ensure alpha doesn't exceed initial random range significantly
              alphas.setX(i, Math.min(smokeOpacity * 0.8, smokeOpacity * (0.4 + Math.random() * 0.3) * THREE_Module.MathUtils.smootherstep(alphaMod, 0, 1)));


              // Increase size slightly over life, more variation
              const sizeGrowthFactor = 1.0 + (1.0 - lifeRatio) * (1.5 + smokeSpread * 0.1 + Math.random() * 0.5);
              // Clamp size growth to avoid huge particles
              const currentSize = particleSizesAttr.getX(i);
              particleSizesAttr.setX(i, Math.min(currentSize * (1.0 + delta * sizeGrowthFactor * 0.1), smokeSpread * 4.0)); // Max size related to spread
            }
          }
          positions.needsUpdate = true; velocities.needsUpdate = true; alphas.needsUpdate = true;
          particleSizesAttr.needsUpdate = true; lives.needsUpdate = true; colorsAttr.needsUpdate = true;
        }

        // --- Update Fire Particles ---
        if (fireParticlesRef.current && isFireEnabled && actualFireParticleCount > 0) {
           const geom = fireParticlesRef.current.geometry as THREE.BufferGeometry;
            const positions = geom.getAttribute('position') as THREE.BufferAttribute;
            const velocities = geom.getAttribute('velocity') as THREE.BufferAttribute;
            const alphas = geom.getAttribute('alpha') as THREE.BufferAttribute;
            const particleSizesAttr = geom.getAttribute('particleSize') as THREE.BufferAttribute;
            const lives = geom.getAttribute('life') as THREE.BufferAttribute;
            const colorsAttr = geom.getAttribute('color') as THREE.BufferAttribute;
            const turbulenceOffsets = geom.getAttribute('turbulenceOffset') as THREE.BufferAttribute;

            const currentFireBaseC = new THREE_Module.Color(fireBaseColor);
            const currentFireAccentC = new THREE_Module.Color(fireAccentColor);
            const finalFireColor = new THREE_Module.Color();
            const fullFireLifespan = BASE_FIRE_LIFESPAN * (0.7 + Math.random() * 0.6); // Use consistent lifespan calculation


            for (let i = 0; i < positions.count; i++) {
                lives.setX(i, lives.getX(i) - delta * 20); // Fire lives decrease faster

                if (lives.getX(i) <= 0) { // Reset particle
                    const startPos = getParticleStartPosition(true, fireParticleSource, fireSpread);
                    positions.setXYZ(i, startPos.x, startPos.y, startPos.z);
                    // Reset velocity for fire
                    velocities.setXYZ(i,
                        (Math.random() - 0.5) * 0.02 * fireSpread,
                        (Math.random() * fireSpeed * 1.8) + fireSpeed * 1.5,
                        (Math.random() - 0.5) * 0.02 * fireSpread
                    );
                    lives.setX(i, fullFireLifespan); // Reset life

                    // Reset color with variation
                    finalFireColor.copy(currentFireBaseC);
                    finalFireColor.lerp(currentFireAccentC, Math.random() * 0.7);
                    const fireHsl = { h: 0, s: 0, l: 0 };
                    finalFireColor.getHSL(fireHsl);
                    finalFireColor.setHSL(
                        fireHsl.h + (Math.random() -0.5) * 0.05,
                        Math.max(0.85, fireHsl.s - Math.random() * 0.1),
                        Math.min(0.95, fireHsl.l + Math.random() * 0.1)
                    );
                    colorsAttr.setXYZ(i, finalFireColor.r, finalFireColor.g, finalFireColor.b);

                    alphas.setX(i, fireOpacity * (0.8 + Math.random() * 0.2)); // Reset alpha
                    particleSizesAttr.setX(i, (0.6 + Math.random() * 0.6) * (fireSpread / 1.1)); // Reset size

                } else { // Update existing particle
                    const lifeRatio = Math.max(0, lives.getX(i) / fullFireLifespan);

                    // Turbulence Calculation for Fire (sharper, faster)
                    const noiseScale = 0.8;
                    const turbulenceStrength = fireTurbulence * 0.025 * (1.0 + fireSpread * 0.15);
                    const offset = turbulenceOffsets.getX(i * 3);
                    const pX = positions.getX(i) * noiseScale + offset;
                    const pY = positions.getY(i) * noiseScale + offset;
                    const pZ = positions.getZ(i) * noiseScale + offset;

                    const timeFactor = time * 1.5; // Faster evolution for fire noise
                    const turbX = Math.sin(pY + timeFactor * 1.2) * Math.cos(pZ + timeFactor * 0.8) * turbulenceStrength;
                    const turbY = Math.sin(pX + timeFactor * 1.1) * Math.cos(pZ + timeFactor * 0.9) * turbulenceStrength * 1.5; // More Y turbulence for fire flicker
                    const turbZ = Math.sin(pX + timeFactor * 0.9) * Math.cos(pY + timeFactor * 1.3) * turbulenceStrength;


                    const windEffectX = (windDirectionX || 0) * (windStrength || 0) * delta * 60 * 0.5; // Wind affects fire less maybe?

                    positions.setXYZ(
                        i,
                        positions.getX(i) + velocities.getX(i) * delta * 60 + turbX + windEffectX,
                        positions.getY(i) + velocities.getY(i) * delta * 60 + turbY, // No buoyancy for fire? Or minimal if needed.
                        positions.getZ(i) + velocities.getZ(i) * delta * 60 + turbZ
                    );

                    // Fade alpha based on life (fire fades faster)
                    alphas.setX(i, fireOpacity * (0.8 + Math.random() * 0.2) * Math.pow(lifeRatio, 1.5)); // Faster fade

                    // Fire particles might shrink slightly or stay consistent
                    const sizeFactor = 0.98 + lifeRatio * 0.05 + Math.random() * 0.02; // Slight variation, generally stable/shrinking
                    particleSizesAttr.setX(i, particleSizesAttr.getX(i) * sizeFactor);
                 }
            }
            positions.needsUpdate = true; velocities.needsUpdate = true; alphas.needsUpdate = true;
            particleSizesAttr.needsUpdate = true; lives.needsUpdate = true; colorsAttr.needsUpdate = true;
        }
      }
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    animate();

    const debouncedResizeHandler = debounce(() => {
      if (mountRef.current && rendererRef.current && cameraRef.current && THREE_Module) {
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        rendererRef.current.setSize(width, height);
        rendererRef.current.setPixelRatio(typeof window !== 'undefined' ? window.devicePixelRatio : 1);
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
      }
    }, 250);

    window.addEventListener('resize', debouncedResizeHandler);

    return () => {
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      window.removeEventListener('resize', debouncedResizeHandler);
      // Clean up scene objects when dependencies change or component unmounts
      sceneRef.current?.remove(smokeParticlesRef.current!);
      smokeParticlesRef.current?.geometry.dispose();
      (smokeParticlesRef.current?.material as THREE.Material)?.dispose();
      smokeParticlesRef.current = null;

      sceneRef.current?.remove(fireParticlesRef.current!);
      fireParticlesRef.current?.geometry.dispose();
      (fireParticlesRef.current?.material as THREE.Material)?.dispose();
      fireParticlesRef.current = null;

      // Consider full cleanup only on unmount if necessary
      // rendererRef.current?.dispose();
      // mountRef.current?.removeChild(rendererRef.current.domElement);
      // sceneRef.current = null; cameraRef.current = null; rendererRef.current = null;
    };
  }, [
    // Include all props that affect initialization or the animation loop
    isThreeLoaded, THREE_Module, onCanvasReady, initParticles, getParticleStartPosition, // Core functions
    backgroundColor, windDirectionX, windStrength, isPlaying, // Scene & Playback
    // Smoke dependencies
    isSmokeEnabled, actualSmokeParticleCount, smokeBaseColor, smokeAccentColor, smokeSpeed, smokeSpread, smokeOpacity, smokeTurbulence, smokeSource, smokeBlendMode, smokeDissipation, smokeBuoyancy,
    // Fire dependencies
    isFireEnabled, actualFireParticleCount, fireBaseColor, fireAccentColor, fireSpeed, fireSpread, fireOpacity, fireTurbulence, fireParticleSource, fireBlendMode,
    // Text shaping dependency
    particleText, // Add particleText here
    // Textures (stable if memoized correctly)
    smokeParticleTexture, fireParticleTexture
  ]);


  // --- Effects for dynamic material property updates ---
  useEffect(() => {
    if (smokeParticlesRef.current && smokeParticlesRef.current.material && THREE_Module && isThreeLoaded) {
      const material = smokeParticlesRef.current.material as THREE.PointsMaterial;
      let newBlendingMode = THREE_Module.NormalBlending;
      if (smokeBlendMode === "Subtractive") {
        material.blending = THREE_Module.CustomBlending;
        material.blendEquation = THREE_Module.ReverseSubtractEquation;
        material.blendSrc = THREE_Module.SrcAlphaFactor;
        material.blendDst = THREE_Module.OneFactor;
      } else {
         switch(smokeBlendMode) {
            case "Additive": newBlendingMode = THREE_Module.AdditiveBlending; break;
            case "Multiply": newBlendingMode = THREE_Module.MultiplyBlending; break;
            case "Normal": default: newBlendingMode = THREE_Module.NormalBlending; break;
         }
         material.blending = newBlendingMode;
      }
      material.needsUpdate = true;
    }
  }, [smokeBlendMode, isThreeLoaded, THREE_Module]);

  useEffect(() => {
    if (fireParticlesRef.current && fireParticlesRef.current.material && THREE_Module && isThreeLoaded) {
      const material = fireParticlesRef.current.material as THREE.PointsMaterial;
       let newBlendingMode = THREE_Module.AdditiveBlending; // Default Additive for fire
      if (fireBlendMode === "Subtractive") {
          material.blending = THREE_Module.CustomBlending;
          material.blendEquation = THREE_Module.ReverseSubtractEquation;
          material.blendSrc = THREE_Module.SrcAlphaFactor;
          material.blendDst = THREE_Module.OneFactor;
      } else {
          switch(fireBlendMode) {
            case "Additive": newBlendingMode = THREE_Module.AdditiveBlending; break;
            case "Multiply": newBlendingMode = THREE_Module.MultiplyBlending; break;
            case "Normal": newBlendingMode = THREE_Module.NormalBlending; break; // Allow normal for fire too
            default: newBlendingMode = THREE_Module.AdditiveBlending; break;
          }
           material.blending = newBlendingMode;
      }
      material.needsUpdate = true;
    }
  }, [fireBlendMode, isThreeLoaded, THREE_Module]);

  useEffect(() => {
    if (rendererRef.current && THREE_Module && isThreeLoaded) {
      rendererRef.current.setClearColor(new THREE_Module.Color(backgroundColor));
    }
  }, [backgroundColor, THREE_Module, isThreeLoaded]);


  // --- Render ---
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
        {/* Consider adding a Skeleton loader here */}
        <p className="text-lg animate-pulse">Loading 3D Smoke & Fire Simulation...</p>
      </div>
    );
  }

  return <div ref={mountRef} className="w-full h-full" role="img" aria-label="Smoke and fire simulation canvas" data-ai-hint="smoke fire particles" />;
};

export default SmokeCanvas;
