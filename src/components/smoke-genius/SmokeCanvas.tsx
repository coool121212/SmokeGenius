
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

const BASE_FIRE_LIFESPAN = 70; // Adjusted for potentially more variance
const BASE_SMOKE_LIFESPAN = 300; // Adjusted for potentially more variance
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

  const actualSmokeParticleCount = useMemo(() => Math.min(smokeDensity, MAX_SMOKE_PARTICLES), [smokeDensity]);
  const actualFireParticleCount = useMemo(() => Math.min(fireDensity, MAX_FIRE_PARTICLES), [fireDensity]);

  const mouseSceneXRef = useRef(0);
  const mouseSceneYRef = useRef(0);

  const textPointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const textCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const effectiveSmokeSource: EffectiveParticleSource = useMemo(() => (particleText ? "Text" : smokeSourceProp), [particleText, smokeSourceProp]);
  const effectiveFireSource: EffectiveParticleSource = useMemo(() => (particleText ? "Text" : fireSourceProp), [particleText, fireSourceProp]);

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
  }, [isThreeLoaded]);


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
    // Subtle sparks/streaks
    context.strokeStyle='rgba(255,255,200,0.1)'; context.lineWidth=0.5;
    for(let i=0;i<30;i++){ context.beginPath(); const a=Math.random()*Math.PI*2, l=size*0.3+Math.random()*size*0.2; context.moveTo(size/2,size/2); context.lineTo(size/2+Math.cos(a)*l,size/2+Math.sin(a)*l); context.stroke(); }
    const texture = new THREE_Module.CanvasTexture(canvas);
    texture.needsUpdate = true; return texture;
  }, [isThreeLoaded]);


  const getParticleStartPosition = useCallback((
      isFire: boolean, sourceType: EffectiveParticleSource, spreadValue: number, cameraPositionZ: number = 5
    ): { x: number; y: number; z: number } => {
    if (!THREE_Module || !cameraRef.current) return { x: 0, y: -2.0, z: 0 }; // Default fallback
    let x=0,y=0,z=0;
    const viewportHeight = 2 * Math.tan(THREE_Module.MathUtils.degToRad(cameraRef.current.fov) / 2) * cameraPositionZ;
    const yBaseline = -viewportHeight * 0.5; // Bottom of the viewport
    const safeSpread = isNaN(spreadValue) || !isFinite(spreadValue) ? 1.0 : spreadValue;

    switch(sourceType){
      case "Text":
        if(textPointsRef.current.length > 0){
          const point = textPointsRef.current[Math.floor(Math.random() * textPointsRef.current.length)];
          const pX = isNaN(point.x) ? 0 : point.x;
          const pY = isNaN(point.y) ? 0 : point.y;
          const offsetScale = 0.05; // Small offset for "cloud" effect around text points
          x = pX + (Math.random() - 0.5) * safeSpread * offsetScale;
          y = pY + (Math.random() - 0.5) * safeSpread * offsetScale;
          z = (Math.random() - 0.5) * safeSpread * offsetScale; // Small depth variation
        } else {
           // Fallback if text points are not available (e.g. text is empty)
           x = (Math.random() - 0.5) * safeSpread * (isFire ? 1 : 1.5);
           y = 0 + (Math.random() - 0.5) * 0.2; // Centered vertically with slight spread
           z = (Math.random() - 0.5) * safeSpread * (isFire ? 1 : 1.5); // Depth spread
        }
        break;
      case "Bottom":
        x = (Math.random() - 0.5) * BOTTOM_SOURCE_X_SPREAD; // Spread across the bottom
        y = yBaseline + (isFire ? Math.random() * 0.1 : Math.random() * 0.3); // Slightly above baseline
        z = (Math.random() - 0.5) * safeSpread * 0.2; // Small depth variation
        break;
      case "Mouse":
        const mX = isNaN(mouseSceneXRef.current) ? 0 : mouseSceneXRef.current;
        const mY = isNaN(mouseSceneYRef.current) ? 0 : mouseSceneYRef.current;
        const mouseSpreadFactor = isFire ? 0.2 : 0.3;
        x = mX + (Math.random() - 0.5) * safeSpread * mouseSpreadFactor;
        y = mY + (Math.random() - 0.5) * safeSpread * mouseSpreadFactor;
        z = (Math.random() - 0.5) * safeSpread * mouseSpreadFactor * 0.1; // Very small depth for mouse
        break;
      case "Center": default:
        x = (Math.random() - 0.5) * safeSpread * (isFire ? 1 : 1.5);
        y = 0 + (Math.random() - 0.5) * 0.2; // Centered vertically with slight spread
        z = (Math.random() - 0.5) * safeSpread * (isFire ? 1 : 1.5); // Depth spread
        break;
    }
    // Ensure no NaN values are returned
    if (isNaN(x) || isNaN(y) || isNaN(z)) {
      // Fallback to a safe default if any calculation results in NaN
      return { x: 0, y: yBaseline + (isFire ? 0 : 0.5), z: 0 };
    }
    return { x, y, z };
  }, [textPointsRef]); // Added textPointsRef dependency


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
    if (!THREE_Module || !isThreeLoaded || !cameraRef.current || !smokeParticleTexture || !fireParticleTexture) {
        // console.warn("initParticles called before THREE or textures are ready, or camera not set.");
        return { geometry: null, material: null };
    }

    const safeCount = Math.floor(Math.max(0, count));
    if (safeCount === 0) return { geometry: null, material: null };

    // Ensure numeric properties are valid, providing defaults if not
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
    const targetTextPoints = new Float32Array(safeCount * 3); // For text shaping
    const randomFactors = new Float32Array(safeCount * 3); // For consistent random variations

    let baseC: THREE.Color, accentC: THREE.Color;
    try {
         baseC = new THREE_Module.Color(baseColorVal);
         accentC = new THREE_Module.Color(accentColorVal);
    } catch (e) {
         // console.warn("Invalid color provided, using default:", e);
         baseC = new THREE_Module.Color(isFireSystem ? "#FFA500" : "#FFFFFF"); // Default fire/smoke base
         accentC = new THREE_Module.Color(isFireSystem ? "#FFD700" : "#E0E0E0"); // Default fire/smoke accent
    }
    const finalColor = new THREE_Module.Color();
    const initialCameraZ = cameraRef.current.position.z; // Use camera's z for consistent yBaseline calculations

    for (let i = 0; i < safeCount; i++) {
      const i3 = i * 3;
      const startPos = getParticleStartPosition(isFireSystem, currentParticleSourceType, safeSpread, initialCameraZ);
      positions[i3] = startPos.x;
      positions[i3 + 1] = startPos.y;
      positions[i3 + 2] = startPos.z;

      let velX, velY, velZ;
      if (isFireSystem) {
        velX = (Math.random() - 0.5) * 0.03 * safeSpread; // Fire tends to spread more erratically
        velY = (Math.random() * 0.8 + 0.6) * safeSpeed * 2.0; // Fire rises faster
        velZ = (Math.random() - 0.5) * 0.03 * safeSpread;
      } else {
        velX = (Math.random() - 0.5) * 0.015 * safeSpread; // Smoke has gentler horizontal spread
        velY = (Math.random() * 0.5 + 0.8) * safeSpeed; // Smoke rises a bit slower
        velZ = (Math.random() - 0.5) * 0.015 * safeSpread;
      }
      velocities[i3] = isNaN(velX) ? 0 : velX;
      velocities[i3 + 1] = isNaN(velY) ? (isFireSystem ? 0.02 : 0.01) : Math.max(0.001, velY); // Ensure positive upward velocity
      velocities[i3 + 2] = isNaN(velZ) ? 0 : velZ;

      const colorLerpFactor = Math.random();
      finalColor.copy(baseC).lerp(accentC, colorLerpFactor);
      particleColors[i3] = finalColor.r;
      particleColors[i3 + 1] = finalColor.g;
      particleColors[i3 + 2] = finalColor.b;

      // Store random factors for consistent re-use on particle reset
      const rand1 = Math.random(); const rand2 = Math.random(); const rand3 = Math.random();
      randomFactors[i3] = rand1; randomFactors[i3 + 1] = rand2; randomFactors[i3 + 2] = rand3;

      let particleSize; let maxLifespanBase;
      if (isFireSystem) {
        alphas[i] = safeOpacity * (0.7 + rand1 * 0.3); // Fire particles start more opaque
        particleSize = (0.5 + rand2 * 0.5) * safeSpread * 1.2; // Fire particles are generally smaller and sharper
        maxLifespanBase = BASE_FIRE_LIFESPAN;
      } else {
        alphas[i] = safeOpacity * (0.3 + rand1 * 0.3); // Smoke particles start more transparent
        particleSize = (1.2 + rand2 * 1.0) * safeSpread * 1.5; // Smoke particles are larger and softer
        maxLifespanBase = BASE_SMOKE_LIFESPAN;
      }
      particleSizes[i] = isNaN(particleSize) ? 0.1 : Math.max(0.02, particleSize); // Ensure a minimum size
      
      // Particle gets a slightly varied max lifespan based on rand1
      const maxLifespan = maxLifespanBase * (0.7 + particleRandFactor1 * 0.3); 
      // Initialize with full maximum lifespan to avoid initial bursts
      lives[i] = isNaN(maxLifespan) ? maxLifespanBase : maxLifespan;


      turbulenceOffsets[i3] = Math.random() * 2 * Math.PI; // Phase offset for turbulence X
      turbulenceOffsets[i3 + 1] = Math.random() * 2 * Math.PI; // Phase offset for turbulence Y
      turbulenceOffsets[i3 + 2] = Math.random() * 100; // Time offset for turbulence evolution

      // Initialize target points for text shaping
      if (textPointsRef.current.length > 0) {
        const point = textPointsRef.current[i % textPointsRef.current.length]; // Cycle through text points
        targetTextPoints[i3] = isNaN(point.x) ? 0 : point.x;
        targetTextPoints[i3 + 1] = isNaN(point.y) ? 0 : point.y;
        targetTextPoints[i3 + 2] = 0; // Text is 2D
      } else {
        // If no text, target points are just their start positions (won't be used actively)
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
    geometry.setAttribute('targetTextPoint', new THREE_Module.BufferAttribute(targetTextPoints, 3)); // For text shaping
    geometry.setAttribute('randomFactors', new THREE_Module.BufferAttribute(randomFactors, 3));


    const material = new THREE_Module.PointsMaterial({
      map: isFireSystem ? fireParticleTexture : smokeParticleTexture,
      depthWrite: false,
      transparent: true,
      vertexColors: true,
      sizeAttenuation: true, // Particle size will change with distance
    });

    // Set blending mode
    if (THREE_Module) {
        switch (currentBlendMode) {
            case "Additive": material.blending = THREE_Module.AdditiveBlending; break;
            case "Subtractive":
                 material.blending = THREE_Module.CustomBlending;
                 material.blendEquation = THREE_Module.ReverseSubtractEquation;
                 material.blendSrc = THREE_Module.SrcAlphaFactor; // Or OneFactor depending on desired effect
                 material.blendDst = THREE_Module.OneFactor;    // Or OneMinusSrcAlphaFactor
                break;
            case "Multiply": material.blending = THREE_Module.MultiplyBlending; break;
            case "Normal": default: material.blending = THREE_Module.NormalBlending; break;
        }
    }

    // Custom shader modifications
    material.onBeforeCompile = shader => {
        // Pass uniforms and attributes to the shader
        shader.uniforms.time = { value: 0.0 };
        // 'scale' is a built-in uniform for PointsMaterial when sizeAttenuation is true.
        // 'size' is also built-in for non-attenuated points. We are creating 'particleSize' attribute.

        shader.vertexShader = `
            attribute float particleSize; // Our custom size attribute
            attribute float alpha;
            attribute vec3 turbulenceOffset; // For varied turbulence per particle
            attribute vec3 targetTextPoint; // For text shaping
            attribute vec3 randomFactors;   // For consistent randomness
            varying float vAlpha;
            varying float vRotation; // Could be used for particle rotation
            uniform float time;      // Simulation time
            // 'scale' uniform IS provided by Three.js PointsMaterial when sizeAttenuation=true
            // 'size' uniform IS provided by Three.js PointsMaterial (typically for non-attenuated points)

            ${shader.vertexShader}
        `;
        // Inject our varying assignments
        shader.vertexShader = shader.vertexShader.replace(
            `#include <logdepthbuf_vertex>`,
            `#include <logdepthbuf_vertex>
             vAlpha = alpha;
             vRotation = 0.0; // Example if you want to vary rotation later
            `
        );
        // Modify point size calculation
        shader.vertexShader = shader.vertexShader.replace(
          `#include <project_vertex>`,
          `
            vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );
            gl_Position = projectionMatrix * mvPosition;
            // Use our 'particleSize' attribute for base size
            gl_PointSize = particleSize * 1.3; // Base multiplier for visual scale

            #ifdef USE_SIZEATTENUATION
              // 'scale' is provided by Three.js (usually related to renderer height)
              bool isPerspectiveFlag = isPerspectiveMatrix( projectionMatrix ); // Renamed to avoid conflict
              if ( isPerspectiveFlag ) {
                  gl_PointSize *= ( scale / -mvPosition.z );
              }
            #endif

            gl_PointSize = max(1.0, gl_PointSize); // Ensure minimum point size
          `
        );


        // Modify fragment shader for alpha and texture mapping
        shader.fragmentShader = `
            varying float vAlpha;
            varying float vRotation; // Available if needed
            ${shader.fragmentShader}
        `.replace(
            `#include <color_fragment>`, // Correct injection point for alpha modification
            `#include <color_fragment>
             diffuseColor.a *= vAlpha;`
        ).replace(
            `#include <map_particle_fragment>`, // Correct injection point for texture rotation/custom mapping
            `#ifdef USE_MAP
                // Standard texture mapping:
                vec2 center = vec2(0.5, 0.5);
                // vec2 rotatedUV = gl_PointCoord; // Simple non-rotated UV
                // If you want rotation:
                // float mid = 0.5;
                // vec2 rotatedUV = vec2(cos(vRotation) * (gl_PointCoord.x - mid) + sin(vRotation) * (gl_PointCoord.y - mid) + mid,
                //                       cos(vRotation) * (gl_PointCoord.y - mid) - sin(vRotation) * (gl_PointCoord.x - mid) + mid);
                vec4 mapTexel = texture2D( map, gl_PointCoord ); // Use gl_PointCoord for particle UVs
                diffuseColor *= mapTexel;
             #endif`
        );
    };
    return { geometry, material };
  }, [isThreeLoaded, smokeParticleTexture, fireParticleTexture, getParticleStartPosition]);


  // Debounced function to re-initialize particles when settings change
  const debouncedUpdateParticles = useCallback(
    debounce(() => {
      if (!mountRef.current || !isThreeLoaded || !THREE_Module || !sceneRef.current || !initParticles) return;
      const scene = sceneRef.current;

      // Helper function to update or create a particle system
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
        sourceType: EffectiveParticleSource, // Use effective source type
        blendMode: BlendMode
      ) => {
        // Dispose old system if it exists
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

        // Create new system if enabled and count > 0
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

      // Update/create smoke particles
      updateOrCreateParticles(
        smokeParticlesRef, isSmokeEnabled, actualSmokeParticleCount, false,
        smokeBaseColor, smokeAccentColor, smokeSpeed, smokeSpread, smokeOpacity,
        effectiveSmokeSource, smokeBlendMode // Use effective smoke source
      );

      // Update/create fire particles
      updateOrCreateParticles(
        fireParticlesRef, isFireEnabled, actualFireParticleCount, true,
        fireBaseColor, fireAccentColor, fireSpeed, fireSpread, fireOpacity,
        effectiveFireSource, fireBlendMode // Use effective fire source
      );
    }, 300), // Debounce timeout
    [
      isThreeLoaded, initParticles, // Dependencies for initParticles
      isSmokeEnabled, actualSmokeParticleCount, smokeBaseColor, smokeAccentColor, smokeSpeed, smokeSpread, smokeOpacity, effectiveSmokeSource, smokeBlendMode, // Smoke props
      isFireEnabled, actualFireParticleCount, fireBaseColor, fireAccentColor, fireSpeed, fireSpread, fireOpacity, effectiveFireSource, fireBlendMode, // Fire props
      // Removed smokeSourceProp, fireSourceProp as they are covered by effectiveSource
    ]
  );

  // Effect for initializing the text canvas (for particle text shaping)
  useEffect(() => {
    textCanvasRef.current = document.createElement('canvas');
    textCanvasRef.current.width = TEXT_CANVAS_WIDTH;
    textCanvasRef.current.height = TEXT_CANVAS_HEIGHT;
     // Cleanup function
     return () => { textCanvasRef.current = null; };
  }, []);

  // Effect for generating points from text
  const generateTextPoints = useCallback((text: string) => {
    if (!textCanvasRef.current || !text) {
      textPointsRef.current = [];
       // Only call debouncedUpdateParticles if the effective source actually changes
       // This is important because debouncedUpdateParticles itself depends on effectiveSource.
       // We need to ensure this call happens *after* effectiveSource has been updated by the particleText change.
       const newEffectiveSmokeSource = text ? "Text" : smokeSourceProp;
       const newEffectiveFireSource = text ? "Text" : fireSourceProp;
       if (newEffectiveSmokeSource !== effectiveSmokeSource || newEffectiveFireSource !== effectiveFireSource) {
           // This check might be redundant if debouncedUpdateParticles' dependencies correctly handle it.
           // However, explicitly calling can ensure responsiveness if text is cleared.
           debouncedUpdateParticles();
       }
      return;
    }
    const canvas = textCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) { textPointsRef.current = []; return; }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = TEXT_FONT;
    ctx.fillStyle = '#ffffff'; // Draw text in white
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const points: Array<{ x: number; y: number }> = [];
    const step = Math.max(1, Math.floor(1 / Math.sqrt(TEXT_SAMPLE_DENSITY))); // Adjust step for density

    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        // Check alpha channel and random chance based on density
        if (data[(y * canvas.width + x) * 4 + 3] > 128 && Math.random() < TEXT_SAMPLE_DENSITY * step * step) {
            // Convert canvas coordinates to scene coordinates
            const sceneX = (x - canvas.width / 2) * TEXT_SHAPE_SCALE;
            const sceneY = -(y - canvas.height / 2) * TEXT_SHAPE_SCALE; // Y is inverted
            if (!isNaN(sceneX) && !isNaN(sceneY)) { // Ensure valid numbers
              points.push({ x: sceneX, y: sceneY });
            }
        }
      }
    }
    textPointsRef.current = points;
    // Call update particles because text points have changed, affecting particle targets
    debouncedUpdateParticles();
  }, [debouncedUpdateParticles, smokeSourceProp, fireSourceProp, effectiveSmokeSource, effectiveFireSource]);


  // Effect to regenerate text points when particleText changes
  useEffect(() => {
    const debouncedGenerate = debounce(() => generateTextPoints(particleText), 300);
    debouncedGenerate();
    // Cleanup for the debounce function
    return () => { if (typeof debouncedGenerate.cancel === 'function') debouncedGenerate.cancel(); };
  }, [particleText, generateTextPoints]);


  // Mouse move handler to update particle source position
   const handleMouseMove = useCallback((event: MouseEvent) => {
     if (!mountRef.current || !cameraRef.current || !THREE_Module) return;
     const canvasBounds = mountRef.current.getBoundingClientRect();
     // Check if canvas has valid dimensions to prevent division by zero or incorrect calculations
     if (canvasBounds.width === 0 || canvasBounds.height === 0) return;

     // Check if mouse is within canvas bounds before processing
     if (event.clientX < canvasBounds.left || event.clientX > canvasBounds.right || event.clientY < canvasBounds.top || event.clientY > canvasBounds.bottom) return;

     const mouseXNDC = ((event.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
     const mouseYNDC = -((event.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;

     const vec = new THREE_Module.Vector3(mouseXNDC, mouseYNDC, 0.5); // z=0.5 is mid-way, adjust as needed
     vec.unproject(cameraRef.current);
     const dir = vec.sub(cameraRef.current.position).normalize();

      // Avoid division by zero if camera is looking parallel to Z-plane (dir.z is close to 0)
     if (Math.abs(dir.z) < 1e-6) return; // Threshold for near-zero
     const distance = -cameraRef.current.position.z / dir.z; // Assumes particles are on Z=0 plane

      // Ensure distance is valid
     if (isNaN(distance) || !isFinite(distance) || distance < 0) return;

     const pos = cameraRef.current.position.clone().add(dir.multiplyScalar(distance));

     // Final check for NaN in position
     if (isNaN(pos.x) || isNaN(pos.y)) return;

     mouseSceneXRef.current = pos.x;
     mouseSceneYRef.current = pos.y;
   }, []);


   // Effect to add/remove mouse move listener
   useEffect(() => {
     if (!isThreeLoaded) return; // Only attach if Three.js is loaded
     window.addEventListener('mousemove', handleMouseMove);
     return () => { window.removeEventListener('mousemove', handleMouseMove); };
   }, [isThreeLoaded, handleMouseMove]);


   // Main effect for Three.js scene setup, animation loop, and cleanup
   useEffect(() => {
     if (!mountRef.current || !isThreeLoaded || !THREE_Module ) return;
     const currentMountRef = mountRef.current;

     // Initialize scene, camera, renderer if they don't exist
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
          setLoadError("Could not initialize 3D graphics. Please refresh."); return;
       }
     }

     // Initial particle setup
     debouncedUpdateParticles();

     const clock = new THREE_Module.Clock();
     let time = 0; // Accumulated time for shader effects

     const animate = () => {
       // Ensure refs are still valid before proceeding
       if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !THREE_Module) {
         if(animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
         animationFrameIdRef.current = null; return;
       }
       animationFrameIdRef.current = requestAnimationFrame(animate);

       const delta = clock.getDelta();
       const safeDelta = Math.max(0, Math.min(delta, 1 / 30)); // Clamp delta to prevent large jumps, ensure positive
       if (safeDelta <= 0 && isPlaying) return; // Skip frame if no time passed and playing
       time += safeDelta; // Accumulate time for shader

        // Update shader time uniform for materials that use it
        const updateShaderTime = (particlesRef: React.RefObject<THREE.Points>) => {
          if (particlesRef.current?.material) {
             const material = particlesRef.current.material as THREE.PointsMaterial;
             // The custom onBeforeCompile setup might place 'time' in 'uniforms'
             const pointsMaterial = material as any; // Type assertion to access custom uniforms
             if (pointsMaterial.uniforms?.time) {
                 pointsMaterial.uniforms.time.value = time;
             } 
             // If 'time' is a direct property (less common for PointsMaterial after onBeforeCompile)
             // else if ('time' in material) { (material as any).time = time; }
          }
        };
        updateShaderTime(smokeParticlesRef);
        updateShaderTime(fireParticlesRef);

       if (isPlaying) {
          // Calculate wind effect for this frame
          const currentWindEffectX = (isNaN(windDirectionX) ? 0 : windDirectionX) * (isNaN(windStrength) ? 0 : windStrength) * safeDelta * 60; // Scale by 60 for per-second feel
          const timeFactorSmoke = time * 0.8; // Slightly different time evolution for smoke
          const timeFactorFire = time * 1.2;  // And for fire

          // Memoize color parsing to avoid re-creation every frame if colors haven't changed
          // These will be updated if the respective color props change due to the main useEffect's dependency array
          let currentSmokeBaseC: THREE.Color, currentSmokeAccentC: THREE.Color;
           try { currentSmokeBaseC = new THREE_Module.Color(smokeBaseColor); currentSmokeAccentC = new THREE_Module.Color(smokeAccentColor); }
           catch(e) { currentSmokeBaseC = new THREE_Module.Color("#FFFFFF"); currentSmokeAccentC = new THREE_Module.Color("#E0E0E0"); }
          const finalSmokeColor = new THREE_Module.Color(); // Reused for lerping

          let currentFireBaseC: THREE.Color, currentFireAccentC: THREE.Color;
           try { currentFireBaseC = new THREE_Module.Color(fireBaseColor); currentFireAccentC = new THREE_Module.Color(fireAccentColor); }
           catch(e) { currentFireBaseC = new THREE_Module.Color("#FFA500"); currentFireAccentC = new THREE_Module.Color("#FFD700"); }
          const finalFireColor = new THREE_Module.Color(); // Reused for lerping

          const shouldPersist = !!particleText && persistTextShape && textPointsRef.current.length > 0;

          // General particle update logic
          const updateParticles = (
              particlesRef: React.RefObject<THREE.Points>, isEnabled: boolean, isFire: boolean, particleCount: number,
              currentSpeed: number, currentSpread: number, currentOpacity: number, currentTurbulence: number,
              currentDissipation: number | undefined, currentBuoyancy: number | undefined, // Smoke-specific
              baseC: THREE.Color, accentC: THREE.Color, finalC: THREE.Color, // Colors
              currentSourceType: EffectiveParticleSource, currentTimeFactor: number // Source and time
          ) => {
              if (!particlesRef.current || !isEnabled || particleCount === 0 || !cameraRef.current) return;

              const geom = particlesRef.current.geometry as THREE.BufferGeometry;
              const attrs = geom.attributes;
              // Ensure all required attributes are present
              if (!attrs.position || !attrs.velocity || !attrs.alpha || !attrs.particleSize || !attrs.life || !attrs.color || !attrs.turbulenceOffset || !attrs.targetTextPoint || !attrs.randomFactors) {
                   // console.warn("Particle attributes missing for update.");
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

              let posUpd=false, alphaUpd=false, sizeUpd=false, lifeUpd=false, colorUpd=false, velUpd=false, randUpd=false, targetUpd = false;

              // Safe values for numeric properties
              const sOpacity = isNaN(currentOpacity)?(isFire?0.7:0.5):currentOpacity;
              const sSpread = isNaN(currentSpread)?1:currentSpread;
              const bLifespanBase = isFire?BASE_FIRE_LIFESPAN:BASE_SMOKE_LIFESPAN;
              const sSpeed = isNaN(currentSpeed)?(isFire?0.03:0.015):currentSpeed;
              const sTurbulence = isNaN(currentTurbulence)?1:currentTurbulence;
              const sDissipation = isNaN(currentDissipation??0.15)?0.15:(currentDissipation??0.15); // Default dissipation if undefined
              const sBuoyancy = isNaN(currentBuoyancy??0.005)?0.005:(currentBuoyancy??0.005); // Default buoyancy if undefined

              const camZ = cameraRef.current.position.z;
              const vHeight = 2*Math.tan(THREE_Module.MathUtils.degToRad(cameraRef.current.fov)/2)*camZ;
              const respawnHeight = vHeight * (isFire?0.6:0.55); // Particles respawn if they go too high

              for (let i=0; i<particleCount; ++i) {
                  const i3=i*3;
                  // Retrieve per-particle random factors for consistent behavior
                  const particleRandFactor1 = randFactorsArr[i3]; // For lifespan variation, etc.
                  const particleRandFactor2 = randFactorsArr[i3+1]; // For size variation
                  const particleRandFactor3 = randFactorsArr[i3+2]; // For initial alpha/color lerp

                  // Determine this particle's max lifespan based on its inherent random factor
                  const bLifespan = bLifespanBase * (0.7 + particleRandFactor1 * 0.3); // Individual max lifespan


                  if (shouldPersist && targetPtArr) { // Particle Text Persistence Logic
                      const tX=targetPtArr[i3], tY=targetPtArr[i3+1], tZ=targetPtArr[i3+2];
                      const cX=posArr[i3], cY=posArr[i3+1], cZ=posArr[i3+2];

                      if(!isNaN(tX) && !isNaN(tY) && !isNaN(tZ) && !isNaN(cX) && !isNaN(cY) && !isNaN(cZ)){
                         // Pull towards target point
                         posArr[i3] += (tX - cX) * PERSIST_PULL_FACTOR * safeDelta * 60;
                         posArr[i3+1] += (tY - cY) * PERSIST_PULL_FACTOR * safeDelta * 60;
                         posArr[i3+2] += (tZ - cZ) * PERSIST_PULL_FACTOR * safeDelta * 60;

                         // Add jitter for a "live" feel
                         const jit = PERSIST_JITTER_STRENGTH * sSpread;
                         posArr[i3] += (Math.random() - 0.5) * jit * safeDelta * 60;
                         posArr[i3+1] += (Math.random() - 0.5) * jit * safeDelta * 60;
                         posArr[i3+2] += (Math.random() - 0.5) * jit * safeDelta * 60;
                         posUpd = true;
                      } else { // Handle NaN positions by snapping to target
                         if(isNaN(posArr[i3]) && !isNaN(tX)) posArr[i3] = tX;
                         if(isNaN(posArr[i3+1]) && !isNaN(tY)) posArr[i3+1] = tY;
                         if(isNaN(posArr[i3+2]) && !isNaN(tZ)) posArr[i3+2] = tZ;
                         posUpd = true;
                      }

                      // Keep particles "alive" and opaque
                      if(lifeArr[i] < bLifespan * 0.99){ lifeArr[i] = bLifespan; lifeUpd = true; } // Keep life high
                      const targetAlpha = sOpacity * 0.95; // Mostly opaque
                      if(alphaArr[i] !== targetAlpha){ alphaArr[i] = targetAlpha; alphaUpd = true; }
                      if(velArr[i3]!==0||velArr[i3+1]!==0||velArr[i3+2]!==0){ velArr[i3]=0; velArr[i3+1]=0; velArr[i3+2]=0; velUpd=true; } // Stop movement

                  } else { // Regular particle physics
                      // Decrease life, accounting for dissipation
                      let cLife=lifeArr[i] - (safeDelta * (15 + sDissipation * 40)); // Dissipation makes life decrease faster
                      lifeUpd = true;

                      // Respawn condition: life ended or particle too high or NaN
                      if(cLife <= 0 || posArr[i3+1] > respawnHeight || isNaN(cLife) || isNaN(posArr[i3+1])){
                         if(isNaN(cLife)||isNaN(posArr[i3+1])) { /* console.warn("NaN in life/pos, resetting particle") */ }

                         const sPos = getParticleStartPosition(isFire, currentSourceType, sSpread, camZ);
                         posArr[i3] = sPos.x; posArr[i3+1] = sPos.y; posArr[i3+2] = sPos.z; posUpd=true;

                         // Particle gets its full (varied) max lifespan on reset
                         lifeArr[i] = bLifespan; // Use the particle-specific max lifespan
                         
                         // Reset alpha and size using stored random factors for consistency
                         let rAlpha = sOpacity*(isFire?(0.7+particleRandFactor1*0.3):(0.3+particleRandFactor1*0.3));
                         let rSize = (isFire?(0.5+particleRandFactor2*0.5)*sSpread*1.2:(1.2+particleRandFactor2*1.0)*sSpread*1.5);
                         
                         alphaArr[i] = isNaN(rAlpha)?sOpacity*(isFire?0.7:0.3):rAlpha; alphaUpd=true;
                         sizeArr[i] = isNaN(rSize)?0.1:Math.max(0.02,rSize); sizeUpd=true;

                         // Reset velocity
                         let vX=0,vY=0,vZ=0;
                         if(isFire){vX=(Math.random()-0.5)*0.03*sSpread; vY=(Math.random()*0.8+0.6)*sSpeed*2; vZ=(Math.random()-0.5)*0.03*sSpread;}
                         else{vX=(Math.random()-0.5)*0.015*sSpread; vY=(Math.random()*0.5+0.8)*sSpeed; vZ=(Math.random()-0.5)*0.015*sSpread;}
                         velArr[i3]=isNaN(vX)?0:vX; velArr[i3+1]=isNaN(vY)?(isFire?0.02:0.01):Math.max(0.001,vY); velArr[i3+2]=isNaN(vZ)?0:vZ; velUpd=true;

                         // Reset color using stored random factor
                         finalC.copy(baseC).lerp(accentC, particleRandFactor3); // Use stored random for color
                         colorArr[i3]=finalC.r;colorArr[i3+1]=finalC.g;colorArr[i3+2]=finalC.b; colorUpd=true;

                         // Update target text point if text is active
                         if (!particleText && targetPtArr) { // If text was cleared, reset target points (though not strictly necessary if not used)
                             targetPtArr[i3] = sPos.x; targetPtArr[i3+1] = sPos.y; targetPtArr[i3+2] = sPos.z;
                             targetUpd = true;
                         } else if (textPointsRef.current.length > 0 && targetPtArr) { // If text exists, assign target point
                            const p = textPointsRef.current[i % textPointsRef.current.length];
                            targetPtArr[i3] = isNaN(p.x) ? 0 : p.x;
                            targetPtArr[i3+1] = isNaN(p.y) ? 0 : p.y;
                            targetPtArr[i3+2] = 0;
                            targetUpd = true;
                         }

                      } else { // Update existing particle
                         lifeArr[i]=cLife;

                         const lifeRatio = Math.max(0, Math.min(1, cLife / Math.max(0.01, bLifespan))); // Normalize life: 0-1

                         // Turbulence calculation (Perlin noise like)
                         const tXo=turbOffArr[i3], tYo=turbOffArr[i3+1], tZo=turbOffArr[i3+2];
                         const nTime = currentTimeFactor + tZo * 0.01; // Evolve turbulence over time
                         const turbStrength = sTurbulence * (isFire?0.015:0.008) * safeDelta * 60; // Scaled turbulence strength
                         const turbScale = isFire?0.8:0.6; // Spatial scale of turbulence

                         const turbX = Math.sin(posArr[i3+1]*turbScale+nTime+tXo)*turbStrength*1.5; // Turbulence in X
                         const turbY = Math.cos(posArr[i3]*turbScale+nTime+tYo)*turbStrength*(isFire?2:1.5); // Turbulence in Y (stronger for fire)
                         const turbZ = Math.sin(posArr[i3+2]*turbScale+nTime+tXo+tYo)*turbStrength*0.8; // Turbulence in Z

                         // Apply buoyancy (for smoke) and drag
                         if(!isFire) { // Smoke specific
                             velArr[i3+1] += sBuoyancy * safeDelta * 60; // Buoyancy pushes smoke up
                             velUpd = true;
                         }
                         // Air resistance/drag
                         velArr[i3+1] *= isFire?0.99:0.98; // Fire has less drag vertically
                         velArr[i3] *= isFire?0.96:0.97;   // Horizontal drag
                         velArr[i3+2] *= isFire?0.96:0.97; // Depth drag
                         velUpd = true;

                         // Update position based on velocity, turbulence, and wind
                         const pX = posArr[i3], pY = posArr[i3+1], pZ = posArr[i3+2];
                         let nPosX = pX + (velArr[i3] + turbX + currentWindEffectX * (isFire ? 0.7 : 1)) * safeDelta * 60;
                         let nPosY = pY + (velArr[i3+1] + turbY) * safeDelta * 60;
                         let nPosZ = pZ + (velArr[i3+2] + turbZ) * safeDelta * 60;

                         // Handle NaN propagation
                         if(isNaN(nPosX)||isNaN(nPosY)||isNaN(nPosZ)){
                           // console.warn("NaN in particle position calculation, forcing reset.");
                           lifeArr[i]=-1; // Force reset on next frame
                           lifeUpd=true; continue; // Skip further updates for this particle
                         }
                         posArr[i3] = nPosX; posArr[i3+1] = nPosY; posArr[i3+2] = nPosZ; posUpd=true;

                         // Update alpha based on lifeRatio
                         const baseAlpha = sOpacity*(isFire?(0.7+particleRandFactor1*0.3):(0.3+particleRandFactor1*0.3)); // Base alpha from initialization
                         let alphaMultiplier = 1;
                         if(isFire) { // Fire fades more sharply
                             alphaMultiplier = Math.pow(lifeRatio, 1.8);
                         } else { // Smoke has a gentler fade-in and fade-out
                             const fadeInEnd = 0.1, fadeOutStart = 0.6;
                             if (lifeRatio < fadeInEnd) alphaMultiplier = lifeRatio / fadeInEnd; // Fade in
                             else if (lifeRatio > fadeOutStart) alphaMultiplier = 1 - (lifeRatio - fadeOutStart) / (1 - fadeOutStart); // Fade out
                             else alphaMultiplier = 1; // Fully visible
                             alphaMultiplier = Math.max(0, Math.min(1, alphaMultiplier));
                         }
                         const calculatedAlpha = baseAlpha * alphaMultiplier;
                         const newAlpha = isNaN(calculatedAlpha) ? 0 : Math.max(0, Math.min(sOpacity, calculatedAlpha)); // Clamp alpha
                         if(alphaArr[i] !== newAlpha){ alphaArr[i] = newAlpha; alphaUpd=true; }

                         // Update size based on lifeRatio
                         const baseSizeRandFactor = particleRandFactor2; // From initialization
                         let sizeFactor = 1;
                         if(isFire) { // Fire particles shrink as they die
                             sizeFactor = Math.max(0.1, lifeRatio * 0.9 + 0.1);
                         } else { // Smoke particles can grow then shrink
                             const spreadTime = 0.3, growthFactor = 1.5;
                             if (lifeRatio < spreadTime) sizeFactor = 1 + (growthFactor - 1) * (lifeRatio / spreadTime); // Grow
                             else sizeFactor = growthFactor - (growthFactor - 0.1) * ((lifeRatio - spreadTime) / (1 - spreadTime)); // Shrink
                             sizeFactor = Math.max(0.1, sizeFactor);
                         }
                         const baseSize = isFire?(0.5+baseSizeRandFactor*0.5)*sSpread*1.2:(1.2+baseSizeRandFactor*1.0)*sSpread*1.5;
                         const calculatedSize = baseSize * sizeFactor;
                         const newSize = isNaN(calculatedSize) ? 0.02 : Math.max(0.02, calculatedSize); // Clamp size
                         if(sizeArr[i] !== newSize){ sizeArr[i] = newSize; sizeUpd=true; }
                      }
                  }
              }

              // Mark attributes for update if they changed
              if(posUpd)attrs.position.needsUpdate=true; if(alphaUpd)attrs.alpha.needsUpdate=true; if(sizeUpd)attrs.particleSize.needsUpdate=true;
              if(lifeUpd)attrs.life.needsUpdate=true; if(colorUpd)attrs.color.needsUpdate=true; if(velUpd)attrs.velocity.needsUpdate=true;
              if(randUpd)attrs.randomFactors.needsUpdate=true; if(targetUpd)attrs.targetTextPoint.needsUpdate = true;
          };

          // Update smoke particles
          updateParticles(smokeParticlesRef,isSmokeEnabled,false,actualSmokeParticleCount,smokeSpeed,smokeSpread,smokeOpacity,smokeTurbulence,smokeDissipation,smokeBuoyancy,currentSmokeBaseC,currentSmokeAccentC,finalSmokeColor,effectiveSmokeSource,timeFactorSmoke);
          // Update fire particles
          updateParticles(fireParticlesRef,isFireEnabled,true,actualFireParticleCount,fireSpeed,fireSpread,fireOpacity,fireTurbulence,undefined,undefined,currentFireBaseC,currentFireAccentC,finalFireColor,effectiveFireSource,timeFactorFire); // Fire doesn't use dissipation/buoyancy from smoke controls
       }

       // --- Render Scene ---
       try {
           if (rendererRef.current && sceneRef.current && cameraRef.current) {
             rendererRef.current.render(sceneRef.current, cameraRef.current);
           }
       } catch(e) {
           console.error("Error during render:", e);
           // Optionally stop the animation loop on render error
           if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
           animationFrameIdRef.current = null;
           setLoadError("Render error occurred. Please refresh."); // Inform user
       }
     };
     animate(); // Start animation loop

     // Resize handler
     const handleResize = debounce(() => {
       if (mountRef.current && rendererRef.current && cameraRef.current && THREE_Module) {
         const width = mountRef.current.clientWidth;
         const height = mountRef.current.clientHeight;
         if (width > 0 && height > 0) { // Ensure valid dimensions
             const currentSize = rendererRef.current.getSize(new THREE_Module.Vector2());
             if(currentSize.width !== width || currentSize.height !== height) { // Only resize if necessary
                 rendererRef.current.setSize(width, height);
             }
             if(cameraRef.current.aspect !== width/height) { // Only update aspect if necessary
                 cameraRef.current.aspect = width/height;
                 cameraRef.current.updateProjectionMatrix();
             }
         }
       }
     }, 250);
     window.addEventListener('resize', handleResize);
     handleResize(); // Initial call to set size

     // Cleanup function
     return () => {
       if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
       animationFrameIdRef.current = null;
       window.removeEventListener('resize', handleResize);
       window.removeEventListener('mousemove', handleMouseMove); // Clean up mouse listener
       if (textCanvasRef.current) textCanvasRef.current = null; // Clean up text canvas ref

        // Dispose Three.js objects
        if (rendererRef.current) {
            if(currentMountRef && rendererRef.current.domElement) {
                try {currentMountRef.removeChild(rendererRef.current.domElement);}catch(e){/*ignore if already removed*/}
            }
            rendererRef.current.dispose();
            rendererRef.current = null;
        }
        if (sceneRef.current) {
             sceneRef.current.traverse(obj => { // Traverse and dispose all objects in scene
                 if(obj instanceof THREE_Module.Points){
                     if(obj.geometry)obj.geometry.dispose();
                     if(obj.material){
                         const mat = obj.material as any;
                         if(mat.map) mat.map.dispose(); // Dispose textures
                         if(Array.isArray(mat)) mat.forEach(m=>m.dispose());
                         else mat.dispose();
                     }
                 } else if (obj instanceof THREE_Module.Mesh){ // Handle other mesh types if any
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
        cameraRef.current = null;
     };
   }, [
        isThreeLoaded, // Primary condition for setup
        // Callbacks
        onCanvasReady,
        handleMouseMove, // For mouse particle source
        getParticleStartPosition, // Particle positioning logic
        debouncedUpdateParticles, // For re-initializing particles on prop changes
        // Simulation state
        isPlaying,
        // Wind properties
        windDirectionX, windStrength,
        // Smoke properties (ensure all relevant are listed for debouncedUpdateParticles)
        isSmokeEnabled, smokeBaseColor, smokeAccentColor, smokeOpacity, smokeTurbulence, smokeDissipation, smokeBuoyancy, smokeBlendMode, actualSmokeParticleCount, smokeSpeed, smokeSpread, effectiveSmokeSource,
        // Fire properties (ensure all relevant are listed)
        isFireEnabled, fireBaseColor, fireAccentColor, fireOpacity, fireTurbulence, fireBlendMode, actualFireParticleCount, fireSpeed, fireSpread, effectiveFireSource,
        // Text shaping properties
        particleText, persistTextShape, 
        // Note: backgroundColor, smokeSourceProp, fireSourceProp are handled via other effects or effectiveSource
       ]);


  // Effect to update background color
  useEffect(() => {
    if (rendererRef.current && THREE_Module && isThreeLoaded) {
       try { rendererRef.current.setClearColor(new THREE_Module.Color(backgroundColor)); }
       catch (e) { 
         // console.warn("Invalid background color, using default black:", e);
         if (rendererRef.current && THREE_Module) { // Ensure renderer still exists
           rendererRef.current.setClearColor(new THREE_Module.Color("#000000")); 
         }
       }
    }
  }, [backgroundColor, isThreeLoaded]);

  // Effect to update smoke blend mode
  useEffect(() => {
    if (smokeParticlesRef.current?.material && THREE_Module && isThreeLoaded) {
      const material = smokeParticlesRef.current.material as THREE.PointsMaterial; let needsUpdate = false;
      let newBlending = THREE_Module.NormalBlending;
      let newBlendEq = THREE_Module.AddEquation; // Default for Additive and Normal
      let newBlendSrc = THREE_Module.SrcAlphaFactor; // Default
      let newBlendDst = THREE_Module.OneMinusSrcAlphaFactor; // Default for Normal

      switch(smokeBlendMode){
          case "Additive": 
            newBlending = THREE_Module.AdditiveBlending; 
            // SrcAlpha, One is common for additive glow
            newBlendSrc = THREE_Module.SrcAlphaFactor; 
            newBlendDst = THREE_Module.OneFactor;
            break;
          case "Subtractive":
               newBlending = THREE_Module.CustomBlending;
               newBlendEq = THREE_Module.ReverseSubtractEquation;
               newBlendSrc = THREE_Module.SrcAlphaFactor; 
               newBlendDst = THREE_Module.OneFactor;    
              break;
          case "Multiply": 
            newBlending = THREE_Module.MultiplyBlending;
            // Default src/dst for multiply are usually fine (DstColor, ZeroFactor or OneMinusSrcAlpha)
            // but check Three.js docs if specific behavior is needed.
            // For typical multiply:
            // newBlendSrc = THREE_Module.DstColorFactor;
            // newBlendDst = THREE_Module.ZeroFactor; // or OneMinusSrcAlphaFactor for softer multiply
            break;
          case "Normal": default: 
            newBlending = THREE_Module.NormalBlending; 
            // Standard alpha blending already set by defaults
            break;
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
  }, [smokeBlendMode, isThreeLoaded]);

  // Effect to update fire blend mode
  useEffect(() => {
    if (fireParticlesRef.current?.material && THREE_Module && isThreeLoaded) {
      const material = fireParticlesRef.current.material as THREE.PointsMaterial; let needsUpdate = false;
      // Default to Additive for fire
      let newBlending = THREE_Module.AdditiveBlending;
      let newBlendEq = THREE_Module.AddEquation;
      let newBlendSrc = THREE_Module.SrcAlphaFactor;
      let newBlendDst = THREE_Module.OneFactor; // Common for additive fire

       switch(fireBlendMode){
          case "Normal": 
            newBlending = THREE_Module.NormalBlending;
            newBlendDst = THREE_Module.OneMinusSrcAlphaFactor; // Reset for normal
            break;
          case "Subtractive":
               newBlending = THREE_Module.CustomBlending;
               newBlendEq = THREE_Module.ReverseSubtractEquation;
               // SrcAlpha, OneFactor is a common setup for subtractive
               newBlendSrc = THREE_Module.SrcAlphaFactor; 
               newBlendDst = THREE_Module.OneFactor;    
              break;
          case "Multiply": 
            newBlending = THREE_Module.MultiplyBlending;
            // Reset Dst for multiply if needed, often DstColor, ZeroFactor
            // newBlendSrc = THREE_Module.DstColorFactor; 
            // newBlendDst = THREE_Module.ZeroFactor;
            newBlendDst = THREE_Module.OneMinusSrcAlphaFactor; // Or softer
            break;
          case "Additive": default: 
            // Already set by defaults above for fire
            break; 
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
  }, [fireBlendMode, isThreeLoaded]);


   if (loadError) return <div className="w-full h-full flex items-center justify-center p-4 bg-destructive/10 text-destructive-foreground" role="alert"><div className="text-center"><p className="font-semibold text-lg">Error Loading Simulation</p><p>{loadError}</p></div></div>;
   if (!isThreeLoaded) return <div className="w-full h-full flex items-center justify-center" data-ai-hint="loading indicator"><p className="text-lg animate-pulse">Loading 3D Simulation...</p></div>;
   return <div ref={mountRef} className="w-full h-full" role="img" aria-label="Smoke and fire simulation canvas" data-ai-hint="smoke fire particles simulation" />;
 };
 export default SmokeCanvas;
    

    
