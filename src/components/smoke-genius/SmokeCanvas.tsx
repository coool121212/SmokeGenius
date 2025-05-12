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

const BASE_FIRE_LIFESPAN = 60;
const BASE_SMOKE_LIFESPAN = 200;
const BOTTOM_SOURCE_X_SPREAD = 12.0;

const TEXT_CANVAS_WIDTH = 512;
const TEXT_CANVAS_HEIGHT = 128;
const TEXT_FONT_SIZE = 80;
const TEXT_FONT = `bold ${TEXT_FONT_SIZE}px Arial, sans-serif`;
const TEXT_SAMPLE_DENSITY = 0.3;
const TEXT_SHAPE_SCALE = 0.02;

type EffectiveParticleSource = ParticleSource | "Text";

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
    const step = 3;
    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
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
    const size = 256; // Increase texture size for more detail
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) return null;

    const gradient = context.createRadialGradient(
        size / 2, size / 2, 0,
        size / 2, size / 2, size / 2
    );
    // Soft, wispy gradient
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)'); // More opaque center
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)'); // Fade out completely

    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    // Add subtle noise/texture
    context.fillStyle = 'rgba(0, 0, 0, 0.03)'; // Very subtle dark specks
    for (let i = 0; i < 1000; i++) { // Add more noise points
        const x = Math.random() * size;
        const y = Math.random() * size;
        const radius = Math.random() * 1.5; // Smaller noise specks
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
    }

    return new THREE_Module.CanvasTexture(canvas);
  }, [isThreeLoaded]);

  const fireParticleTexture = useMemo(() => {
    if (!THREE_Module || !isThreeLoaded) return null;
    const canvas = document.createElement('canvas');
    const size = 128; // Increased size
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) return null;

    const gradient = context.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    // Sharper gradient for fire core, softer edges
    gradient.addColorStop(0, 'rgba(255, 255, 220, 1.0)'); // Bright core
    gradient.addColorStop(0.1, 'rgba(255, 220, 150, 0.9)');
    gradient.addColorStop(0.3, 'rgba(255, 150, 50, 0.7)');
    gradient.addColorStop(0.6, 'rgba(255, 50, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(200, 0, 0, 0)'); // Fade out

    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

     // Optional: Add subtle streaking effect for fire
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
    const yBaseline = -cameraPositionZ * 0.45;
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
        } else { // Fallback if text points are not ready or text is empty
          x = (Math.random() - 0.5) * safeSpread * (isFire ? 1.0 : 1.5);
          y = yBaseline + (isFire ? 0.0 : 0.5) + (Math.random() - 0.5) * 0.2;
          z = (Math.random() - 0.5) * safeSpread * (isFire ? 1.0 : 1.5);
        }
        break;
      case "Bottom":
        x = (Math.random() - 0.5) * BOTTOM_SOURCE_X_SPREAD;
        y = yBaseline + (isFire ? Math.random() * 0.1 : Math.random() * 0.3);
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
        y = yBaseline + (isFire ? 0.0 : 0.5) + (Math.random() - 0.5) * 0.2;
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
    const turbulenceOffsets = new Float32Array(safeCount * 3);
    const rotationSpeeds = new Float32Array(safeCount); // Add rotation speed

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
        alphas[i] = safeOpacity * (0.4 + Math.random() * 0.3);
        particleSize = (0.8 + Math.random() * 0.8) * safeSpread;
        lifespan = BASE_SMOKE_LIFESPAN * (0.6 + Math.random() * 0.7);
      }
      particleSizes[i] = isNaN(particleSize) ? 0.1 : Math.max(0.02, particleSize);
      lives[i] = isNaN(lifespan) ? (isFireSystem ? BASE_FIRE_LIFESPAN : BASE_SMOKE_LIFESPAN) : lifespan;

      turbulenceOffsets[i3] = Math.random() * 2 * Math.PI;
      turbulenceOffsets[i3 + 1] = Math.random() * 2 * Math.PI;
      turbulenceOffsets[i3 + 2] = Math.random() * 100;

      rotationSpeeds[i] = (Math.random() - 0.5) * 0.05; // Random initial rotation speed
    }

    geometry.setAttribute('position', new THREE_Module.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE_Module.BufferAttribute(velocities, 3));
    geometry.setAttribute('color', new THREE_Module.BufferAttribute(particleColors, 3));
    geometry.setAttribute('alpha', new THREE_Module.BufferAttribute(alphas, 1));
    geometry.setAttribute('particleSize', new THREE_Module.BufferAttribute(particleSizes, 1));
    geometry.setAttribute('life', new THREE_Module.BufferAttribute(lives, 1));
    geometry.setAttribute('turbulenceOffset', new THREE_Module.BufferAttribute(turbulenceOffsets, 3));
    geometry.setAttribute('rotationSpeed', new THREE_Module.BufferAttribute(rotationSpeeds, 1)); // Add rotation speed attribute


    const material = new THREE_Module.PointsMaterial({
      map: isFireSystem ? fireParticleTexture : smokeParticleTexture,
      depthWrite: false, // Important for smoke transparency
      transparent: true,
      vertexColors: true,
      sizeAttenuation: true,
      // size: 1.0 // Adjust base size if needed, or rely on particleSize attribute
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
                 material.blendDst = THREE_Module.OneFactor; // Or OneMinusSrcColorFactor for different effect
                 material.blendSrcAlpha = THREE_Module.ZeroFactor; // Or SrcAlphaFactor
                 material.blendDstAlpha = THREE_Module.OneFactor; // Or OneMinusSrcAlphaFactor
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

        // Add custom attributes and varyings
        vertexShader = `
            attribute float particleSize;
            attribute float alpha;
            attribute vec3 turbulenceOffset;
            attribute float rotationSpeed; // Add rotation speed attribute
            varying float vAlpha;
            varying vec3 vTurbulenceOffsetData;
            varying float vRotation; // Varying for rotation angle

            uniform float time; // Pass time uniform for rotation
            ${vertexShader}
        `;

        // Modify begin_vertex
        vertexShader = vertexShader.replace(
            `#include <begin_vertex>`,
            `#include <begin_vertex>
             transformed = vec3( position );
             vAlpha = alpha;
             vTurbulenceOffsetData = turbulenceOffset;
             vRotation = time * rotationSpeed; // Calculate rotation based on time and speed
             `
        );

        // Modify point size calculation to use particleSize attribute directly
        // and potentially apply perspective attenuation more aggressively
        vertexShader = vertexShader.replace(
          `#include <project_vertex>`,
          `
          vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );
          gl_Position = projectionMatrix * mvPosition;
          #ifdef USE_SIZEATTENUATION
            float pointScale = isPerspectiveMatrix( projectionMatrix ) ? clamp(100.0 / -mvPosition.z, 0.1, 5.0) : 1.0; // Perspective scaling
            gl_PointSize = max(1.0, particleSize * pointScale * ${pixelRatio.toFixed(1)} * 1.3); // Base size * perspective * pixelRatio * extra factor
          #else
            gl_PointSize = max(1.0, particleSize * ${pixelRatio.toFixed(1)} * 1.3);
          #endif
          `
        );

        // Remove the default gl_PointSize logic as we handle it above
        vertexShader = vertexShader.replace(
            `#include <fog_vertex>`, // Insert before fog
            `
            #include <logdepthbuf_vertex> // Include logdepthbuf logic
            #include <clipping_planes_vertex> // Include clipping planes logic
            // gl_PointSize logic is now handled within the project_vertex replacement above
            #include <fog_vertex>
            `
        );


        shader.vertexShader = vertexShader;

        // Modify fragment shader for alpha and color, and add rotation
        shader.fragmentShader = `
            varying float vAlpha;
            varying float vRotation; // Receive rotation angle
            ${shader.fragmentShader}
        `
        .replace(
            `#include <color_fragment>`,
            `#include <color_fragment>
             diffuseColor.a *= vAlpha; // Apply vertex alpha
             ` // Removed diffuseColor = vec4( vColor, vAlpha ) as vertexColors is used
        )
        .replace(
            `#include <map_particle_fragment>`,
            `
             #ifdef USE_MAP
                // Rotate point coordinates for texture lookup
                vec2 center = vec2(0.5, 0.5);
                float cos_rot = cos(vRotation);
                float sin_rot = sin(vRotation);
                vec2 rotated_uv = mat2(cos_rot, -sin_rot, sin_rot, cos_rot) * (gl_PointCoord - center) + center;

                vec4 mapTexel = texture2D( map, rotated_uv );

                // Use map texel alpha as the base alpha, modulated by vertex alpha
                 diffuseColor.a *= mapTexel.a;

                // Multiply diffuse color by map color only if vertex colors aren't used,
                // otherwise, the map primarily controls alpha/shape.
                // If vertexColors is true, vColor already has the particle color.
                // If you want to tint the texture with vertex color, uncomment the next line.
                 // diffuseColor.rgb *= mapTexel.rgb;

             #endif
             `
        );


        // Add time uniform
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

       // Update time uniform for shaders that use it (like rotation)
        if (smokeParticlesRef.current && smokeParticlesRef.current.material && (smokeParticlesRef.current.material as any).uniforms?.time) {
          (smokeParticlesRef.current.material as any).uniforms.time.value = time;
        }
        if (fireParticlesRef.current && fireParticlesRef.current.material && (fireParticlesRef.current.material as any).uniforms?.time) {
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
                const sizeArray = particleSizesAttr.array as Float32Array; // This is the initial size
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

                for (let i = 0; i < positions.count; i++) {
                    const i3 = i * 3;
                    const currentLife = lifeArray[i] - lifeDecreaseFactor;
                    lifeArray[i] = currentLife;

                    if (currentLife <= 0 || posArray[i3 + 1] > cameraRef.current.position.z * 0.7) { // Reset if too high or life ended
                        // Particle Reset
                        const startPos = getParticleStartPosition(false, effectiveSmokeSource, safeSmokeSpread, camZ);
                        posArray[i3] = startPos.x;
                        posArray[i3 + 1] = startPos.y;
                        posArray[i3 + 2] = startPos.z;

                        const safeSmokeSpeed = isNaN(smokeSpeed) ? 0.01 : smokeSpeed;
                        velArray[i3] = (Math.random() - 0.5) * 0.015 * safeSmokeSpread;
                        velArray[i3 + 1] = (Math.random() * 0.5 + 0.8) * safeSmokeSpeed;
                        velArray[i3 + 2] = (Math.random() - 0.5) * 0.015 * safeSmokeSpread;

                        lifeArray[i] = baseLifespan * (0.7 + Math.random() * 0.6);

                        finalSmokeColor.copy(currentSmokeBaseC).lerp(currentSmokeAccentC, Math.random());
                        colorArray[i3] = finalSmokeColor.r;
                        colorArray[i3 + 1] = finalSmokeColor.g;
                        colorArray[i3 + 2] = finalSmokeColor.b;

                        alphaArray[i] = safeSmokeOpacity * (0.4 + Math.random() * 0.3);
                        sizeArray[i] = (0.8 + Math.random() * 0.8) * safeSmokeSpread;

                    } else {
                        // Particle Update
                        const lifeRatio = Math.max(0, Math.min(1, currentLife / Math.max(0.01, baseLifespan)));

                        const tx = turbOffsetArray[i3];
                        const ty = turbOffsetArray[i3 + 1];
                        const tz = turbOffsetArray[i3 + 2];
                        const noiseTime = timeFactorSmoke + tz * 0.01;

                        // More complex turbulence calculation (simplex noise would be better if available)
                        const turbX = Math.sin(posArray[i3 + 1] * turbulenceScale * 0.5 + noiseTime + tx + Math.cos(posArray[i3] * turbulenceScale * 0.3 + noiseTime)) * turbulenceStrength;
                        const turbY = Math.cos(posArray[i3] * turbulenceScale * 0.5 + noiseTime + ty + Math.sin(posArray[i3+1] * turbulenceScale * 0.2 + noiseTime)) * turbulenceStrength;
                        const turbZ = Math.sin(posArray[i3 + 2] * turbulenceScale + noiseTime + tx + ty) * turbulenceStrength * 0.5; // Less Z turbulence

                        velArray[i3 + 1] += safeSmokeBuoyancy * safeDelta * 60; // Apply buoyancy
                        velArray[i3 + 1] *= 0.98; // Add slight air resistance / damping vertically
                        velArray[i3] *= 0.97; // Damping horizontally
                        velArray[i3 + 2] *= 0.97; // Damping depth

                        posArray[i3] += (velArray[i3] + turbX + currentWindEffectX) * safeDelta * 60;
                        posArray[i3 + 1] += (velArray[i3 + 1] + turbY) * safeDelta * 60;
                        posArray[i3 + 2] += (velArray[i3 + 2] + turbZ) * safeDelta * 60;


                        const fadeInEnd = 0.9;
                        const fadeOutStart = 0.3;
                        let alphaMultiplier = 1.0;
                        if (lifeRatio > fadeInEnd) {
                            alphaMultiplier = THREE_Module.MathUtils.smoothstep(lifeRatio, 1.0, fadeInEnd);
                        } else if (lifeRatio < fadeOutStart) {
                            alphaMultiplier = THREE_Module.MathUtils.smoothstep(lifeRatio, 0.0, fadeOutStart);
                        }
                        // Ensure baseAlpha calculation uses the stored initial alpha or re-calculates consistently
                        // const baseAlpha = initialAlphas[i]; // If you stored initial alphas
                        const baseAlpha = safeSmokeOpacity * (0.4 + (turbOffsetArray[i3+2] / 100) * 0.3); // Use turbulence offset for consistent random base
                        const calculatedAlpha = baseAlpha * alphaMultiplier;
                        alphaArray[i] = isNaN(calculatedAlpha) ? 0 : Math.max(0, Math.min(safeSmokeOpacity, calculatedAlpha));


                         // Increase size over lifetime slightly
                        const sizeFactor = 1.0 + (0.8 * Math.sin(lifeRatio * Math.PI)); // More pronounced size change
                         // const baseSize = initialSizes[i]; // If you stored initial sizes
                         const baseSize = (0.8 + (turbOffsetArray[i3+1] / (2*Math.PI)) * 0.8) * safeSmokeSpread; // Use turbulence offset for consistent random base
                        const calculatedSize = baseSize * sizeFactor; // This is the current frame's target size
                        sizeArray[i] = isNaN(calculatedSize) ? 0.02 : Math.max(0.02, calculatedSize); // Update the size attribute for the shader

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

                 const lifeDecreaseFactor = safeDelta * 15;
                 const safeFireTurbulence = isNaN(fireTurbulence) ? 1.0 : fireTurbulence;
                 const fireTurbulenceStrength = safeFireTurbulence * 0.015;
                 const fireTurbulenceScale = 0.8;
                 const safeFireOpacity = isNaN(fireOpacity) ? 0.7 : fireOpacity;
                 const safeFireSpread = isNaN(fireSpread) ? 1.5 : fireSpread;
                 const baseLifespan = BASE_FIRE_LIFESPAN;

                 const camZ = cameraRef.current.position.z;

                 for (let i = 0; i < positions.count; i++) {
                    const i3 = i * 3;
                    const currentLife = lifeArray[i] - lifeDecreaseFactor;
                    lifeArray[i] = currentLife;

                    if (currentLife <= 0 || posArray[i3 + 1] > cameraRef.current.position.z * 0.8) { // Reset if too high or life ended
                        // Fire Particle Reset
                        const startPos = getParticleStartPosition(true, effectiveFireSource, safeFireSpread, camZ);
                        posArray[i3] = startPos.x;
                        posArray[i3 + 1] = startPos.y;
                        posArray[i3 + 2] = startPos.z;

                        const safeFireSpeed = isNaN(fireSpeed) ? 0.03 : fireSpeed;
                        velArray[i3] = (Math.random() - 0.5) * 0.03 * safeFireSpread;
                        velArray[i3 + 1] = (Math.random() * 0.8 + 0.6) * safeFireSpeed * 2.0;
                        velArray[i3 + 2] = (Math.random() - 0.5) * 0.03 * safeFireSpread;

                        lifeArray[i] = baseLifespan * (0.5 + Math.random() * 0.8);

                        finalFireColor.copy(currentFireBaseC).lerp(currentFireAccentC, Math.random());
                        colorArray[i3] = finalFireColor.r;
                        colorArray[i3 + 1] = finalFireColor.g;
                        colorArray[i3 + 2] = finalFireColor.b;

                        alphaArray[i] = safeFireOpacity * (0.7 + Math.random() * 0.3);
                        sizeArray[i] = (0.5 + Math.random() * 0.5) * safeFireSpread * 1.2;

                    } else {
                        // Fire Particle Update
                        const lifeRatio = Math.max(0, Math.min(1, currentLife / Math.max(0.01, baseLifespan)));

                        const tx = turbOffsetArray[i3];
                        const ty = turbOffsetArray[i3 + 1];
                        const tz = turbOffsetArray[i3 + 2];
                        const noiseTime = timeFactorFire + tz * 0.01;

                        // Slightly different turbulence for fire (more upward flickering)
                        const turbX = Math.sin(posArray[i3 + 1] * fireTurbulenceScale + noiseTime + tx) * fireTurbulenceStrength * 1.2;
                        const turbY = Math.cos(posArray[i3] * fireTurbulenceScale + noiseTime + ty) * fireTurbulenceStrength * 2.0; // More vertical turbulence
                        const turbZ = Math.sin(posArray[i3 + 2] * fireTurbulenceScale + noiseTime + tx + ty) * fireTurbulenceStrength * 0.8;

                        velArray[i3 + 1] *= 0.99; // Less vertical damping for fire
                        velArray[i3] *= 0.96; // More horizontal damping
                        velArray[i3 + 2] *= 0.96;

                        posArray[i3] += (velArray[i3] + turbX + currentWindEffectX * 0.7) * safeDelta * 60;
                        posArray[i3 + 1] += (velArray[i3 + 1] + turbY) * safeDelta * 60;
                        posArray[i3 + 2] += (velArray[i3 + 2] + turbZ) * safeDelta * 60;

                        const fadeOutPower = 1.8;
                        //const baseAlpha = initialAlphas[i]; // If you stored initial alphas
                        const baseAlpha = safeFireOpacity * (0.7 + (turbOffsetArray[i3+2] / 100) * 0.3); // Use turbulence offset for consistent random base
                        const calculatedAlpha = baseAlpha * Math.pow(lifeRatio, fadeOutPower);
                         alphaArray[i] = isNaN(calculatedAlpha) ? 0 : Math.max(0, Math.min(safeFireOpacity, calculatedAlpha));


                        // Fire particles tend to shrink as they rise/cool
                        const sizeFactor = Math.max(0.1, lifeRatio * 0.9 + 0.1);
                         //const baseSize = initialSizes[i]; // If you stored initial sizes
                         const baseSize = (0.5 + (turbOffsetArray[i3+1] / (2*Math.PI)) * 0.5) * safeFireSpread * 1.2; // Use turbulence offset
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
           // Optionally stop the animation loop on render error
           // if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
           // animationFrameIdRef.current = null;
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

     // --- Cleanup ---
     return () => {
       if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
       animationFrameIdRef.current = null;
       window.removeEventListener('resize', handleResize);
       // Dispose geometries and materials on unmount? Maybe not necessary if debouncedUpdate handles it.
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
     getParticleStartPosition // Include any other dependencies used in animate()
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
               needsUpdate = true;
           }
        } else {
            let newBlendingMode = THREE_Module.AdditiveBlending;
            switch(fireBlendMode) {
                case "Additive": newBlendingMode = THREE_Module.AdditiveBlending; break;
                case "Multiply": newBlendingMode = THREE_Module.MultiplyBlending; break;
                case "Normal": newBlendingMode = THREE_Module.NormalBlending; break;
                default: newBlendingMode = THREE_Module.AdditiveBlending; break; // Default fire to additive
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
