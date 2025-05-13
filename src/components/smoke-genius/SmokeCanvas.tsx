
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

const BASE_FIRE_LIFESPAN = 70;
const BASE_SMOKE_LIFESPAN = 300;
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

  // Memoize actual particle counts to prevent frequent re-calculations if not necessary
  const actualSmokeParticleCount = useMemo(() => Math.min(smokeDensity, MAX_SMOKE_PARTICLES), [smokeDensity]);
  const actualFireParticleCount = useMemo(() => Math.min(fireDensity, MAX_FIRE_PARTICLES), [fireDensity]);

  const mouseSceneXRef = useRef(0);
  const mouseSceneYRef = useRef(0);

  const textPointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const textCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const effectiveSmokeSource: EffectiveParticleSource = useMemo(() => (particleText ? "Text" : smokeSourceProp), [particleText, smokeSourceProp]);
  const effectiveFireSource: EffectiveParticleSource = useMemo(() => (particleText ? "Text" : fireSourceProp), [particleText, fireSourceProp]);

  // --- THREE.js and Texture Initialization ---
  useEffect(() => {
    import('three').then(threeModule => {
      THREE_Module = threeModule;
      setIsThreeLoaded(true);
      setLoadError(null);
    }).catch(err => {
      console.error("Failed to load Three.js", err);
      setLoadError("Failed to load 3D rendering library.");
      setIsThreeLoaded(false);
    });
  }, []);

  const smokeParticleTexture = useMemo(() => {
    if (!THREE_Module || !isThreeLoaded) return null;
    const canvas = document.createElement('canvas');
    const size = 256; canvas.width = size; canvas.height = size;
    const context = canvas.getContext('2d'); if (!context) return null;
    const gradient = context.createRadialGradient(size/2, size/2, size*0.05, size/2, size/2, size*0.45);
    gradient.addColorStop(0, 'rgba(255,255,255,0.7)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient; context.fillRect(0,0,size,size);
    const texture = new THREE_Module.CanvasTexture(canvas);
    texture.needsUpdate = true; return texture;
  }, [isThreeLoaded, THREE_Module]);


  const fireParticleTexture = useMemo(() => {
    if (!THREE_Module || !isThreeLoaded) return null;
    const canvas = document.createElement('canvas');
    const size = 128; canvas.width = size; canvas.height = size;
    const context = canvas.getContext('2d'); if (!context) return null;
    const gradient = context.createRadialGradient(size/2,size/2,0, size/2,size/2,size/2);
    gradient.addColorStop(0, 'rgba(255,255,220,1.0)');
    gradient.addColorStop(0.1, 'rgba(255,220,150,0.9)');
    gradient.addColorStop(0.3, 'rgba(255,150,50,0.7)');
    gradient.addColorStop(0.6, 'rgba(255,50,0,0.3)');
    gradient.addColorStop(1, 'rgba(200,0,0,0)');
    context.fillStyle = gradient; context.fillRect(0,0,size,size);
    context.strokeStyle='rgba(255,255,200,0.1)'; context.lineWidth=0.5;
    for(let i=0;i<30;i++){ context.beginPath(); const a=Math.random()*Math.PI*2, l=size*0.3+Math.random()*size*0.2; context.moveTo(size/2,size/2); context.lineTo(size/2+Math.cos(a)*l,size/2+Math.sin(a)*l); context.stroke(); }
    const texture = new THREE_Module.CanvasTexture(canvas);
    texture.needsUpdate = true; return texture;
  }, [isThreeLoaded, THREE_Module]);

  // --- Particle Start Position Logic ---
  const getParticleStartPosition = useCallback((
      isFire: boolean, sourceType: EffectiveParticleSource, spreadValue: number, cameraPositionZ: number = 5
    ): { x: number; y: number; z: number } => {
    if (!THREE_Module || !cameraRef.current) return { x: 0, y: -2.0, z: 0 }; // Default position
    let x=0,y=0,z=0;
    // Calculate viewport height at Z=0 based on camera FOV and position
    const viewportHeight = 2 * Math.tan(THREE_Module.MathUtils.degToRad(cameraRef.current.fov) / 2) * cameraPositionZ;
    const yBaseline = -viewportHeight * 0.5; // Bottom edge of the viewport at Z=0
    const safeSpread = isNaN(spreadValue) || !isFinite(spreadValue) ? 1.0 : spreadValue;

    switch(sourceType){
      case "Text":
        if(textPointsRef.current.length > 0){
          const point = textPointsRef.current[Math.floor(Math.random() * textPointsRef.current.length)];
          const pX = isNaN(point.x) ? 0 : point.x;
          const pY = isNaN(point.y) ? 0 : point.y;
          const offsetScale = 0.05; // Small offset for initial spread from text point
          x = pX + (Math.random() - 0.5) * safeSpread * offsetScale;
          y = pY + (Math.random() - 0.5) * safeSpread * offsetScale;
          z = (Math.random() - 0.5) * safeSpread * offsetScale;
        } else {
           // Fallback if text points aren't generated yet (should ideally not happen often)
           x = (Math.random() - 0.5) * safeSpread * (isFire ? 1 : 1.5);
           y = 0 + (Math.random() - 0.5) * 0.2; // Center Y-axis
           z = (Math.random() - 0.5) * safeSpread * (isFire ? 1 : 1.5);
        }
        break;
      case "Bottom":
        x = (Math.random() - 0.5) * BOTTOM_SOURCE_X_SPREAD; // Spread horizontally across the bottom
        y = yBaseline + (isFire ? Math.random() * 0.1 : Math.random() * 0.3); // Slightly above the bottom edge
        z = (Math.random() - 0.5) * safeSpread * 0.2; // Small depth variation
        break;
      case "Mouse":
        const mX = isNaN(mouseSceneXRef.current) ? 0 : mouseSceneXRef.current;
        const mY = isNaN(mouseSceneYRef.current) ? 0 : mouseSceneYRef.current;
        const mouseSpreadFactor = isFire ? 0.2 : 0.3;
        x = mX + (Math.random() - 0.5) * safeSpread * mouseSpreadFactor;
        y = mY + (Math.random() - 0.5) * safeSpread * mouseSpreadFactor;
        z = (Math.random() - 0.5) * safeSpread * mouseSpreadFactor * 0.1; // Very small depth variation for mouse
        break;
      case "Center": default:
        x = (Math.random() - 0.5) * safeSpread * (isFire ? 1 : 1.5);
        y = 0 + (Math.random() - 0.5) * 0.2; // Center Y-axis
        z = (Math.random() - 0.5) * safeSpread * (isFire ? 1 : 1.5);
        break;
    }
    // Final safety check for NaN values
    if (isNaN(x) || isNaN(y) || isNaN(z)) {
      console.warn("NaN detected in particle start position, using default.");
      return { x: 0, y: yBaseline + (isFire ? 0 : 0.5), z: 0 };
    }
    return { x, y, z };
  }, [THREE_Module]); // textPointsRef is stable, mouseSceneX/Y are refs


  // --- Particle Initialization ---
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
    // Crucial Check: Ensure THREE and textures are loaded before proceeding
    if (!THREE_Module || !isThreeLoaded || !cameraRef.current || !smokeParticleTexture || !fireParticleTexture) {
        return { geometry: null, material: null };
    }

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
    const randomFactors = new Float32Array(safeCount * 3);

    let baseC: THREE.Color, accentC: THREE.Color;
    try {
         baseC = new THREE_Module.Color(baseColorVal);
         accentC = new THREE_Module.Color(accentColorVal);
    } catch (e) {
         console.warn("Invalid color value, using default:", e);
         baseC = new THREE_Module.Color(isFireSystem ? "#FFA500" : "#FFFFFF");
         accentC = new THREE_Module.Color(isFireSystem ? "#FFD700" : "#E0E0E0");
    }
    const finalColor = new THREE_Module.Color();
    const initialCameraZ = cameraRef.current.position.z;

    for (let i = 0; i < safeCount; i++) {
      const i3 = i * 3;
      const startPos = getParticleStartPosition(isFireSystem, currentParticleSourceType, safeSpread, initialCameraZ);
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
        velY = (Math.random() * 0.5 + 0.8) * safeSpeed; // Buoyancy added later
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

      const rand1 = Math.random();
      const rand2 = Math.random();
      const rand3 = Math.random();
      randomFactors[i3] = rand1;
      randomFactors[i3 + 1] = rand2;
      randomFactors[i3 + 2] = rand3;

      let particleSize;
      let lifespan;
      if (isFireSystem) {
        alphas[i] = safeOpacity * (0.7 + rand1 * 0.3);
        particleSize = (0.5 + rand2 * 0.5) * safeSpread * 1.2;
        lifespan = BASE_FIRE_LIFESPAN * (0.5 + rand1 * 0.8);
      } else {
        alphas[i] = safeOpacity * (0.3 + rand1 * 0.3);
        particleSize = (1.2 + rand2 * 1.0) * safeSpread * 1.5;
        lifespan = BASE_SMOKE_LIFESPAN * (0.6 + rand1 * 0.7);
      }
      particleSizes[i] = isNaN(particleSize) ? 0.1 : Math.max(0.02, particleSize);
      const initialLifeRatio = 0.01 + rand3 * 0.99; // Start particles slightly alive to avoid initial burst
      lives[i] = (isNaN(lifespan) ? (isFireSystem ? BASE_FIRE_LIFESPAN : BASE_SMOKE_LIFESPAN) : lifespan) * initialLifeRatio;

      turbulenceOffsets[i3] = Math.random() * 2 * Math.PI;
      turbulenceOffsets[i3 + 1] = Math.random() * 2 * Math.PI;
      turbulenceOffsets[i3 + 2] = Math.random() * 100; // For unique noise seed per particle

      if (textPointsRef.current.length > 0) {
        const point = textPointsRef.current[i % textPointsRef.current.length];
        targetTextPoints[i3] = isNaN(point.x) ? 0 : point.x;
        targetTextPoints[i3 + 1] = isNaN(point.y) ? 0 : point.y;
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
    geometry.setAttribute('randomFactors', new THREE_Module.BufferAttribute(randomFactors, 3));

    const material = new THREE_Module.PointsMaterial({
      map: isFireSystem ? fireParticleTexture : smokeParticleTexture,
      depthWrite: false,
      transparent: true,
      vertexColors: true,
      sizeAttenuation: true, // Important for perspective sizing
      // size: particleSize (not set here, calculated per vertex)
    });

    // Set blending mode
    if (THREE_Module) {
        switch (currentBlendMode) {
            case "Additive": material.blending = THREE_Module.AdditiveBlending; break;
            case "Subtractive":
                 material.blending = THREE_Module.CustomBlending;
                 material.blendEquation = THREE_Module.ReverseSubtractEquation;
                 material.blendSrc = THREE_Module.SrcAlphaFactor;
                 material.blendDst = THREE_Module.OneFactor;
                break;
            case "Multiply": material.blending = THREE_Module.MultiplyBlending; break;
            case "Normal": default: material.blending = THREE_Module.NormalBlending; break;
        }
    }


    // Custom shader for alpha, rotation, and potentially more effects
    material.onBeforeCompile = shader => {
        shader.uniforms.time = { value: 0.0 };
        // THREE_Module.ShaderLib.points.uniforms includes 'scale' if sizeAttenuation is true
        shader.vertexShader = `
            attribute float particleSize;
            attribute float alpha;
            attribute vec3 turbulenceOffset;
            attribute float rotationSpeed;
            varying float vAlpha;
            varying float vRotation;
            uniform float time;
            // 'scale' uniform is provided by Three.js PointsMaterial when sizeAttenuation=true

            ${shader.vertexShader}
        `;
        // Inject varying assignments
        shader.vertexShader = shader.vertexShader.replace(
            `#include <logdepthbuf_vertex>`,
            `#include <logdepthbuf_vertex>
             vAlpha = alpha;
             vRotation = rotationSpeed * time;` // Example rotation calculation
        );
        // Replace default size calculation with custom logic
        shader.vertexShader = shader.vertexShader.replace(
          `#include <project_vertex>`,
          `
            vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );
            gl_Position = projectionMatrix * mvPosition;

            float basePointSize = particleSize * 1.3; // Adjust base multiplier as needed

            #ifdef USE_SIZEATTENUATION
              // Note: 'scale' is provided by Three.js automatically here
              bool isPerspective = isPerspectiveMatrix( projectionMatrix );
              if ( isPerspective ) {
                  float viewZ = -mvPosition.z;
                  if (viewZ < 0.0001) viewZ = 0.0001; // Prevent division by zero or tiny numbers
                  gl_PointSize = basePointSize * ( scale / viewZ );
              } else {
                  gl_PointSize = basePointSize;
              }
            #else
                gl_PointSize = basePointSize;
            #endif

            gl_PointSize = max(1.0, gl_PointSize); // Ensure minimum point size
          `
        );
        // Remove the default gl_PointSize calculation which might conflict
        shader.vertexShader = shader.vertexShader.replace(`gl_PointSize = size;`, ``);

        // Fragment shader modification for alpha and texture rotation
        shader.fragmentShader = `
            varying float vAlpha;
            varying float vRotation;
            ${shader.fragmentShader}
        `.replace(
            `#include <color_fragment>`,
            `#include <color_fragment>
             diffuseColor.a *= vAlpha;`
        ).replace(
            `#include <map_particle_fragment>`,
            `#ifdef USE_MAP
                vec2 center = vec2(0.5, 0.5);
                float cos_rot = cos(vRotation);
                float sin_rot = sin(vRotation);
                vec2 rotated_uv = mat2(cos_rot, -sin_rot, sin_rot, cos_rot) * (gl_PointCoord - center) + center;
                vec4 mapTexel = texture2D( map, rotated_uv );
                diffuseColor *= mapTexel;
             #endif`
        );
    };
    return { geometry, material };
  }, [THREE_Module, isThreeLoaded, smokeParticleTexture, fireParticleTexture, getParticleStartPosition, textPointsRef]); // textPointsRef is stable


  // Debounced particle update function
  const debouncedUpdateParticles = useCallback(
    debounce(() => {
      if (!mountRef.current || !isThreeLoaded || !THREE_Module || !sceneRef.current || !initParticles) return;
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
        // Cleanup existing particles if present
        if (particlesRef.current) {
            if (particlesRef.current.geometry) particlesRef.current.geometry.dispose();
            if (particlesRef.current.material) {
                const material = particlesRef.current.material as THREE.Material | THREE.Material[];
                if (Array.isArray(material)) {
                    material.forEach(m => { if ((m as any).map) (m as any).map.dispose(); m.dispose(); });
                } else {
                    if ((material as any).map) (material as any).map.dispose();
                    material.dispose();
                }
            }
            scene.remove(particlesRef.current);
            particlesRef.current = null;
        }

        // Create new particles if enabled and count > 0
        if (isEnabled && count > 0) {
          const { geometry, material } = initParticles(
              count, isFire, baseColor, accentColor, speed, spread, opacity, sourceType, blendMode
          );
          if (geometry && material) {
            particlesRef.current = new THREE_Module.Points(geometry, material);
            scene.add(particlesRef.current);
            console.log(`${isFire ? 'Fire' : 'Smoke'} particles initialized: ${count}`);
          } else {
             console.log(`Failed to initialize ${isFire ? 'Fire' : 'Smoke'} particles (geometry or material null)`);
          }
        } else {
           console.log(`${isFire ? 'Fire' : 'Smoke'} system disabled or count is zero.`);
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
    }, 300), // Debounce time
    [ // Dependencies that trigger re-creation of the debounced function wrapper
      isThreeLoaded, initParticles, // Core dependencies for particle creation
      // Props that necessitate re-initialization of particle systems
      isSmokeEnabled, actualSmokeParticleCount, smokeBaseColor, smokeAccentColor, smokeSpeed, smokeSpread, smokeOpacity, effectiveSmokeSource, smokeBlendMode,
      isFireEnabled, actualFireParticleCount, fireBaseColor, fireAccentColor, fireSpeed, fireSpread, fireOpacity, effectiveFireSource, fireBlendMode,
    ]
  );

  // --- Text Shaping ---
  useEffect(() => {
    textCanvasRef.current = document.createElement('canvas');
    textCanvasRef.current.width = TEXT_CANVAS_WIDTH;
    textCanvasRef.current.height = TEXT_CANVAS_HEIGHT;
     return () => { textCanvasRef.current = null; };
  }, []);

  const generateTextPoints = useCallback((text: string) => {
    if (!textCanvasRef.current || !text) {
      textPointsRef.current = [];
      // Only trigger update if the effective source actually changes
       if (effectiveSmokeSource !== smokeSourceProp || effectiveFireSource !== fireSourceProp) {
           debouncedUpdateParticles(); // Re-initialize if source type changes back from "Text"
       }
      return;
    }
    const canvas = textCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) { textPointsRef.current = []; return; }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = TEXT_FONT;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const points: Array<{ x: number; y: number }> = [];
    const step = Math.max(1, Math.floor(1 / Math.sqrt(TEXT_SAMPLE_DENSITY)));

    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        // Check alpha channel value and sample randomly based on density
        if (data[(y * canvas.width + x) * 4 + 3] > 128 && Math.random() < TEXT_SAMPLE_DENSITY * step * step) {
            const sceneX = (x - canvas.width / 2) * TEXT_SHAPE_SCALE;
            const sceneY = -(y - canvas.height / 2) * TEXT_SHAPE_SCALE; // Invert Y for scene coordinates
            if (!isNaN(sceneX) && !isNaN(sceneY)) { // Ensure coordinates are valid numbers
              points.push({ x: sceneX, y: sceneY });
            }
        }
      }
    }
    textPointsRef.current = points;
    debouncedUpdateParticles(); // Trigger particle reset because text shape changed
  }, [debouncedUpdateParticles, smokeSourceProp, fireSourceProp, effectiveSmokeSource, effectiveFireSource]);


  useEffect(() => {
    const debouncedGenerate = debounce(() => generateTextPoints(particleText), 300);
    debouncedGenerate();
    // Cleanup function for the debounced call
    return () => { if (typeof debouncedGenerate.cancel === 'function') debouncedGenerate.cancel(); };
  }, [particleText, generateTextPoints]);


  // --- Mouse Interaction ---
   const handleMouseMove = useCallback((event: MouseEvent) => {
     if (!mountRef.current || !cameraRef.current || !THREE_Module) return;
     const canvasBounds = mountRef.current.getBoundingClientRect();
     if (canvasBounds.width === 0 || canvasBounds.height === 0) return; // Prevent division by zero

     // Check if mouse is within canvas bounds
     if (event.clientX < canvasBounds.left || event.clientX > canvasBounds.right || event.clientY < canvasBounds.top || event.clientY > canvasBounds.bottom) return;

     // Normalize mouse coordinates to NDC (-1 to +1)
     const mouseXNDC = ((event.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
     const mouseYNDC = -((event.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1; // Y is inverted

     // Unproject mouse coordinates into 3D space
     const vec = new THREE_Module.Vector3(mouseXNDC, mouseYNDC, 0.5); // Use 0.5 for near plane projection
     vec.unproject(cameraRef.current);
     const dir = vec.sub(cameraRef.current.position).normalize();

     // Calculate intersection with Z=0 plane (where particles often originate)
      if (Math.abs(dir.z) < 1e-6) return; // Avoid division by zero if ray is parallel to Z plane
     const distance = -cameraRef.current.position.z / dir.z;
      if (isNaN(distance) || !isFinite(distance) || distance < 0) return; // Check for valid distance

     const pos = cameraRef.current.position.clone().add(dir.multiplyScalar(distance));

     // Check if calculated position is valid
     if (isNaN(pos.x) || isNaN(pos.y)) return;

     mouseSceneXRef.current = pos.x;
     mouseSceneYRef.current = pos.y;
   }, [THREE_Module]);


   useEffect(() => {
     if (!isThreeLoaded) return; // Wait for THREE to be loaded
     window.addEventListener('mousemove', handleMouseMove);
     return () => { window.removeEventListener('mousemove', handleMouseMove); };
   }, [isThreeLoaded, handleMouseMove]);



   // --- Main Three.js Setup and Animation Loop ---
   useEffect(() => {
     if (!mountRef.current || !isThreeLoaded || !THREE_Module ) return;
     const currentMountRef = mountRef.current;

     // Initialize Scene, Camera, Renderer if they don't exist
     if (!sceneRef.current) sceneRef.current = new THREE_Module.Scene();
     if (!cameraRef.current) {
       cameraRef.current = new THREE_Module.PerspectiveCamera(75, currentMountRef.clientWidth / currentMountRef.clientHeight, 0.1, 100);
       cameraRef.current.position.z = 5;
     }
     if (!rendererRef.current) {
       try {
         rendererRef.current = new THREE_Module.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
         rendererRef.current.setSize(currentMountRef.clientWidth, currentMountRef.clientHeight);
         rendererRef.current.setPixelRatio(typeof window !== 'undefined' ? window.devicePixelRatio : 1);
         currentMountRef.appendChild(rendererRef.current.domElement);
         if (onCanvasReady) onCanvasReady(rendererRef.current.domElement);
       } catch (error) {
          console.error("Error creating WebGLRenderer:", error);
          setLoadError("Could not initialize 3D graphics."); return;
       }
     }

     // Initial particle setup when THREE is loaded and ready
     debouncedUpdateParticles();

     const clock = new THREE_Module.Clock();
     let time = 0;

     const animate = () => {
       if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !THREE_Module) {
         if(animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
         animationFrameIdRef.current = null; return; // Stop loop if essential refs are missing
       }
       animationFrameIdRef.current = requestAnimationFrame(animate);

       const delta = clock.getDelta();
       const safeDelta = Math.max(0, Math.min(delta, 1 / 30)); // Prevent large jumps, ensure non-negative
       if (safeDelta <= 0) return; // Skip frame if delta is zero or negative
       time += safeDelta;

        // --- Update Shader Uniforms ---
        const updateShaderTime = (particlesRef: React.RefObject<THREE.Points>) => {
          if (particlesRef.current?.material) {
             const material = particlesRef.current.material as THREE.PointsMaterial;
             // Check if uniforms exist before accessing
             if ((material.onBeforeCompile as any)?.uniforms?.time) { // Check if onBeforeCompile was used and has uniforms
                 (material.onBeforeCompile as any).uniforms.time.value = time;
             } else if (material.uniforms?.time) { // Standard uniforms
                 material.uniforms.time.value = time;
             }
          }
        };
        updateShaderTime(smokeParticlesRef);
        updateShaderTime(fireParticlesRef);

       // --- Particle Simulation Logic ---
       if (isPlaying) {
          const currentWindEffectX = (isNaN(windDirectionX) ? 0 : windDirectionX) * (isNaN(windStrength) ? 0 : windStrength) * safeDelta * 60;
          const timeFactorSmoke = time * 0.8;
          const timeFactorFire = time * 1.2;

          // Cache color objects outside the loop if possible, or ensure valid defaults
          let currentSmokeBaseC: THREE.Color, currentSmokeAccentC: THREE.Color;
           try { currentSmokeBaseC = new THREE_Module.Color(smokeBaseColor); currentSmokeAccentC = new THREE_Module.Color(smokeAccentColor); }
           catch(e) { currentSmokeBaseC = new THREE_Module.Color("#FFFFFF"); currentSmokeAccentC = new THREE_Module.Color("#E0E0E0"); }
          const finalSmokeColor = new THREE_Module.Color(); // Reusable color object

          let currentFireBaseC: THREE.Color, currentFireAccentC: THREE.Color;
           try { currentFireBaseC = new THREE_Module.Color(fireBaseColor); currentFireAccentC = new THREE_Module.Color(fireAccentColor); }
           catch(e) { currentFireBaseC = new THREE_Module.Color("#FFA500"); currentFireAccentC = new THREE_Module.Color("#FFD700"); }
          const finalFireColor = new THREE_Module.Color(); // Reusable color object

          const shouldPersist = !!particleText && persistTextShape && textPointsRef.current.length > 0;

          const updateParticles = (
              particlesRef: React.RefObject<THREE.Points>, isEnabled: boolean, isFire: boolean, particleCount: number,
              currentSpeed: number, currentSpread: number, currentOpacity: number, currentTurbulence: number,
              currentDissipation: number | undefined, currentBuoyancy: number | undefined,
              baseC: THREE.Color, accentC: THREE.Color, finalC: THREE.Color,
              currentSourceType: EffectiveParticleSource, currentTimeFactor: number
          ) => {
              if (!particlesRef.current || !isEnabled || particleCount === 0 || !cameraRef.current) return;

              const geom = particlesRef.current.geometry as THREE.BufferGeometry;
              const attrs = geom.attributes;
              // Verify all required attributes exist
              if (!attrs.position || !attrs.velocity || !attrs.alpha || !attrs.particleSize || !attrs.life || !attrs.color || !attrs.turbulenceOffset || !attrs.targetTextPoint || !attrs.randomFactors) {
                   console.warn(`Missing attributes for ${isFire ? 'fire' : 'smoke'} particles.`);
                   return;
              }

              const posArr = (attrs.position as THREE.BufferAttribute).array as Float32Array;
              const velArr = (attrs.velocity as THREE.BufferAttribute).array as Float32Array;
              const alphaArr = (attrs.alpha as THREE.BufferAttribute).array as Float32Array;
              const sizeArr = (attrs.particleSize as THREE.BufferAttribute).array as Float32Array;
              const lifeArr = (attrs.life as THREE.BufferAttribute).array as Float32Array;
              const colorArr = (attrs.color as THREE.BufferAttribute).array as Float32Array;
              const turbOffArr = (attrs.turbulenceOffset as THREE.BufferAttribute).array as Float32Array;
              const targetPtArr = (attrs.targetTextPoint as THREE.BufferAttribute).array as Float32Array;
              const randFactorsArr = (attrs.randomFactors as THREE.BufferAttribute).array as Float32Array;

              // Flags to track if attributes need updating
              let posUpd=false, alphaUpd=false, sizeUpd=false, lifeUpd=false, colorUpd=false, velUpd=false, randUpd=false, targetUpd = false;

              // Pre-calculate safe values outside the loop
              const sOpacity = isNaN(currentOpacity)?(isFire?0.7:0.5):currentOpacity;
              const sSpread = isNaN(currentSpread)?1:currentSpread;
              const bLifespan = isFire?BASE_FIRE_LIFESPAN:BASE_SMOKE_LIFESPAN;
              const sSpeed = isNaN(currentSpeed)?(isFire?0.03:0.015):currentSpeed;
              const sTurbulence = isNaN(currentTurbulence)?1:currentTurbulence;
              const sDissipation = isNaN(currentDissipation??0.15)?0.15:(currentDissipation??0.15);
              const sBuoyancy = isNaN(currentBuoyancy??0.005)?0.005:(currentBuoyancy??0.005);

              const camZ = cameraRef.current.position.z;
              const vHeight = 2*Math.tan(THREE_Module.MathUtils.degToRad(cameraRef.current.fov)/2)*camZ;
              const respawnHeight = vHeight * (isFire?0.6:0.55); // Height at which particles reset

              for (let i=0; i<particleCount; ++i) {
                  const i3=i*3;

                  if (shouldPersist && targetPtArr) { // --- Persist Text Shape Logic ---
                      const tX=targetPtArr[i3], tY=targetPtArr[i3+1], tZ=targetPtArr[i3+2];
                      const cX=posArr[i3], cY=posArr[i3+1], cZ=posArr[i3+2];

                      // Check if target point is valid before using
                      if(!isNaN(tX) && !isNaN(tY) && !isNaN(tZ) && !isNaN(cX) && !isNaN(cY) && !isNaN(cZ)){
                         // Pull particle towards its target point
                         posArr[i3] += (tX - cX) * PERSIST_PULL_FACTOR * safeDelta * 60;
                         posArr[i3+1] += (tY - cY) * PERSIST_PULL_FACTOR * safeDelta * 60;
                         posArr[i3+2] += (tZ - cZ) * PERSIST_PULL_FACTOR * safeDelta * 60;

                         // Add subtle jitter to prevent perfect static alignment
                         const jit = PERSIST_JITTER_STRENGTH * sSpread;
                         posArr[i3] += (Math.random() - 0.5) * jit * safeDelta * 60;
                         posArr[i3+1] += (Math.random() - 0.5) * jit * safeDelta * 60;
                         posArr[i3+2] += (Math.random() - 0.5) * jit * safeDelta * 60;
                         posUpd = true;
                      } else {
                         // Fallback: if current position is NaN, snap to target (if valid)
                         if(isNaN(posArr[i3]) && !isNaN(tX)) posArr[i3] = tX;
                         if(isNaN(posArr[i3+1]) && !isNaN(tY)) posArr[i3+1] = tY;
                         if(isNaN(posArr[i3+2]) && !isNaN(tZ)) posArr[i3+2] = tZ;
                         posUpd = true;
                      }

                      // Keep life and alpha high for persisted text
                      if(lifeArr[i] < bLifespan * 0.99){ lifeArr[i] = bLifespan; lifeUpd = true; }
                      const targetAlpha = sOpacity * 0.95;
                      if(alphaArr[i] !== targetAlpha){ alphaArr[i] = targetAlpha; alphaUpd = true; }
                      // Stop movement
                      if(velArr[i3]!==0||velArr[i3+1]!==0||velArr[i3+2]!==0){ velArr[i3]=0; velArr[i3+1]=0; velArr[i3+2]=0; velUpd=true; }

                  } else { // --- Normal Particle Update Logic ---
                      let cLife=lifeArr[i] - (safeDelta * (15 + sDissipation * 40)); // Decrease life based on delta and dissipation
                      lifeUpd = true;

                      // --- Reset Particle Condition ---
                      if(cLife <= 0 || posArr[i3+1] > respawnHeight || isNaN(cLife) || isNaN(posArr[i3+1])){
                         if(isNaN(cLife)||isNaN(posArr[i3+1])) console.warn("NaN in life/pos, resetting particle", {idx:i, life: cLife, posY: posArr[i3+1]});

                         // Get new starting position
                         const sPos = getParticleStartPosition(isFire, currentSourceType, sSpread, camZ);
                         posArr[i3] = sPos.x; posArr[i3+1] = sPos.y; posArr[i3+2] = sPos.z; posUpd=true;

                         // Reset random factors for variation
                         const r1=Math.random(), r2=Math.random(), r3=Math.random();
                         randFactorsArr[i3]=r1; randFactorsArr[i3+1]=r2; randFactorsArr[i3+2]=r3; randUpd=true;

                         // Reset life, alpha, size based on type and randomness
                         let rLife = (isFire?bLifespan:BASE_SMOKE_LIFESPAN)*(0.5+r1*0.8);
                         let rAlpha = sOpacity*(isFire?(0.7+r1*0.3):(0.3+r1*0.3));
                         let rSize = (isFire?(0.5+r2*0.5)*sSpread*1.2:(1.2+r2*1.0)*sSpread*1.5);
                         lifeArr[i] = isNaN(rLife)?bLifespan:rLife;
                         alphaArr[i] = isNaN(rAlpha)?sOpacity*(isFire?0.7:0.3):rAlpha; alphaUpd=true;
                         sizeArr[i] = isNaN(rSize)?0.1:Math.max(0.02,rSize); sizeUpd=true;

                         // Reset velocity based on type and randomness
                         let vX=0,vY=0,vZ=0;
                         if(isFire){vX=(Math.random()-0.5)*0.03*sSpread; vY=(Math.random()*0.8+0.6)*sSpeed*2; vZ=(Math.random()-0.5)*0.03*sSpread;}
                         else{vX=(Math.random()-0.5)*0.015*sSpread; vY=(Math.random()*0.5+0.8)*sSpeed; vZ=(Math.random()-0.5)*0.015*sSpread;} // Base speed, buoyancy added in movement
                         velArr[i3]=isNaN(vX)?0:vX; velArr[i3+1]=isNaN(vY)?(isFire?0.02:0.01):Math.max(0.001,vY); velArr[i3+2]=isNaN(vZ)?0:vZ; velUpd=true;

                         // Reset color
                         finalC.copy(baseC).lerp(accentC, Math.random()); colorArr[i3]=finalC.r;colorArr[i3+1]=finalC.g;colorArr[i3+2]=finalC.b; colorUpd=true;

                         // Reset target point if text shaping was active but now disabled
                         if (!particleText && targetPtArr) {
                             targetPtArr[i3] = sPos.x; targetPtArr[i3+1] = sPos.y; targetPtArr[i3+2] = sPos.z;
                             targetUpd = true;
                         } else if (textPointsRef.current.length > 0 && targetPtArr) {
                            // Assign a text target point even on reset if text is active
                            const p = textPointsRef.current[i % textPointsRef.current.length];
                            targetPtArr[i3] = isNaN(p.x) ? 0 : p.x;
                            targetPtArr[i3+1] = isNaN(p.y) ? 0 : p.y;
                            targetPtArr[i3+2] = 0;
                            targetUpd = true;
                         }

                      } else { // --- Update Existing Particle ---
                         lifeArr[i]=cLife; // Store updated life

                         // Calculate life ratio (0 to 1)
                         const baseLifeRandFactor = randFactorsArr[i3];
                         const cBaseLifespan = (isFire?bLifespan:BASE_SMOKE_LIFESPAN)*(0.5+baseLifeRandFactor*0.8);
                         const lifeRatio = Math.max(0, Math.min(1, cLife / Math.max(0.01, cBaseLifespan))); // Avoid division by zero

                         // --- Turbulence ---
                         const tXo=turbOffArr[i3], tYo=turbOffArr[i3+1], tZo=turbOffArr[i3+2]; // Turbulence offsets/seeds
                         const nTime = currentTimeFactor + tZo * 0.01; // Use time and particle-specific offset
                         const turbStrength = sTurbulence * (isFire?0.015:0.008) * safeDelta * 60; // Scaled turbulence strength
                         const turbScale = isFire?0.8:0.6; // Scale for noise function input

                         // Simple turbulence calculation (could be replaced with noise function)
                         const turbX = Math.sin(posArr[i3+1]*turbScale+nTime+tXo)*turbStrength*1.5;
                         const turbY = Math.cos(posArr[i3]*turbScale+nTime+tYo)*turbStrength*(isFire?2:1.5);
                         const turbZ = Math.sin(posArr[i3+2]*turbScale+nTime+tXo+tYo)*turbStrength*0.8;

                         // --- Apply Forces (Velocity Update) ---
                         // Buoyancy for smoke
                         if(!isFire) {
                             velArr[i3+1] += sBuoyancy * safeDelta * 60; // Add buoyancy force upwards
                             velUpd = true;
                         }
                         // Damping / Drag
                         velArr[i3+1] *= isFire?0.99:0.98; // Damp vertical velocity slightly
                         velArr[i3] *= isFire?0.96:0.97;   // Damp horizontal velocity more
                         velArr[i3+2] *= isFire?0.96:0.97; // Damp depth velocity more
                         velUpd = true;

                         // --- Update Position ---
                         const pX = posArr[i3], pY = posArr[i3+1], pZ = posArr[i3+2];
                         // New position = old position + (velocity + turbulence + wind) * timeDelta
                         let nPosX = pX + (velArr[i3] + turbX + currentWindEffectX * (isFire ? 0.7 : 1)) * safeDelta * 60;
                         let nPosY = pY + (velArr[i3+1] + turbY) * safeDelta * 60;
                         let nPosZ = pZ + (velArr[i3+2] + turbZ) * safeDelta * 60;

                         // Safety check for NaN position values
                         if(isNaN(nPosX)||isNaN(nPosY)||isNaN(nPosZ)){
                           console.warn("NaN in position update, skipping particle", {idx:i, pX, pY, pZ, vX: velArr[i3], vY: velArr[i3+1], vZ: velArr[i3+2], tX: turbX, tY: turbY, tZ: turbZ });
                           lifeArr[i]=-1; // Force reset on next frame
                           lifeUpd=true; continue; // Skip rest of update for this particle
                         }
                         posArr[i3] = nPosX; posArr[i3+1] = nPosY; posArr[i3+2] = nPosZ; posUpd=true;


                         // --- Update Alpha (Transparency) based on lifeRatio ---
                         const baseAlphaRandFactor = randFactorsArr[i3];
                         const baseAlpha = sOpacity*(isFire?(0.7+baseAlphaRandFactor*0.3):(0.3+baseAlphaRandFactor*0.3));
                         let alphaMultiplier = 1;
                         if(isFire) {
                             alphaMultiplier = Math.pow(lifeRatio, 1.8); // Fire fades quickly
                         } else {
                             // Smoke fades in, stays, then fades out
                             const fadeInEnd = 0.1, fadeOutStart = 0.6;
                             if (lifeRatio < fadeInEnd) alphaMultiplier = lifeRatio / fadeInEnd;
                             else if (lifeRatio > fadeOutStart) alphaMultiplier = 1 - (lifeRatio - fadeOutStart) / (1 - fadeOutStart);
                             else alphaMultiplier = 1;
                             alphaMultiplier = Math.max(0, Math.min(1, alphaMultiplier)); // Clamp
                         }
                         const calculatedAlpha = baseAlpha * alphaMultiplier;
                         const newAlpha = isNaN(calculatedAlpha) ? 0 : Math.max(0, Math.min(sOpacity, calculatedAlpha)); // Clamp final alpha
                         if(alphaArr[i] !== newAlpha){ alphaArr[i] = newAlpha; alphaUpd=true; }


                         // --- Update Size based on lifeRatio ---
                         const baseSizeRandFactor = randFactorsArr[i3+1];
                         let sizeFactor = 1;
                         if(isFire) {
                             sizeFactor = Math.max(0.1, lifeRatio * 0.9 + 0.1); // Fire shrinks as it dies
                         } else {
                            // Smoke grows then shrinks slightly
                             const spreadTime = 0.3, growthFactor = 1.5;
                             if (lifeRatio < spreadTime) sizeFactor = 1 + (growthFactor - 1) * (lifeRatio / spreadTime);
                             else sizeFactor = growthFactor - (growthFactor - 0.1) * ((lifeRatio - spreadTime) / (1 - spreadTime));
                             sizeFactor = Math.max(0.1, sizeFactor); // Clamp min size
                         }
                         const baseSize = isFire?(0.5+baseSizeRandFactor*0.5)*sSpread*1.2:(1.2+baseSizeRandFactor*1.0)*sSpread*1.5;
                         const calculatedSize = baseSize * sizeFactor;
                         const newSize = isNaN(calculatedSize) ? 0.02 : Math.max(0.02, calculatedSize); // Clamp final size
                         if(sizeArr[i] !== newSize){ sizeArr[i] = newSize; sizeUpd=true; }
                      }
                  }
              }

              // --- Mark Attributes for Update ---
              // Only set needsUpdate if the flag is true
              if(posUpd)attrs.position.needsUpdate=true; if(alphaUpd)attrs.alpha.needsUpdate=true; if(sizeUpd)attrs.particleSize.needsUpdate=true;
              if(lifeUpd)attrs.life.needsUpdate=true; if(colorUpd)attrs.color.needsUpdate=true; if(velUpd)attrs.velocity.needsUpdate=true;
              if(randUpd)attrs.randomFactors.needsUpdate=true; if(targetUpd)attrs.targetTextPoint.needsUpdate = true;
          };

          // --- Call Update for Both Systems ---
          updateParticles(smokeParticlesRef,isSmokeEnabled,false,actualSmokeParticleCount,smokeSpeed,smokeSpread,smokeOpacity,smokeTurbulence,smokeDissipation,smokeBuoyancy,currentSmokeBaseC,currentSmokeAccentC,finalSmokeColor,effectiveSmokeSource,timeFactorSmoke);
          updateParticles(fireParticlesRef,isFireEnabled,true,actualFireParticleCount,fireSpeed,fireSpread,fireOpacity,fireTurbulence,undefined,undefined,currentFireBaseC,currentFireAccentC,finalFireColor,effectiveFireSource,timeFactorFire);
       }

       // --- Render Scene ---
       try {
           rendererRef.current.render(sceneRef.current, cameraRef.current);
       } catch(e) {
           console.error("Error during render:", e);
           // Optionally stop the animation loop on render error
           if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
           animationFrameIdRef.current = null;
           setLoadError("Render error occurred. Please refresh.");
       }
     };
     animate(); // Start the animation loop

     // --- Resize Handling ---
     const handleResize = debounce(() => {
       if (mountRef.current && rendererRef.current && cameraRef.current && THREE_Module) {
         const width = mountRef.current.clientWidth;
         const height = mountRef.current.clientHeight;
         if (width > 0 && height > 0) {
             const currentSize = rendererRef.current.getSize(new THREE_Module.Vector2());
             // Only resize if dimensions actually changed
             if(currentSize.width !== width || currentSize.height !== height) {
                 rendererRef.current.setSize(width, height);
             }
             // Only update aspect ratio if it changed
             if(cameraRef.current.aspect !== width/height) {
                 cameraRef.current.aspect = width/height;
                 cameraRef.current.updateProjectionMatrix();
             }
         }
       }
     }, 250); // Debounce resize events
     window.addEventListener('resize', handleResize);
     handleResize(); // Initial call to set size

     // --- Cleanup ---
     return () => {
       if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
       animationFrameIdRef.current = null;
       window.removeEventListener('resize', handleResize);
       window.removeEventListener('mousemove', handleMouseMove);
       if (textCanvasRef.current) textCanvasRef.current = null; // Help GC

        // Dispose of renderer and remove canvas
        if (rendererRef.current) {
            if(currentMountRef && rendererRef.current.domElement) {
                try {currentMountRef.removeChild(rendererRef.current.domElement);}catch(e){/*ignore*/}
            }
            rendererRef.current.dispose();
            rendererRef.current = null;
        }
        // Dispose of scene and its contents
        if (sceneRef.current) {
             sceneRef.current.traverse(obj => {
                 if(obj instanceof THREE_Module.Points){
                     if(obj.geometry)obj.geometry.dispose();
                     if(obj.material){
                         const mat = obj.material as any;
                         if(mat.map) mat.map.dispose();
                         if(Array.isArray(mat)) mat.forEach(m=>m.dispose());
                         else mat.dispose();
                     }
                 } else if (obj instanceof THREE_Module.Mesh){
                     if(obj.geometry)obj.geometry.dispose();
                     if(obj.material){
                        const mat = obj.material as any;
                        if(Array.isArray(mat)) mat.forEach(m=>m.dispose());
                        else mat.dispose();
                    }
                 }
             });
             sceneRef.current = null;
        }
        cameraRef.current = null; // Clear camera ref
     };
   }, [ // Main useEffect dependencies
        isThreeLoaded,
        onCanvasReady,
        THREE_Module,
        handleMouseMove,
        getParticleStartPosition,
        debouncedUpdateParticles, // Ensure this updates when its dependencies change
        // Include props that directly affect the animation loop's calculations but don't require particle re-init
        isPlaying,
        windDirectionX, windStrength,
        smokeBaseColor, smokeAccentColor, smokeOpacity, smokeTurbulence, smokeDissipation, smokeBuoyancy,
        fireBaseColor, fireAccentColor, fireOpacity, fireTurbulence,
        particleText, persistTextShape // These now influence the animation loop directly
       ]);


  // Effect for backgroundColor change
  useEffect(() => {
    if (rendererRef.current && THREE_Module && isThreeLoaded) {
       try { rendererRef.current.setClearColor(new THREE_Module.Color(backgroundColor)); }
       catch (e) { console.error("Invalid background color:", backgroundColor, e); rendererRef.current.setClearColor(new THREE_Module.Color("#000000")); }
    }
  }, [backgroundColor, THREE_Module, isThreeLoaded]);

  // Effects for blend mode changes (these don't require full scene rebuild)
  useEffect(() => {
    if (smokeParticlesRef.current?.material && THREE_Module && isThreeLoaded) {
      const material = smokeParticlesRef.current.material as THREE.PointsMaterial; let needsUpdate = false;
      let newBlending = THREE_Module.NormalBlending;
      let newBlendEq = THREE_Module.AddEquation;
      let newBlendSrc = THREE_Module.SrcAlphaFactor;
      let newBlendDst = THREE_Module.OneMinusSrcAlphaFactor;

      switch(smokeBlendMode){
          case "Additive": newBlending = THREE_Module.AdditiveBlending; break;
          case "Subtractive":
               newBlending = THREE_Module.CustomBlending;
               newBlendEq = THREE_Module.ReverseSubtractEquation;
               newBlendSrc = THREE_Module.SrcAlphaFactor; // Or OneFactor?
               newBlendDst = THREE_Module.OneFactor;
              break;
          case "Multiply": newBlending = THREE_Module.MultiplyBlending; break;
          case "Normal": default: newBlending = THREE_Module.NormalBlending; break;
      }

      if (material.blending !== newBlending || material.blendEquation !== newBlendEq || material.blendSrc !== newBlendSrc || material.blendDst !== newBlendDst) {
          material.blending = newBlending;
          material.blendEquation = newBlendEq;
          material.blendSrc = newBlendSrc;
          material.blendDst = newBlendDst;
          needsUpdate=true;
      }
      if (needsUpdate) material.needsUpdate = true;
    }
  }, [smokeBlendMode, isThreeLoaded, THREE_Module]);

  useEffect(() => {
    if (fireParticlesRef.current?.material && THREE_Module && isThreeLoaded) {
      const material = fireParticlesRef.current.material as THREE.PointsMaterial; let needsUpdate = false;
      let newBlending = THREE_Module.AdditiveBlending; // Default for fire
      let newBlendEq = THREE_Module.AddEquation;
      let newBlendSrc = THREE_Module.SrcAlphaFactor;
      let newBlendDst = THREE_Module.OneMinusSrcAlphaFactor;

       switch(fireBlendMode){
          case "Normal": newBlending = THREE_Module.NormalBlending; break;
          case "Subtractive":
               newBlending = THREE_Module.CustomBlending;
               newBlendEq = THREE_Module.ReverseSubtractEquation;
               newBlendSrc = THREE_Module.SrcAlphaFactor; // Or OneFactor?
               newBlendDst = THREE_Module.OneFactor;
              break;
          case "Multiply": newBlending = THREE_Module.MultiplyBlending; break;
          case "Additive": default: newBlending = THREE_Module.AdditiveBlending; break;
      }

       if (material.blending !== newBlending || material.blendEquation !== newBlendEq || material.blendSrc !== newBlendSrc || material.blendDst !== newBlendDst) {
          material.blending = newBlending;
          material.blendEquation = newBlendEq;
          material.blendSrc = newBlendSrc;
          material.blendDst = newBlendDst;
          needsUpdate=true;
       }
      if (needsUpdate) material.needsUpdate = true;
    }
  }, [fireBlendMode, isThreeLoaded, THREE_Module]);


   // --- Render ---
   if (loadError) return <div className="w-full h-full flex items-center justify-center p-4 bg-destructive/10 text-destructive-foreground" role="alert"><div className="text-center"><p className="font-semibold text-lg">Error Loading Simulation</p><p>{loadError}</p></div></div>;
   if (!isThreeLoaded) return <div className="w-full h-full flex items-center justify-center" data-ai-hint="loading indicator"><p className="text-lg animate-pulse">Loading 3D Simulation...</p></div>;
   return <div ref={mountRef} className="w-full h-full" role="img" aria-label="Smoke and fire simulation canvas" data-ai-hint="smoke fire particles simulation" />;
 };
 export default SmokeCanvas;
