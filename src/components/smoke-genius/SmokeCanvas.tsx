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
  persistTextShape?: boolean;

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

const BASE_FIRE_LIFESPAN = 60;
const BASE_SMOKE_LIFESPAN = 250;
const BOTTOM_SOURCE_X_SPREAD = 12.0;

const TEXT_CANVAS_WIDTH = 512;
const TEXT_CANVAS_HEIGHT = 128;
const TEXT_FONT_SIZE = 80;
const TEXT_FONT = `bold ${TEXT_FONT_SIZE}px Arial, sans-serif`;
const TEXT_SAMPLE_DENSITY = 0.3;
const TEXT_SHAPE_SCALE = 0.02;
const PERSIST_JITTER_STRENGTH = 0.001;
const PERSIST_PULL_FACTOR = 0.05;

type EffectiveParticleSource = ParticleSource | "Text";

const SmokeCanvas: React.FC<SmokeCanvasProps> = ({
  isSmokeEnabled = true,
  smokeDensity = 6500,
  smokeBaseColor = '#FFFFFF',
  smokeAccentColor = '#E0E0E0',
  smokeSpeed = 0.015,
  smokeSpread = 1.5,
  smokeBlendMode = "Normal",
  smokeSource: smokeSourceProp = "Bottom",
  smokeOpacity = 0.5,
  smokeTurbulence = 1.2,
  smokeDissipation = 0.15,
  smokeBuoyancy = 0.005,
  particleText = "",
  persistTextShape = false,

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

  const effectiveSmokeSource: EffectiveParticleSource = particleText ? "Text" : smokeSourceProp;
  const effectiveFireSource: EffectiveParticleSource = particleText ? "Text" : fireSourceProp;

  // Debounced particle update function
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
        // Dispose existing resources
        if (particlesRef.current) {
            if (particlesRef.current.geometry) {
                particlesRef.current.geometry.dispose();
            }
            if (particlesRef.current.material) {
                const material = particlesRef.current.material;
                if (Array.isArray(material)) {
                    material.forEach(m => {
                        if (m.map) m.map.dispose();
                        m.dispose();
                    });
                } else {
                    if (material.map) material.map.dispose();
                    material.dispose();
                }
            }
            scene.remove(particlesRef.current);
            particlesRef.current = null; // Important: Set to null after removal and disposal
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
    [ // Dependencies listed below after initParticles definition
      isThreeLoaded, THREE_Module, // initParticles added below
      isSmokeEnabled, actualSmokeParticleCount, smokeBaseColor, smokeAccentColor, smokeSpeed, smokeSpread, smokeOpacity, effectiveSmokeSource, smokeBlendMode,
      isFireEnabled, actualFireParticleCount, fireBaseColor, fireAccentColor, fireSpeed, fireSpread, fireOpacity, effectiveFireSource, fireBlendMode,
      persistTextShape
    ]
  );


  useEffect(() => {
    textCanvasRef.current = document.createElement('canvas');
    textCanvasRef.current.width = TEXT_CANVAS_WIDTH;
    textCanvasRef.current.height = TEXT_CANVAS_HEIGHT;
    // Cleanup canvas element on unmount
     return () => {
       if (textCanvasRef.current) {
         textCanvasRef.current = null; // Remove reference
       }
     };
  }, []);

  const generateTextPoints = useCallback((text: string) => {
    if (!textCanvasRef.current || !text) {
      textPointsRef.current = [];
      debouncedUpdateParticles(); // Trigger reset if text is cleared
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
    const step = Math.max(1, Math.floor(1 / Math.sqrt(TEXT_SAMPLE_DENSITY)));

    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        const alphaIndex = (y * canvas.width + x) * 4 + 3;
        if (data[alphaIndex] > 128) {
             if (Math.random() < TEXT_SAMPLE_DENSITY * step * step ) {
                const sceneX = (x - canvas.width / 2) * TEXT_SHAPE_SCALE;
                const sceneY = -(y - canvas.height / 2) * TEXT_SHAPE_SCALE;
                points.push({ x: sceneX, y: sceneY });
             }
        }
      }
    }
    textPointsRef.current = points;
    debouncedUpdateParticles(); // Trigger particle reset after generating points
  }, [debouncedUpdateParticles]);


  useEffect(() => {
    const debouncedGenerate = debounce(() => generateTextPoints(particleText), 300);
    debouncedGenerate();
    // Cleanup function for debounced call
    return () => {
        debouncedGenerate.clear?.(); // Assuming debounce utility has a clear method
    };
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
     const mouseXNDC = ((event.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
     const mouseYNDC = -((event.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;

     const vec = new THREE_Module.Vector3(mouseXNDC, mouseYNDC, 0.5);
     vec.unproject(cameraRef.current);
     const dir = vec.sub(cameraRef.current.position).normalize();
     if (Math.abs(dir.z) < 1e-6) return;
     const distance = -cameraRef.current.position.z / dir.z;
     if (isNaN(distance) || !isFinite(distance) || distance < 0) return;

     const pos = cameraRef.current.position.clone().add(dir.multiplyScalar(distance));
     if (isNaN(pos.x) || isNaN(pos.y)) return;

     mouseSceneXRef.current = pos.x;
     mouseSceneYRef.current = pos.y;
   }, [THREE_Module]);


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

    const gradient = context.createRadialGradient(
        size / 2, size / 2, size * 0.05,
        size / 2, size / 2, size * 0.45
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

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
      cameraPositionZ: number = 5
    ): { x: number; y: number; z: number } => {
    if (!THREE_Module) return { x: 0, y: -2.0, z: 0 };

    let x = 0, y = 0, z = 0;
    const yBaseline = -cameraPositionZ * 0.45; // Adjusted baseline closer to bottom edge
    const safeSpread = isNaN(spreadValue) || !isFinite(spreadValue) ? 1.0 : spreadValue;

    switch (sourceType) {
      case "Text":
        if (textPointsRef.current.length > 0) {
          const point = textPointsRef.current[Math.floor(Math.random() * textPointsRef.current.length)];
          const pointX = isNaN(point.x) ? 0 : point.x;
          const pointY = isNaN(point.y) ? 0 : point.y;

          x = pointX + (Math.random() - 0.5) * safeSpread * 0.05;
          y = pointY + (Math.random() - 0.5) * safeSpread * 0.05;
          z = (Math.random() - 0.5) * safeSpread * 0.05;
        } else {
          // Fallback if text points are empty but source is Text
          x = (Math.random() - 0.5) * safeSpread * (isFire ? 1.0 : 1.5);
          y = yBaseline + (isFire ? 0.0 : 0.5) + (Math.random() - 0.5) * 0.2;
          z = (Math.random() - 0.5) * safeSpread * (isFire ? 1.0 : 1.5);
        }
        break;
      case "Bottom":
        x = (Math.random() - 0.5) * BOTTOM_SOURCE_X_SPREAD; // Use wider spread for bottom
        y = yBaseline + (isFire ? Math.random() * 0.1 : Math.random() * 0.3); // Start slightly above baseline
        z = (Math.random() - 0.5) * safeSpread * 0.2;
        break;
      case "Mouse":
        const mouseX = isNaN(mouseSceneXRef.current) ? 0 : mouseSceneXRef.current;
        const mouseY = isNaN(mouseSceneYRef.current) ? 0 : mouseSceneYRef.current;
        const mouseSpreadFactor = isFire ? 0.2 : 0.3;
        x = mouseX + (Math.random() - 0.5) * safeSpread * mouseSpreadFactor;
        y = mouseY + (Math.random() - 0.5) * safeSpread * mouseSpreadFactor;
        z = (Math.random() - 0.5) * safeSpread * mouseSpreadFactor * 0.1;
        break;
      case "Center":
      default:
        x = (Math.random() - 0.5) * safeSpread * (isFire ? 1.0 : 1.5);
        y = 0 + (Math.random() - 0.5) * 0.2; // Centered vertically slightly
        z = (Math.random() - 0.5) * safeSpread * (isFire ? 1.0 : 1.5);
        break;
    }
    if (isNaN(x) || isNaN(y) || isNaN(z)) {
        console.warn("NaN detected in particle start position, resetting.");
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
    const turbulenceOffsets = new Float32Array(safeCount * 3);
    const rotationSpeeds = new Float32Array(safeCount);
    const targetTextPoints = new Float32Array(safeCount * 3);
    const randomFactors = new Float32Array(safeCount * 3); // Store random factors per particle

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
      velocities[i3 + 1] = isNaN(velY) ? (isFireSystem ? 0.02 : 0.01) : Math.max(0.001, velY);
      velocities[i3 + 2] = isNaN(velZ) ? 0 : velZ;

      const colorLerpFactor = Math.random();
      finalColor.copy(baseC).lerp(accentC, colorLerpFactor);
      particleColors[i3] = finalColor.r;
      particleColors[i3 + 1] = finalColor.g;
      particleColors[i3 + 2] = finalColor.b;

      // Store random factors for later use in alpha/size calculation
      randomFactors[i3] = Math.random(); // Factor 1 (e.g., for base alpha)
      randomFactors[i3 + 1] = Math.random(); // Factor 2 (e.g., for base size)
      randomFactors[i3 + 2] = Math.random(); // Factor 3 (e.g., for lifespan variation)


      let particleSize;
      let lifespan;
      if (isFireSystem) {
        alphas[i] = safeOpacity * (0.7 + randomFactors[i3] * 0.3); // Use random factor
        particleSize = (0.5 + randomFactors[i3 + 1] * 0.5) * safeSpread * 1.2; // Use random factor
        lifespan = BASE_FIRE_LIFESPAN * (0.5 + randomFactors[i3 + 2] * 0.8); // Use random factor
      } else {
        // Increase initial smoke alpha slightly
        alphas[i] = safeOpacity * (0.3 + randomFactors[i3] * 0.3); // Starts between 0.3 and 0.6 * opacity
        particleSize = (1.2 + randomFactors[i3 + 1] * 1.0) * safeSpread * 1.5; // Use random factor
        lifespan = BASE_SMOKE_LIFESPAN * (0.6 + randomFactors[i3 + 2] * 0.7); // Use random factor
      }
      particleSizes[i] = isNaN(particleSize) ? 0.1 : Math.max(0.02, particleSize);
      lives[i] = (isNaN(lifespan) ? (isFireSystem ? BASE_FIRE_LIFESPAN : BASE_SMOKE_LIFESPAN) : lifespan) * randomFactors[i3]; // Stagger start life using random factor

      turbulenceOffsets[i3] = Math.random() * 2 * Math.PI;
      turbulenceOffsets[i3 + 1] = Math.random() * 2 * Math.PI;
      turbulenceOffsets[i3 + 2] = Math.random() * 100; // Keep this for noise time offset

      rotationSpeeds[i] = (Math.random() - 0.5) * 0.05;

      if (textPointsRef.current.length > 0) {
        const point = textPointsRef.current[i % textPointsRef.current.length];
        targetTextPoints[i3] = point.x;
        targetTextPoints[i3 + 1] = point.y;
        targetTextPoints[i3 + 2] = 0;
      } else {
        targetTextPoints[i3] = startPos.x;
        targetTextPoints[i3 + 1] = startPos.y;
        targetTextPoints[i3 + 2] = startPos.z;
      }
    }

    geometry.setAttribute('position', new THREE_Module.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE_Module.BufferAttribute(velocities, 3));
    geometry.setAttribute('color', new THREE_Module.BufferAttribute(particleColors, 3));
    geometry.setAttribute('alpha', new THREE_Module.BufferAttribute(alphas, 1));
    geometry.setAttribute('particleSize', new THREE_Module.BufferAttribute(particleSizes, 1));
    geometry.setAttribute('life', new THREE_Module.BufferAttribute(lives, 1));
    geometry.setAttribute('turbulenceOffset', new THREE_Module.BufferAttribute(turbulenceOffsets, 3));
    geometry.setAttribute('rotationSpeed', new THREE_Module.BufferAttribute(rotationSpeeds, 1));
    geometry.setAttribute('targetTextPoint', new THREE_Module.BufferAttribute(targetTextPoints, 3));
    geometry.setAttribute('randomFactors', new THREE_Module.BufferAttribute(randomFactors, 3)); // Add random factors


    const material = new THREE_Module.PointsMaterial({
      map: isFireSystem ? fireParticleTexture : smokeParticleTexture,
      depthWrite: false,
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

        // Add necessary attributes and varyings
        shader.vertexShader = `
            attribute float particleSize;
            attribute float alpha;
            attribute vec3 turbulenceOffset;
            attribute float rotationSpeed;
            varying float vAlpha;
            varying float vRotation;
            uniform float time;
            // 'scale' uniform is provided by Three.js for PointsMaterial if sizeAttenuation is true

            ${shader.vertexShader}
        `;

        // Replace the standard vertex projection logic to include custom size calculation
        shader.vertexShader = shader.vertexShader.replace(
            `#include <project_vertex>`,
            `
            #include <project_vertex>

            // Custom point size calculation logic
            float basePointSize = particleSize * ${pixelRatio.toFixed(1)} * ${isFireSystem ? '1.3' : '2.5'};

            #ifdef USE_SIZEATTENUATION
                // Three.js provides 'scale' which is usually renderer.height / 2.0
                bool isPerspective = isPerspectiveMatrix( projectionMatrix );
                if ( isPerspective ) {
                    float perspectiveScale = clamp(scale / - mvPosition.z, 0.5, 5.0);
                    gl_PointSize = basePointSize * perspectiveScale;
                } else {
                    gl_PointSize = basePointSize;
                }
            #else
                gl_PointSize = basePointSize;
            #endif

            gl_PointSize = max(1.0, gl_PointSize); // Ensure minimum size
            `
        );

         // Remove potentially conflicting default size assignments or blocks
         shader.vertexShader = shader.vertexShader.replace(
             `gl_PointSize = size;`,
             `` // Remove default simple size assignment if 'size' is the default attribute
         );
         // Remove the block where Three.js might redefine isPerspective or scale
         shader.vertexShader = shader.vertexShader.replace(
             /#ifdef USE_SIZEATTENUATION\s*bool isPerspective = isPerspectiveMatrix\( projectionMatrix \);\s*if \( isPerspective \) gl_PointSize \*= \( scale \/ - mvPosition\.z \);\s*#endif/g,
             ``
         );


        // Ensure vAlpha and vRotation are assigned AFTER standard calculations but before fog/clipping
        shader.vertexShader = shader.vertexShader.replace(
            `#include <logdepthbuf_vertex>`,
            `#include <logdepthbuf_vertex>
             vAlpha = alpha;
             vRotation = rotationSpeed * time;
            `
        );


        // Fragment shader modifications for alpha and texture rotation
        shader.fragmentShader = `
            varying float vAlpha;
            varying float vRotation;
            ${shader.fragmentShader}
        `
        .replace(
            `#include <color_fragment>`,
            `#include <color_fragment>
             diffuseColor.a *= vAlpha; // Apply calculated alpha
             `
        )
        .replace(
            `#include <map_particle_fragment>`,
            `
             #ifdef USE_MAP
                // Rotate particle texture UVs
                vec2 center = vec2(0.5, 0.5);
                float cos_rot = cos(vRotation);
                float sin_rot = sin(vRotation);
                vec2 rotated_uv = mat2(cos_rot, -sin_rot, sin_rot, cos_rot) * (gl_PointCoord - center) + center;

                vec4 mapTexel = texture2D( map, rotated_uv );
                // Ensure map texel alpha contributes to overall alpha, especially for Normal Blending
                diffuseColor *= mapTexel;
             #endif
             `
        );

        // Add uniforms needed by custom shader code
        shader.uniforms.time = { value: 0.0 };
        // No need to manually add shader.uniforms.scale if sizeAttenuation is true.
    };

    return { geometry, material };
  }, [THREE_Module, smokeParticleTexture, fireParticleTexture, getParticleStartPosition, textPointsRef]);

  // Add initParticles to the dependency array of debouncedUpdateParticles
  useEffect(() => {
    debouncedUpdateParticles.dependency = initParticles;
  }, [initParticles, debouncedUpdateParticles]);


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

        // Update shader time uniform
        const updateShaderTime = (particlesRef: React.RefObject<THREE.Points>) => {
          if (particlesRef.current?.material) {
             try {
                 const material = particlesRef.current.material as THREE.PointsMaterial & {uniforms?: any}; // Type assertion
                 if (material.uniforms?.time) {
                   material.uniforms.time.value = time;
                 }
             } catch (e) {
                 // Catch potential errors if material structure changes unexpectedly
                 // console.warn("Could not update shader time uniform", e);
             }
          }
        };
        updateShaderTime(smokeParticlesRef);
        updateShaderTime(fireParticlesRef);

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

          const shouldPersist = !!particleText && persistTextShape && textPointsRef.current.length > 0;

         // --- PARTICLE UPDATE FUNCTION ---
          const updateParticles = (
              particlesRef: React.RefObject<THREE.Points>,
              isEnabled: boolean,
              isFire: boolean,
              particleCount: number,
              speed: number, spread: number, opacity: number, turbulence: number,
              dissipation: number | undefined, buoyancy: number | undefined, // Smoke only
              baseColor: THREE.Color, accentColor: THREE.Color, finalColor: THREE.Color,
              particleSourceType: EffectiveParticleSource,
              timeFactor: number
          ) => {
              if (!particlesRef.current || !isEnabled || particleCount === 0) return;

              const geom = particlesRef.current.geometry as THREE.BufferGeometry;
              const attributes = geom.attributes;
              if (!attributes.position || !attributes.velocity || !attributes.alpha || !attributes.particleSize || !attributes.life || !attributes.color || !attributes.turbulenceOffset || !attributes.targetTextPoint || !attributes.randomFactors) {
                  console.warn("Missing particle attributes, skipping update for", isFire ? "fire" : "smoke");
                  return;
              }

              const posArray = (attributes.position as THREE.BufferAttribute).array as Float32Array;
              const velArray = (attributes.velocity as THREE.BufferAttribute).array as Float32Array;
              const alphaArray = (attributes.alpha as THREE.BufferAttribute).array as Float32Array;
              const sizeArray = (attributes.particleSize as THREE.BufferAttribute).array as Float32Array;
              const lifeArray = (attributes.life as THREE.BufferAttribute).array as Float32Array;
              const colorArray = (attributes.color as THREE.BufferAttribute).array as Float32Array;
              const turbOffsetArray = (attributes.turbulenceOffset as THREE.BufferAttribute).array as Float32Array;
              const targetPointArray = (attributes.targetTextPoint as THREE.BufferAttribute).array as Float32Array;
              const randomFactorsArray = (attributes.randomFactors as THREE.BufferAttribute).array as Float32Array;


              const safeOpacity = isNaN(opacity) ? (isFire ? 0.7 : 0.5) : opacity;
              const safeSpread = isNaN(spread) ? 1.0 : spread;
              const baseLifespan = isFire ? BASE_FIRE_LIFESPAN : BASE_SMOKE_LIFESPAN;
              const safeSpeed = isNaN(speed) ? (isFire ? 0.03 : 0.015) : speed;
              const safeTurbulence = isNaN(turbulence) ? 1.0 : turbulence;
              const safeDissipation = isNaN(dissipation ?? 0.15) ? 0.15 : (dissipation ?? 0.15); // Default dissipation
              const safeSmokeBuoyancy = isNaN(buoyancy ?? 0.005) ? 0.005 : (buoyancy ?? 0.005); // Default buoyancy

              const camZ = cameraRef.current?.position.z ?? 5;
              const resetHeight = camZ * (isFire ? 0.8 : 0.7);

              for (let i = 0; i < particleCount; i++) {
                  const i3 = i * 3;

                  if (shouldPersist && attributes.targetTextPoint) {
                      // --- Persistence Logic ---
                      const targetX = targetPointArray[i3];
                      const targetY = targetPointArray[i3 + 1];
                      const targetZ = targetPointArray[i3 + 2];
                      const currentX = posArray[i3];
                      const currentY = posArray[i3 + 1];
                      const currentZ = posArray[i3 + 2];

                       if (!isNaN(targetX) && !isNaN(targetY) && !isNaN(targetZ) && !isNaN(currentX) && !isNaN(currentY) && !isNaN(currentZ)) {
                          posArray[i3] += (targetX - currentX) * PERSIST_PULL_FACTOR * safeDelta * 60;
                          posArray[i3 + 1] += (targetY - currentY) * PERSIST_PULL_FACTOR * safeDelta * 60;
                          posArray[i3 + 2] += (targetZ - currentZ) * PERSIST_PULL_FACTOR * safeDelta * 60;
                       } else {
                           // Handle potential NaN values if they occur
                           if (isNaN(posArray[i3])) posArray[i3] = targetX;
                           if (isNaN(posArray[i3+1])) posArray[i3+1] = targetY;
                           if (isNaN(posArray[i3+2])) posArray[i3+2] = targetZ;
                       }


                      const jitter = PERSIST_JITTER_STRENGTH * safeSpread;
                      posArray[i3] += (Math.random() - 0.5) * jitter;
                      posArray[i3 + 1] += (Math.random() - 0.5) * jitter;
                      posArray[i3 + 2] += (Math.random() - 0.5) * jitter;

                      lifeArray[i] = baseLifespan; // Keep life full
                      alphaArray[i] = safeOpacity; // Keep opacity constant

                      velArray[i3] = 0;
                      velArray[i3 + 1] = 0;
                      velArray[i3 + 2] = 0;

                  } else {
                      // --- Normal Simulation Logic ---
                      const lifeDecreaseFactor = safeDelta * (15 + safeDissipation * 40); // Scale dissipation effect more
                      const currentLife = lifeArray[i] - lifeDecreaseFactor;
                      lifeArray[i] = currentLife;

                      if (currentLife <= 0 || posArray[i3 + 1] > resetHeight || isNaN(posArray[i3+1])) {
                          // Reset particle
                          const startPos = getParticleStartPosition(isFire, particleSourceType, safeSpread, camZ);
                          posArray[i3] = startPos.x;
                          posArray[i3 + 1] = startPos.y;
                          posArray[i3 + 2] = startPos.z;

                           let velX = 0, velY = 0, velZ = 0;
                           const randomFactor1 = Math.random();
                           const randomFactor2 = Math.random();
                           const randomFactor3 = Math.random();
                           randomFactorsArray[i3] = randomFactor1;
                           randomFactorsArray[i3+1] = randomFactor2;
                           randomFactorsArray[i3+2] = randomFactor3;

                           let resetLife = (isFire ? BASE_FIRE_LIFESPAN : BASE_SMOKE_LIFESPAN) * (0.5 + randomFactor3 * 0.8);
                           let resetAlpha = safeOpacity * (isFire ? (0.7 + randomFactor1 * 0.3) : (0.3 + randomFactor1 * 0.3));
                           let resetSize = (isFire ? (0.5 + randomFactor2 * 0.5) * safeSpread * 1.2 : (1.2 + randomFactor2 * 1.0) * safeSpread * 1.5);


                          if (isFire) {
                              velX = (Math.random() - 0.5) * 0.03 * safeSpread;
                              velY = (Math.random() * 0.8 + 0.6) * safeSpeed * 2.0;
                              velZ = (Math.random() - 0.5) * 0.03 * safeSpread;
                          } else {
                              velX = (Math.random() - 0.5) * 0.015 * safeSpread;
                              velY = (Math.random() * 0.5 + 0.8) * safeSpeed + safeSmokeBuoyancy * 5; // Initial buoyancy boost scaled up
                              velZ = (Math.random() - 0.5) * 0.015 * safeSpread;
                          }

                          velArray[i3] = isNaN(velX) ? 0 : velX;
                          velArray[i3 + 1] = isNaN(velY) ? (isFire ? 0.02 : 0.01) : Math.max(0.001, velY);
                          velArray[i3 + 2] = isNaN(velZ) ? 0 : velZ;

                          lifeArray[i] = resetLife;
                          alphaArray[i] = isNaN(resetAlpha) ? safeOpacity * (isFire ? 0.7 : 0.3) : resetAlpha; // Use default if NaN
                          sizeArray[i] = isNaN(resetSize) ? 0.1 : Math.max(0.02, resetSize);


                          const colorLerpFactor = Math.random();
                          finalColor.copy(baseColor).lerp(accentColor, colorLerpFactor);
                          colorArray[i3] = finalColor.r;
                          colorArray[i3 + 1] = finalColor.g;
                          colorArray[i3 + 2] = finalColor.b;

                           // Reset target point if text exists, otherwise use start pos
                            if (textPointsRef.current.length > 0 && attributes.targetTextPoint) {
                               const point = textPointsRef.current[i % textPointsRef.current.length];
                               targetPointArray[i3] = point.x;
                               targetPointArray[i3 + 1] = point.y;
                               targetPointArray[i3 + 2] = 0;
                            } else if (attributes.targetTextPoint) {
                               targetPointArray[i3] = startPos.x;
                               targetPointArray[i3 + 1] = startPos.y;
                               targetPointArray[i3 + 2] = startPos.z;
                            }

                      } else {
                          // Update existing particle
                           const currentBaseLifespan = (isFire ? BASE_FIRE_LIFESPAN : BASE_SMOKE_LIFESPAN) * (0.5 + randomFactorsArray[i3+2] * 0.8); // Use stored random factor
                           const lifeRatio = Math.max(0, Math.min(1, currentLife / Math.max(0.01, currentBaseLifespan)));

                          const tx = turbOffsetArray[i3];
                          const ty = turbOffsetArray[i3 + 1];
                          const tz = turbOffsetArray[i3 + 2];
                          const noiseTime = timeFactor + tz * 0.01;

                          const turbulenceStrength = safeTurbulence * (isFire ? 0.015 : 0.008) * safeDelta * 60;
                          const turbulenceScale = isFire ? 0.8 : 0.6;

                           const turbX = Math.sin(posArray[i3 + 1] * turbulenceScale * (isFire ? 1.0 : 0.5) + noiseTime + tx + Math.cos(posArray[i3] * turbulenceScale * (isFire ? 0.8 : 0.3) + noiseTime)) * turbulenceStrength * (isFire ? 1.2 : 1.5);
                           const turbY = Math.cos(posArray[i3] * turbulenceScale * (isFire ? 1.0 : 0.5) + noiseTime + ty + Math.sin(posArray[i3+1] * turbulenceScale * (isFire ? 0.6 : 0.2) + noiseTime)) * turbulenceStrength * (isFire ? 2.0 : 1.5);
                           const turbZ = Math.sin(posArray[i3 + 2] * turbulenceScale + noiseTime + tx + ty) * turbulenceStrength * 0.8;

                          // Apply forces
                          if (!isFire) {
                            velArray[i3 + 1] += safeSmokeBuoyancy * safeDelta * 60; // Apply buoyancy force continuously
                          }
                          velArray[i3 + 1] *= isFire ? 0.99 : 0.98; // Damping Y
                          velArray[i3] *= isFire ? 0.96 : 0.97;   // Damping X
                          velArray[i3 + 2] *= isFire ? 0.96 : 0.97; // Damping Z

                          // Update position
                          posArray[i3] += (velArray[i3] + turbX + currentWindEffectX * (isFire ? 0.7 : 1.0)) * safeDelta * 60;
                          posArray[i3 + 1] += (velArray[i3 + 1] + turbY) * safeDelta * 60;
                          posArray[i3 + 2] += (velArray[i3 + 2] + turbZ) * safeDelta * 60;

                           if (isNaN(posArray[i3]) || isNaN(posArray[i3 + 1]) || isNaN(posArray[i3 + 2])) {
                              lifeArray[i] = -1; // Force reset on next frame
                              continue;
                           }

                          // Update alpha
                           const fadeOutPower = isFire ? 1.8 : 1.0;
                           const baseAlphaRandomFactor = randomFactorsArray[i3]; // Use stored random factor
                           const baseAlpha = safeOpacity * (isFire ? (0.7 + baseAlphaRandomFactor * 0.3) : (0.3 + baseAlphaRandomFactor * 0.3)); // Use consistent base alpha calculation

                           let alphaMultiplier = 1.0;
                           if (isFire) {
                               alphaMultiplier = Math.pow(lifeRatio, fadeOutPower); // Simple fade out for fire
                           } else {
                               const fadeInEnd = 0.1; // Quick fade in at the beginning (0% to 10% of life)
                               const fadeOutStart = 0.6; // Start fading out after 60% of life

                               if (lifeRatio < fadeInEnd) { // Fade In
                                   alphaMultiplier = THREE_Module.MathUtils.smoothstep(lifeRatio, 0.0, fadeInEnd);
                               } else if (lifeRatio > fadeOutStart) { // Fade Out
                                   alphaMultiplier = 1.0 - THREE_Module.MathUtils.smoothstep(lifeRatio, fadeOutStart, 1.0);
                               } else { // Fully visible
                                    alphaMultiplier = 1.0;
                               }
                           }


                          const calculatedAlpha = baseAlpha * alphaMultiplier;
                           // Ensure alpha is never negative or NaN
                          alphaArray[i] = isNaN(calculatedAlpha) ? 0 : Math.max(0, Math.min(safeOpacity, calculatedAlpha));


                          // Update size
                          const baseSizeRandomFactor = randomFactorsArray[i3 + 1]; // Use stored random factor
                          let sizeFactor = 1.0;
                           if (isFire) {
                               sizeFactor = Math.max(0.1, lifeRatio * 0.9 + 0.1); // Shrink over life
                           } else {
                               // Smoke grows slightly then shrinks
                               const sizePeakTime = 0.3; // Peak size around 30% of lifespan
                               const growthFactor = 1.5; // How much bigger it gets at peak
                               if (lifeRatio < sizePeakTime) {
                                   sizeFactor = 1.0 + (growthFactor - 1.0) * (lifeRatio / sizePeakTime);
                               } else {
                                   sizeFactor = growthFactor - (growthFactor - 0.1) * ((lifeRatio - sizePeakTime) / (1.0 - sizePeakTime));
                               }
                               sizeFactor = Math.max(0.1, sizeFactor); // Ensure minimum size
                           }

                           const baseSize = isFire
                               ? (0.5 + baseSizeRandomFactor * 0.5) * safeSpread * 1.2
                               : (1.2 + baseSizeRandomFactor * 1.0) * safeSpread * 1.5;
                          const calculatedSize = baseSize * sizeFactor;
                          sizeArray[i] = isNaN(calculatedSize) ? 0.02 : Math.max(0.02, calculatedSize);
                      }
                  }
              }

              // Mark attributes for update
              attributes.position.needsUpdate = true;
              attributes.velocity.needsUpdate = true;
              attributes.alpha.needsUpdate = true;
              attributes.particleSize.needsUpdate = true;
              attributes.life.needsUpdate = true;
              attributes.color.needsUpdate = true;
              if (attributes.targetTextPoint) attributes.targetTextPoint.needsUpdate = true;
              if (attributes.randomFactors) attributes.randomFactors.needsUpdate = true; // Mark random factors for update on reset
          };

          // --- Call Update for Smoke & Fire ---
          updateParticles(
              smokeParticlesRef, isSmokeEnabled, false, actualSmokeParticleCount,
              smokeSpeed, smokeSpread, smokeOpacity, smokeTurbulence,
              smokeDissipation, smokeBuoyancy,
              currentSmokeBaseC, currentSmokeAccentC, finalSmokeColor,
              effectiveSmokeSource, timeFactorSmoke
          );

           updateParticles(
              fireParticlesRef, isFireEnabled, true, actualFireParticleCount,
              fireSpeed, fireSpread, fireOpacity, fireTurbulence,
              undefined, undefined, // Fire doesn't use dissipation/buoyancy props directly
              currentFireBaseC, currentFireAccentC, finalFireColor,
              effectiveFireSource, timeFactorFire
          );
       }

       // --- Render Scene ---
       try {
           rendererRef.current.render(sceneRef.current, cameraRef.current);
       } catch(e) {
           console.error("Error during render:", e);
           // Optionally stop the animation loop on render error
           // if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
           // animationFrameIdRef.current = null;
           // setLoadError("An error occurred during rendering. Please check console.");
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
             // Update shader scale uniform on resize
             const updateShaderScale = (particlesRef: React.RefObject<THREE.Points>) => {
                if (particlesRef.current?.material) {
                   try {
                         const material = particlesRef.current.material as THREE.PointsMaterial & {uniforms?: any}; // Type assertion
                         if (material.uniforms?.scale) {
                            material.uniforms.scale.value = height / 2;
                         }
                   } catch (e) {
                         // console.warn("Could not update shader scale uniform", e);
                   }
                }
             };
             updateShaderScale(smokeParticlesRef);
             updateShaderScale(fireParticlesRef);
         }
       }
     }, 250);

     window.addEventListener('resize', handleResize);
     handleResize(); // Initial call

     return () => {
       if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
       animationFrameIdRef.current = null;
       window.removeEventListener('resize', handleResize);
       if (textCanvasRef.current) {
           // textCanvasRef.current.remove(); // No need to remove if just nulling ref
           textCanvasRef.current = null;
       }
        // Dispose Three.js resources
        if (rendererRef.current) {
            rendererRef.current.dispose();
            rendererRef.current = null;
        }
        if (sceneRef.current) {
             sceneRef.current.traverse((object) => {
                 if (object instanceof THREE_Module.Points) {
                    if (object.geometry) object.geometry.dispose();
                    if (object.material) {
                         const material = object.material as THREE.Material | THREE.Material[];
                         if (Array.isArray(material)) {
                            material.forEach(m => {
                                if((m as any).map) (m as any).map.dispose();
                                m.dispose();
                            });
                         } else {
                            if((material as any).map) (material as any).map.dispose();
                            material.dispose();
                         }
                    }
                 } else if (object instanceof THREE_Module.Mesh) {
                    if (object.geometry) object.geometry.dispose();
                    if (object.material) {
                        const material = object.material as THREE.Material | THREE.Material[];
                        if (Array.isArray(material)) {
                           material.forEach(m => m.dispose());
                        } else {
                           material.dispose();
                        }
                    }
                }
             });
             sceneRef.current = null;
        }
         // Textures are disposed via useMemo cleanup if component unmounts
         // if (smokeParticleTexture) smokeParticleTexture.dispose();
         // if (fireParticleTexture) fireParticleTexture.dispose();

         cameraRef.current = null;
     };
   }, [ // Dependency list (ensure all props used in the effect are listed)
     isThreeLoaded, THREE_Module, onCanvasReady,
     debouncedUpdateParticles,
     backgroundColor, isPlaying,
     windDirectionX, windStrength,
     smokeBaseColor, smokeAccentColor, smokeOpacity, smokeTurbulence, smokeDissipation, smokeBuoyancy, smokeSpeed, smokeSpread,
     fireBaseColor, fireAccentColor, fireOpacity, fireTurbulence, fireSpeed, fireSpread,
     isSmokeEnabled, isFireEnabled, actualSmokeParticleCount, actualFireParticleCount,
     effectiveSmokeSource, effectiveFireSource, particleText, persistTextShape,
     getParticleStartPosition,
     smokeBlendMode, fireBlendMode,
     smokeParticleTexture, fireParticleTexture, // Textures are dependencies if used directly in effect
     handleMouseMove // If mouse move handling is critical for setup
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
                material.blendSrcAlpha = THREE_Module.SrcAlphaFactor; // Reset to default for Normal/Additive/Multiply
                material.blendDstAlpha = THREE_Module.OneMinusSrcAlphaFactor; // Reset to default
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
                 material.blendSrcAlpha = THREE_Module.SrcAlphaFactor; // Reset to default
                 material.blendDstAlpha = THREE_Module.OneMinusSrcAlphaFactor; // Reset to default
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

    