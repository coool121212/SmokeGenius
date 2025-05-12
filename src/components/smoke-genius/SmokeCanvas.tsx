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

const MAX_SMOKE_PARTICLES = 5000;
const MAX_FIRE_PARTICLES = 3000;

const BASE_FIRE_LIFESPAN = 60;
const BASE_SMOKE_LIFESPAN = 200;
const BOTTOM_SOURCE_X_SPREAD = 12.0;

const TEXT_CANVAS_WIDTH = 512;
const TEXT_CANVAS_HEIGHT = 128;
const TEXT_FONT_SIZE = 80;
const TEXT_FONT = `bold ${TEXT_FONT_SIZE}px Arial, sans-serif`;
const TEXT_SAMPLE_DENSITY = 0.3; // Reduced from 0.4
const TEXT_SHAPE_SCALE = 0.02;

const SmokeCanvas: React.FC<SmokeCanvasProps> = ({
  isSmokeEnabled = true,
  smokeDensity = 5000,
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

  const smokeSource = particleText ? "Text" : smokeSourceProp;
  const fireParticleSource = particleText ? "Text" : fireSourceProp;

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
    for (let y = 0; y < canvas.height; y += 3) { // Increased step for perf
      for (let x = 0; x < canvas.width; x += 3) { // Increased step for perf
        const alphaIndex = (y * canvas.width + x) * 4 + 3;
        if (data[alphaIndex] > 128 && Math.random() < TEXT_SAMPLE_DENSITY) {
          const sceneX = (x - canvas.width / 2) * TEXT_SHAPE_SCALE;
          const sceneY = -(y - canvas.height / 2) * TEXT_SHAPE_SCALE;
          points.push({ x: sceneX, y: sceneY });
        }
      }
    }
    textPointsRef.current = points;
  }, []);

  useEffect(() => {
    generateTextPoints(particleText);
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
     if (isNaN(distance) || !isFinite(distance)) return;
     const pos = cameraRef.current.position.clone().add(dir.multiplyScalar(distance));
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
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (!context) return null;
    const gradient = context.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0,
      canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    gradient.addColorStop(0, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(0.6, 'rgba(255,255,255,0.2)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
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
    gradient.addColorStop(0, 'rgba(255, 220, 180, 0.8)');
    gradient.addColorStop(0.3, 'rgba(255, 180, 100, 0.6)');
    gradient.addColorStop(0.6, 'rgba(255, 120, 30, 0.3)');
    gradient.addColorStop(1, 'rgba(200, 50, 0, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    return new THREE_Module.CanvasTexture(canvas);
  }, [isThreeLoaded]);

  const getParticleStartPosition = useCallback((
      isFire: boolean,
      source: ParticleSource | "Text",
      spreadVal: number
    ): { x: number; y: number; z: number } => {
    let x = 0, y = 0, z = 0;
    const safeSpread = isNaN(spreadVal) || !isFinite(spreadVal) ? 1.0 : spreadVal;

    switch (source) {
      case "Text":
        if (textPointsRef.current.length > 0) {
          const point = textPointsRef.current[Math.floor(Math.random() * textPointsRef.current.length)];
          const pointX = isNaN(point.x) ? 0 : point.x;
          const pointY = isNaN(point.y) ? 0 : point.y;
          x = pointX + (Math.random() - 0.5) * safeSpread * 0.1;
          y = pointY + (Math.random() - 0.5) * safeSpread * 0.1;
          z = (Math.random() - 0.5) * safeSpread * 0.1;
        } else {
          x = (Math.random() - 0.5) * safeSpread * (isFire ? 1.8 : 2.2);
          y = isFire ? -2.5 + (Math.random() - 0.5) * 0.2 : -2.0 + (Math.random() - 0.5) * 0.5; // Raised smoke default Y
          z = (Math.random() - 0.5) * safeSpread * (isFire ? 1.8 : 2.2);
        }
        break;
      case "Bottom":
        x = (Math.random() - 0.5) * BOTTOM_SOURCE_X_SPREAD;
        y = isFire ? -2.5 + (Math.random() * 0.1) : -2.5 + (Math.random() * 0.3); // Smoke starts slightly higher
        z = (Math.random() - 0.5) * safeSpread * (isFire ? 0.6 : 0.8);
        break;
      case "Mouse":
        const mouseX = isNaN(mouseSceneXRef.current) ? 0 : mouseSceneXRef.current;
        const mouseY = isNaN(mouseSceneYRef.current) ? 0 : mouseSceneYRef.current;
        const mouseSpreadFactor = isFire ? 0.3 : 0.4;
        x = mouseX + (Math.random() - 0.5) * safeSpread * mouseSpreadFactor;
        y = mouseY + (Math.random() - 0.5) * safeSpread * mouseSpreadFactor;
        z = (Math.random() - 0.5) * safeSpread * mouseSpreadFactor * 0.5;
        break;
      case "Center":
      default:
        x = (Math.random() - 0.5) * safeSpread * (isFire ? 1.8 : 2.2);
        y = isFire ? -2.5 + (Math.random() - 0.5) * 0.2 : -2.0 + (Math.random() - 0.5) * 0.5; // Raised smoke default Y
        z = (Math.random() - 0.5) * safeSpread * (isFire ? 1.8 : 2.2);
        break;
    }
    if (isNaN(x) || isNaN(y) || isNaN(z)) return { x: 0, y: isFire ? -2.5 : -2.0, z: 0 };
    return { x, y, z };
  }, []);

  const initParticles = useCallback((
    count: number,
    isFireSystem: boolean,
    baseColorVal: string,
    accentColorVal: string,
    speedVal: number,
    spreadVal: number,
    opacityVal: number,
    currentParticleSourceType: ParticleSource | "Text",
    currentBlendMode?: BlendMode
  ): { geometry: THREE.BufferGeometry | null; material: THREE.PointsMaterial | null } => {
    if (!THREE_Module || count === 0) return { geometry: null, material: null };
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

    const baseC = new THREE_Module.Color(baseColorVal);
    const accentC = new THREE_Module.Color(accentColorVal);
    const finalColor = new THREE_Module.Color();

    for (let i = 0; i < safeCount; i++) {
      const i3 = i * 3;
      const startPos = getParticleStartPosition(isFireSystem, currentParticleSourceType, safeSpread);
      positions[i3] = startPos.x;
      positions[i3 + 1] = startPos.y;
      positions[i3 + 2] = startPos.z;

      let velX, velY, velZ;
      if (isFireSystem) {
        velX = (Math.random() - 0.5) * 0.02 * safeSpread;
        velY = (Math.random() * safeSpeed * 1.8) + safeSpeed * 1.5;
        velZ = (Math.random() - 0.5) * 0.02 * safeSpread;
      } else { // Smoke
        velX = (Math.random() - 0.5) * 0.025 * safeSpread;
        velY = safeSpeed * (0.5 + Math.random() * 0.7); // Stronger initial Y for smoke
        velZ = (Math.random() - 0.5) * 0.025 * safeSpread;
      }
      velocities[i3] = isNaN(velX) ? 0 : velX;
      velocities[i3 + 1] = isNaN(velY) ? (isFireSystem ? 0.02 : 0.01) : velY;
      velocities[i3 + 2] = isNaN(velZ) ? 0 : velZ;

      finalColor.copy(baseC);
      finalColor.lerp(accentC, Math.random() * (isFireSystem ? 0.7 : 0.3));
      if (isFireSystem) {
        const fireHsl = { h: 0, s: 0, l: 0 };
        finalColor.getHSL(fireHsl);
        if (!isNaN(fireHsl.h) && !isNaN(fireHsl.s) && !isNaN(fireHsl.l)) {
            finalColor.setHSL(fireHsl.h + (Math.random() - 0.5) * 0.05, Math.max(0.85, fireHsl.s - Math.random() * 0.1), Math.min(0.95, fireHsl.l + Math.random() * 0.1));
        }
      }
      particleColors[i3] = finalColor.r;
      particleColors[i3 + 1] = finalColor.g;
      particleColors[i3 + 2] = finalColor.b;

      let particleSize;
      if (isFireSystem) {
        alphas[i] = safeOpacity * (0.7 + Math.random() * 0.3);
        particleSize = (0.6 + Math.random() * 0.6) * (safeSpread / 1.1);
        lives[i] = Math.random() * BASE_FIRE_LIFESPAN * 0.5 + BASE_FIRE_LIFESPAN * 0.5;
      } else { // Smoke
        alphas[i] = safeOpacity * (0.1 + Math.random() * 0.2); // Increased initial alpha for smoke
        particleSize = (0.6 + Math.random() * 0.6) * (safeSpread / 1.5);
        lives[i] = Math.random() * BASE_SMOKE_LIFESPAN * 0.7 + BASE_SMOKE_LIFESPAN * 0.3;
      }
      particleSizes[i] = isNaN(particleSize) ? 0.1 : Math.max(0.01, particleSize);
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
    geometry.setAttribute('turbulenceOffset', new THREE_Module.BufferAttribute(turbulenceOffsets, 3));

    const material = new THREE_Module.PointsMaterial({
      map: isFireSystem ? fireParticleTexture : smokeParticleTexture,
      depthWrite: false,
      transparent: true,
      vertexColors: true,
      sizeAttenuation: true,
    });

    if (currentBlendMode === "Subtractive" && THREE_Module) {
      material.blending = THREE_Module.CustomBlending;
      material.blendEquation = THREE_Module.ReverseSubtractEquation;
      material.blendSrc = THREE_Module.SrcAlphaFactor;
      material.blendDst = THREE_Module.OneFactor; // For subtractive, OneFactor on Dst is common
      material.blendSrcAlpha = THREE_Module.SrcAlphaFactor;
      material.blendDstAlpha = THREE_Module.OneFactor;
      material.blendEquationAlpha = THREE_Module.AddEquation;
    } else if (THREE_Module) {
      let blendingModeEnum = THREE_Module.NormalBlending;
      switch (currentBlendMode) {
        case "Additive": blendingModeEnum = THREE_Module.AdditiveBlending; break;
        case "Multiply": blendingModeEnum = THREE_Module.MultiplyBlending; break;
        case "Normal": default: blendingModeEnum = THREE_Module.NormalBlending; break;
      }
      material.blending = blendingModeEnum;
    }

    material.onBeforeCompile = shader => {
      const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      shader.vertexShader = `
        attribute float particleSize;
        attribute float alpha;
        attribute vec3 turbulenceOffset;
        varying float vAlpha;
        varying vec3 vTurbulenceOffset;
        ${shader.vertexShader}
      `.replace(
        `#include <begin_vertex>`,
        `#include <begin_vertex>
         transformed = vec3( position );
         vAlpha = alpha;
         vTurbulenceOffset = turbulenceOffset;`
      ).replace(
        `#include <project_vertex>`,
         `#include <project_vertex>
          float basePointSize = particleSize * ${pixelRatio.toFixed(1)};
          #ifdef USE_SIZEATTENUATION
            float eyeDistance = max(0.001, -mvPosition.z);
            if ( isPerspectiveMatrix( projectionMatrix ) ) basePointSize *= ( 100.0 / eyeDistance );
          #endif
          gl_PointSize = max(1.0, basePointSize);`
      );
      shader.fragmentShader = `
        varying float vAlpha;
        varying vec3 vTurbulenceOffset;
        ${shader.fragmentShader}
      `.replace(
        `vec4 diffuseColor = vec4( diffuse, opacity );`,
        `vec4 diffuseColor = vec4( vColor, vAlpha * opacity );`
      ).replace(
        `#include <map_particle_fragment>`,
         `#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
            vec2 uv = gl_PointCoord;
          #endif
          #ifdef USE_MAP
            vec4 mapTexel = texture2D( map, uv );
            diffuseColor *= mapTexel;
          #endif
          #ifdef USE_ALPHAMAP
             diffuseColor.a *= texture2D( alphaMap, uv ).g;
          #endif`
      );
    };
    return { geometry, material };
  }, [THREE_Module, smokeParticleTexture, fireParticleTexture, getParticleStartPosition]);

  const debouncedUpdateParticles = useCallback(
    debounce(() => {
      if (!mountRef.current || !isThreeLoaded || !THREE_Module || !smokeParticleTexture || !fireParticleTexture || !sceneRef.current) return;
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
          const { geometry, material } = initParticles(count, isFire, baseColor, accentColor, speed, spread, opacity, sourceType, blendMode);
          if (geometry && material) {
            particlesRef.current = new THREE_Module.Points(geometry, material);
            scene.add(particlesRef.current);
          }
        }
      };
      updateOrCreateParticles(smokeParticlesRef, isSmokeEnabled, actualSmokeParticleCount, false, smokeBaseColor, smokeAccentColor, smokeSpeed, smokeSpread, smokeOpacity, smokeSource, smokeBlendMode);
      updateOrCreateParticles(fireParticlesRef, isFireEnabled, actualFireParticleCount, true, fireBaseColor, fireAccentColor, fireSpeed, fireSpread, fireOpacity, fireParticleSource, fireBlendMode);
    }, 200), // Reduced debounce time slightly
    [
      isThreeLoaded, THREE_Module, smokeParticleTexture, fireParticleTexture, initParticles,
      isSmokeEnabled, actualSmokeParticleCount, smokeBaseColor, smokeAccentColor, smokeSpeed, smokeSpread, smokeOpacity, smokeSource, smokeBlendMode,
      isFireEnabled, actualFireParticleCount, fireBaseColor, fireAccentColor, fireSpeed, fireSpread, fireOpacity, fireParticleSource, fireBlendMode,
      particleText
    ]
  );

   useEffect(() => {
     if (!mountRef.current || !isThreeLoaded || !THREE_Module || !smokeParticleTexture || !fireParticleTexture) return;
     const currentMountRef = mountRef.current;

     if (!sceneRef.current) sceneRef.current = new THREE_Module.Scene();
     if (!cameraRef.current) {
       cameraRef.current = new THREE_Module.PerspectiveCamera(75, currentMountRef.clientWidth / currentMountRef.clientHeight, 0.1, 1000);
       cameraRef.current.position.z = 5;
     }
     if (!rendererRef.current) {
       rendererRef.current = new THREE_Module.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
       rendererRef.current.setSize(currentMountRef.clientWidth, currentMountRef.clientHeight);
       rendererRef.current.setPixelRatio(typeof window !== 'undefined' ? window.devicePixelRatio : 1);
       currentMountRef.appendChild(rendererRef.current.domElement);
       if (onCanvasReady) onCanvasReady(rendererRef.current.domElement);
     }
     rendererRef.current.setClearColor(new THREE_Module.Color(backgroundColor));
     debouncedUpdateParticles();

     const clock = new THREE_Module.Clock();
     let time = 0;

     const animate = () => {
       if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !THREE_Module) {
         if(animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
         return;
       }
       animationFrameIdRef.current = requestAnimationFrame(animate);
       const delta = clock.getDelta();
       const safeDelta = Math.min(delta, 0.033); // Clamp delta to prevent large jumps
       if (safeDelta <= 0) return;
       time += safeDelta;

       if (isPlaying) {
         const currentWindEffectX = (isNaN(windDirectionX) ? 0 : windDirectionX) * (isNaN(windStrength) ? 0 : windStrength) * safeDelta * 60;
         const timeFactorSmoke = time * 0.5;
         const timeFactorFire = time * 1.5;
         const currentSmokeBaseC = new THREE_Module.Color(smokeBaseColor);
         const currentSmokeAccentC = new THREE_Module.Color(smokeAccentColor);
         const finalSmokeColor = new THREE_Module.Color();
         const currentFireBaseC = new THREE_Module.Color(fireBaseColor);
         const currentFireAccentC = new THREE_Module.Color(fireAccentColor);
         const finalFireColor = new THREE_Module.Color();

         if (smokeParticlesRef.current && isSmokeEnabled && actualSmokeParticleCount > 0) {
           const geom = smokeParticlesRef.current.geometry as THREE.BufferGeometry;
           const positions = geom.attributes.position as THREE.BufferAttribute;
           const velocities = geom.attributes.velocity as THREE.BufferAttribute;
           const alphas = geom.attributes.alpha as THREE.BufferAttribute;
           const particleSizesAttr = geom.attributes.particleSize as THREE.BufferAttribute;
           const lives = geom.attributes.life as THREE.BufferAttribute;
           const colorsAttr = geom.attributes.color as THREE.BufferAttribute;
           const turbulenceOffsets = geom.attributes.turbulenceOffset as THREE.BufferAttribute;

           const safeSmokeDissipation = isNaN(smokeDissipation ?? 0) ? 0.2 : (smokeDissipation ?? 0);
           const baseLifespan = BASE_SMOKE_LIFESPAN * (1.0 - safeSmokeDissipation * 0.8);
           const lifeDecreaseFactor = safeDelta * 15 * (1 + safeSmokeDissipation * 2);
           const safeSmokeBuoyancy = isNaN(smokeBuoyancy ?? 0) ? 0.005 : (smokeBuoyancy ?? 0);
           const safeSmokeTurbulence = isNaN(smokeTurbulence) ? 1.0 : smokeTurbulence;
           const noiseScale = 0.5;
           const turbulenceStrength = safeSmokeTurbulence * 0.015 * (1.0 + (isNaN(smokeSpread) ? 1.0 : smokeSpread) * 0.1);

           for (let i = 0; i < positions.count; i++) {
             const currentLife = lives.getX(i) - lifeDecreaseFactor;
             lives.setX(i, currentLife);
             const i3 = i * 3;

             if (currentLife <= 0) {
               const startPos = getParticleStartPosition(false, smokeSource, smokeSpread);
               let velX = (Math.random() - 0.5) * 0.025 * smokeSpread;
               let velY = smokeSpeed * (0.5 + Math.random() * 0.7); // Adjusted initial Y velocity
               let velZ = (Math.random() - 0.5) * 0.025 * smokeSpread;
               if (isNaN(startPos.x) || isNaN(startPos.y) || isNaN(startPos.z) || isNaN(velX) || isNaN(velY) || isNaN(velZ)) {
                 lives.setX(i, 1); continue;
               }
               positions.setXYZ(i, startPos.x, startPos.y, startPos.z);
               velocities.setXYZ(i, velX, velY, velZ);
               lives.setX(i, baseLifespan * (0.7 + Math.random() * 0.6));
               finalSmokeColor.copy(currentSmokeBaseC).lerp(currentSmokeAccentC, Math.random() * 0.3);
               colorsAttr.setXYZ(i, finalSmokeColor.r, finalSmokeColor.g, finalSmokeColor.b);
               alphas.setX(i, smokeOpacity * (0.1 + Math.random() * 0.2)); // Adjusted initial alpha
               particleSizesAttr.setX(i, (0.6 + Math.random() * 0.6) * (smokeSpread / 1.5));
             } else {
               const approxOriginalLifespan = baseLifespan * (0.7 + 0.3);
               const lifeRatio = Math.max(0, Math.min(1, currentLife / Math.max(0.01, approxOriginalLifespan)));
               const offset = turbulenceOffsets.getX(i3); // Using X for all, assuming similar random range
               const pX = positions.getX(i) * noiseScale + offset;
               const pY = positions.getY(i) * noiseScale + offset;
               const pZ = positions.getZ(i) * noiseScale + offset;
               const turbX = Math.sin(pY + timeFactorSmoke) * Math.cos(pZ + timeFactorSmoke) * turbulenceStrength;
               const turbY = Math.sin(pX + timeFactorSmoke) * Math.cos(pZ + timeFactorSmoke) * turbulenceStrength * 0.5;
               const turbZ = Math.sin(pX + timeFactorSmoke) * Math.cos(pY + timeFactorSmoke) * turbulenceStrength;
               const buoyancyEffectY = safeSmokeBuoyancy * safeDelta * 60 * (1.2 + lifeRatio * 0.8); // Adjusted buoyancy effect

               let newX = positions.getX(i) + velocities.getX(i) * safeDelta * 60 + turbX + currentWindEffectX;
               let newY = positions.getY(i) + velocities.getY(i) * safeDelta * 60 + turbY + buoyancyEffectY;
               let newZ = positions.getZ(i) + velocities.getZ(i) * safeDelta * 60 + turbZ;
               if (!isNaN(newX) && !isNaN(newY) && !isNaN(newZ)) {
                 positions.setXYZ(i, newX, newY, newZ);
               }

               const fadeInEnd = 0.85; const fadeOutStart = 0.35;
               let alphaMod = 1.0;
               if (lifeRatio > fadeInEnd) alphaMod = (1.0 - lifeRatio) / (1.0 - fadeInEnd);
               else if (lifeRatio < fadeOutStart) alphaMod = lifeRatio / Math.max(0.01, fadeOutStart);
               
               const targetAlphaBase = smokeOpacity * 0.65; // Increased base for peak alpha
               const targetAlpha = targetAlphaBase * THREE_Module.MathUtils.smootherstep(alphaMod, 0, 1);
               alphas.setX(i, Math.max(0, Math.min(smokeOpacity, targetAlpha))); // Clamp to max smokeOpacity

               const sizeGrowthRate = 0.3 + (smokeSpread * 0.15); // Increased growth rate
               const currentPSize = particleSizesAttr.getX(i);
               const newPSize = currentPSize + sizeGrowthRate * safeDelta * (1.0 - lifeRatio * 0.3); // Grow faster when young
               particleSizesAttr.setX(i, Math.max(0.01, Math.min(isNaN(newPSize) ? currentPSize : newPSize, smokeSpread * 5.0)));
             }
           }
           positions.needsUpdate = true; velocities.needsUpdate = true; alphas.needsUpdate = true;
           particleSizesAttr.needsUpdate = true; lives.needsUpdate = true; colorsAttr.needsUpdate = true;
         }

         if (fireParticlesRef.current && isFireEnabled && actualFireParticleCount > 0) {
            const geom = fireParticlesRef.current.geometry as THREE.BufferGeometry;
            const positions = geom.attributes.position as THREE.BufferAttribute;
            const velocities = geom.attributes.velocity as THREE.BufferAttribute;
            const alphas = geom.attributes.alpha as THREE.BufferAttribute;
            const particleSizesAttr = geom.attributes.particleSize as THREE.BufferAttribute;
            const lives = geom.attributes.life as THREE.BufferAttribute;
            const colorsAttr = geom.attributes.color as THREE.BufferAttribute;
            const turbulenceOffsets = geom.attributes.turbulenceOffset as THREE.BufferAttribute;
            const fullFireLifespan = BASE_FIRE_LIFESPAN * (0.7 + 0.3);
            const lifeDecreaseFactor = safeDelta * 20;
            const safeFireTurbulence = isNaN(fireTurbulence) ? 1.0 : fireTurbulence;
            const noiseScale = 0.8;
            const turbulenceStrength = safeFireTurbulence * 0.025 * (1.0 + (isNaN(fireSpread) ? 1.0 : fireSpread) * 0.15);

            for (let i = 0; i < positions.count; i++) {
                const currentLife = lives.getX(i) - lifeDecreaseFactor;
                lives.setX(i, currentLife);
                const i3 = i * 3;
                if (currentLife <= 0) {
                    const startPos = getParticleStartPosition(true, fireParticleSource, fireSpread);
                    let velX = (Math.random() - 0.5) * 0.02 * fireSpread;
                    let velY = (Math.random() * fireSpeed * 1.8) + fireSpeed * 1.5;
                    let velZ = (Math.random() - 0.5) * 0.02 * fireSpread;
                    if (isNaN(startPos.x) || isNaN(startPos.y) || isNaN(startPos.z) || isNaN(velX) || isNaN(velY) || isNaN(velZ)) {
                        lives.setX(i, 1); continue;
                    }
                    positions.setXYZ(i, startPos.x, startPos.y, startPos.z);
                    velocities.setXYZ(i, velX, velY, velZ);
                    lives.setX(i, fullFireLifespan * (0.7 + Math.random() * 0.6));
                    finalFireColor.copy(currentFireBaseC).lerp(currentFireAccentC, Math.random() * 0.7);
                    const fireHsl = { h: 0, s: 0, l: 0 };
                    finalFireColor.getHSL(fireHsl);
                    if (!isNaN(fireHsl.h) && !isNaN(fireHsl.s) && !isNaN(fireHsl.l)) {
                        finalFireColor.setHSL(fireHsl.h + (Math.random() -0.5) * 0.05, Math.max(0.85, fireHsl.s - Math.random() * 0.1), Math.min(0.95, fireHsl.l + Math.random() * 0.1));
                    }
                    colorsAttr.setXYZ(i, finalFireColor.r, finalFireColor.g, finalFireColor.b);
                    alphas.setX(i, fireOpacity * (0.8 + Math.random() * 0.2));
                    particleSizesAttr.setX(i, (0.6 + Math.random() * 0.6) * (fireSpread / 1.1));
                } else {
                    const lifeRatio = Math.max(0, Math.min(1, currentLife / Math.max(0.01, fullFireLifespan)));
                    const offset = turbulenceOffsets.getX(i3); // Using X for all
                    const pX = positions.getX(i) * noiseScale + offset;
                    const pY = positions.getY(i) * noiseScale + offset;
                    const pZ = positions.getZ(i) * noiseScale + offset;
                    const turbX = Math.sin(pY + timeFactorFire * 1.2) * Math.cos(pZ + timeFactorFire * 0.8) * turbulenceStrength;
                    const turbY = Math.sin(pX + timeFactorFire * 1.1) * Math.cos(pZ + timeFactorFire * 0.9) * turbulenceStrength * 1.5;
                    const turbZ = Math.sin(pX + timeFactorFire * 0.9) * Math.cos(pY + timeFactorFire * 1.3) * turbulenceStrength;
                    let newX = positions.getX(i) + velocities.getX(i) * safeDelta * 60 + turbX + currentWindEffectX * 0.5;
                    let newY = positions.getY(i) + velocities.getY(i) * safeDelta * 60 + turbY;
                    let newZ = positions.getZ(i) + velocities.getZ(i) * safeDelta * 60 + turbZ;
                    if (!isNaN(newX) && !isNaN(newY) && !isNaN(newZ)) {
                         positions.setXYZ(i, newX, newY, newZ);
                    }
                    const targetAlpha = fireOpacity * (0.8 + 0.1) * Math.pow(lifeRatio, 1.5);
                    alphas.setX(i, Math.max(0, Math.min(fireOpacity * 0.95, targetAlpha)));
                    const sizeFactor = 0.98 + lifeRatio * 0.05 + 0.01;
                    const currentPSize = particleSizesAttr.getX(i);
                    const newPSize = currentPSize * sizeFactor;
                    particleSizesAttr.setX(i, Math.max(0.01, isNaN(newPSize) ? currentPSize : newPSize));
                 }
            }
            positions.needsUpdate = true; velocities.needsUpdate = true; alphas.needsUpdate = true;
            particleSizesAttr.needsUpdate = true; lives.needsUpdate = true; colorsAttr.needsUpdate = true;
         }
       }
       rendererRef.current.render(sceneRef.current, cameraRef.current);
     };
     animate();

     const handleResize = debounce(() => {
       if (mountRef.current && rendererRef.current && cameraRef.current && THREE_Module) {
         const width = mountRef.current.clientWidth;
         const height = mountRef.current.clientHeight;
         if (width > 0 && height > 0) {
             rendererRef.current.setSize(width, height);
             cameraRef.current.aspect = width / height;
             cameraRef.current.updateProjectionMatrix();
         }
       }
     }, 250);
     window.addEventListener('resize', handleResize);
     return () => {
       if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
       window.removeEventListener('resize', handleResize);
     };
   }, [
     isThreeLoaded, THREE_Module, onCanvasReady, initParticles, getParticleStartPosition,
     debouncedUpdateParticles,
     backgroundColor, isPlaying,
     windDirectionX, windStrength, 
     smokeBaseColor, smokeAccentColor, smokeOpacity, smokeTurbulence, smokeDissipation, smokeBuoyancy, smokeSpeed, smokeSpread, smokeSource, 
     fireBaseColor, fireAccentColor, fireOpacity, fireTurbulence, fireSpeed, fireSpread, fireParticleSource, 
     isSmokeEnabled, isFireEnabled, actualSmokeParticleCount, actualFireParticleCount
   ]);

   useEffect(() => {
     if (smokeParticlesRef.current?.material && THREE_Module && isThreeLoaded) {
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
     if (fireParticlesRef.current?.material && THREE_Module && isThreeLoaded) {
       const material = fireParticlesRef.current.material as THREE.PointsMaterial;
       let newBlendingMode = THREE_Module.AdditiveBlending;
       if (fireBlendMode === "Subtractive") {
           material.blending = THREE_Module.CustomBlending;
           material.blendEquation = THREE_Module.ReverseSubtractEquation;
           material.blendSrc = THREE_Module.SrcAlphaFactor;
           material.blendDst = THREE_Module.OneFactor;
       } else {
           switch(fireBlendMode) {
             case "Additive": newBlendingMode = THREE_Module.AdditiveBlending; break;
             case "Multiply": newBlendingMode = THREE_Module.MultiplyBlending; break;
             case "Normal": newBlendingMode = THREE_Module.NormalBlending; break;
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

   return <div ref={mountRef} className="w-full h-full" role="img" aria-label="Smoke and fire simulation canvas" data-ai-hint="smoke fire particles" />;
 };

 export default SmokeCanvas;
 
