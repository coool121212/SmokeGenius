"use client";

import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import type * as THREE from 'three';
import { debounce } from '@/lib/utils'; 
import type { BlendMode, ParticleSource } from './types';

let THREE_Module: typeof THREE | null = null;

interface SmokeCanvasProps {
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

  backgroundColor?: string;
  isPlaying?: boolean;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

const MAX_SMOKE_PARTICLES = 8000;
const MAX_FIRE_PARTICLES = 5000;

const BASE_FIRE_LIFESPAN = 70; 
const BASE_SMOKE_LIFESPAN = 220; // Increased for more lingering smoke

const SmokeCanvas: React.FC<SmokeCanvasProps> = ({
  isSmokeEnabled = true,
  smokeDensity = 2000,
  smokeBaseColor = '#F5F5F5',
  smokeAccentColor = '#DCDCDC',
  smokeSpeed = 0.02,
  smokeSpread = 2.5, 
  smokeBlendMode = "Normal",
  smokeSource = "Center",
  smokeOpacity = 0.7,
  smokeTurbulence = 1,
  
  isFireEnabled = true,
  fireBaseColor = '#FFA500',
  fireAccentColor = '#FFD700',
  fireDensity = 1000,
  fireSpeed = 0.03,
  fireSpread = 1.5, 
  fireParticleSource = "Bottom",
  fireBlendMode = "Additive",
  fireOpacity = 0.8,
  fireTurbulence = 1.2,

  backgroundColor = '#000000',
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
    if (!mountRef.current || !isThreeLoaded || (smokeSource !== "Mouse" && fireParticleSource !== "Mouse")) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!mountRef.current || !cameraRef.current || !THREE_Module) return;
      const canvasBounds = mountRef.current.getBoundingClientRect();
      
      const mouseXNDC = ((event.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
      
      const vec = new THREE_Module.Vector3(mouseXNDC, 0, 0.5); 
      vec.unproject(cameraRef.current);
      const dir = vec.sub(cameraRef.current.position).normalize();
      const distance = -cameraRef.current.position.z / dir.z;
      const pos = cameraRef.current.position.clone().add(dir.multiplyScalar(distance));
      mouseSceneXRef.current = pos.x;
    };

    const currentMountRef = mountRef.current;
    currentMountRef.addEventListener('mousemove', handleMouseMove);

    return () => {
      currentMountRef.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isThreeLoaded, smokeSource, fireParticleSource, isSmokeEnabled, isFireEnabled]);


  const smokeParticleTexture = useMemo(() => {
    if (!THREE_Module || !isThreeLoaded) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256; // Increased size for more detail
    canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context) return null;

    const gradient = context.createRadialGradient(
      canvas.width / 2, canvas.height / 2, canvas.width / 10, // Smaller, denser core
      canvas.width / 2, canvas.height / 2, canvas.width / 2.2 // Softer falloff
    );
    gradient.addColorStop(0, 'rgba(255,255,255,0.85)'); 
    gradient.addColorStop(0.3, 'rgba(245,245,245,0.6)'); 
    gradient.addColorStop(0.6, 'rgba(230,230,230,0.25)'); 
    gradient.addColorStop(1, 'rgba(200,200,200,0)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Add a few smaller, fainter puffs for more texture variation
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
  }, [isThreeLoaded]);

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
    gradient.addColorStop(0, 'rgba(255, 220, 180, 0.9)'); 
    gradient.addColorStop(0.2, 'rgba(255, 180, 100, 0.7)');
    gradient.addColorStop(0.5, 'rgba(255, 120, 30, 0.4)');   
    gradient.addColorStop(1, 'rgba(200, 50, 0, 0)');  

    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    return new THREE_Module.CanvasTexture(canvas);
  }, [isThreeLoaded]);


  const initParticles = useCallback((
    count: number,
    isFireSystem: boolean, 
    baseColorVal: string,
    accentColorVal: string,
    speedVal: number,
    spreadVal: number,
    opacityVal: number,
    currentParticleSource?: ParticleSource,
    currentBlendMode?: BlendMode
  ) => {
    if (!THREE_Module) return { geometry: null, material: null };

    const geometry = new THREE_Module.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const particleColors = new Float32Array(count * 3); 
    const alphas = new Float32Array(count);
    const particleSizes = new Float32Array(count); 
    const lives = new Float32Array(count);

    const baseC = new THREE_Module.Color(baseColorVal);
    const accentC = new THREE_Module.Color(accentColorVal);
    const finalColor = new THREE_Module.Color();


    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      switch(currentParticleSource) {
        case "Bottom":
          if (isFireSystem) {
            positions[i3] = (Math.random() - 0.5) * spreadVal * 2.5; 
            positions[i3 + 1] = -2.5 + (Math.random() * 0.1);      
            positions[i3 + 2] = (Math.random() - 0.5) * spreadVal * 0.6; 
          } else { 
            positions[i3] = (Math.random() - 0.5) * spreadVal * 2.8; // Wider base for smoke
            positions[i3 + 1] = -2.8 + (Math.random() * 0.3);      
            positions[i3 + 2] = (Math.random() - 0.5) * spreadVal * 0.8; 
          }
          break;
        case "Mouse":
          const mouseSpreadFactor = isFireSystem ? 0.3 : 0.6; // Wider smoke spread from mouse
          positions[i3] = mouseSceneXRef.current + (Math.random() - 0.5) * spreadVal * mouseSpreadFactor;
          positions[i3 + 1] = (Math.random() - 0.5) * 0.5 - 2.0; 
          positions[i3 + 2] = (Math.random() - 0.5) * spreadVal * mouseSpreadFactor;
          break;
        case "Center":
        default:
          if (isFireSystem) {
            positions[i3] = (Math.random() - 0.5) * spreadVal * 1.8; 
            positions[i3 + 1] = -2.5 + (Math.random() - 0.5) * 0.2; 
            positions[i3 + 2] = (Math.random() - 0.5) * spreadVal * 1.8; 
          } else { 
            positions[i3] = (Math.random() - 0.5) * spreadVal * 2.2; // Wider smoke center
            positions[i3 + 1] = (Math.random() - 0.5) * 0.5 - 2.0; 
            positions[i3 + 2] = (Math.random() - 0.5) * spreadVal * 2.2; 
          }
          break;
      }
      
      if (isFireSystem) {
        velocities[i3] = (Math.random() - 0.5) * 0.02 * spreadVal; 
        velocities[i3 + 1] = (Math.random() * speedVal * 1.8) + speedVal * 1.5; 
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.02 * spreadVal;
        
        finalColor.copy(baseC);
        finalColor.lerp(accentC, Math.random() * 0.7); 

        const fireHsl = { h: 0, s: 0, l: 0 };
        finalColor.getHSL(fireHsl);
        finalColor.setHSL(
            fireHsl.h + (Math.random() -0.5) * 0.05, 
            Math.max(0.85, fireHsl.s - Math.random() * 0.1), 
            Math.min(0.95, fireHsl.l + Math.random() * 0.1)
        );

        particleColors[i3] = finalColor.r;
        particleColors[i3 + 1] = finalColor.g;
        particleColors[i3 + 2] = finalColor.b;

        alphas[i] = opacityVal * (0.7 + Math.random() * 0.3); 
        particleSizes[i] = (0.6 + Math.random() * 0.6) * (spreadVal / 1.1); 
        lives[i] = Math.random() * BASE_FIRE_LIFESPAN * 0.5 + BASE_FIRE_LIFESPAN * 0.5; 
      } else { // Smoke
        velocities[i3] = (Math.random() - 0.5) * 0.025 * spreadVal; // Slightly more varied initial horizontal velocity
        velocities[i3 + 1] = Math.random() * speedVal * 0.8 + speedVal * 0.2; // Slower, more buoyant rise
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.025 * spreadVal;

        finalColor.copy(baseC);
        finalColor.lerp(accentC, Math.random() * 0.3); // Less accent influence for smoke

        particleColors[i3] = finalColor.r;
        particleColors[i3 + 1] = finalColor.g;
        particleColors[i3 + 2] = finalColor.b;
        alphas[i] = opacityVal * (0.1 + Math.random() * 0.2); // Start fainter for softer appearance
        particleSizes[i] = (0.6 + Math.random() * 0.6) * (spreadVal / 1.5) ; // Start a bit smaller, will grow
        lives[i] = Math.random() * BASE_SMOKE_LIFESPAN * 0.7 + BASE_SMOKE_LIFESPAN * 0.3; // Longer average lifespan
      }
    }

    geometry.setAttribute('position', new THREE_Module.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE_Module.BufferAttribute(velocities, 3));
    geometry.setAttribute('color', new THREE_Module.BufferAttribute(particleColors, 3));
    geometry.setAttribute('alpha', new THREE_Module.BufferAttribute(alphas, 1));
    geometry.setAttribute('particleSize', new THREE_Module.BufferAttribute(particleSizes, 1)); 
    geometry.setAttribute('life', new THREE_Module.BufferAttribute(lives, 1));

    let blendingMode = THREE_Module.NormalBlending;
    if (currentBlendMode && THREE_Module) {
        switch(currentBlendMode) {
            case "Additive": blendingMode = THREE_Module.AdditiveBlending; break;
            case "Subtractive": blendingMode = THREE_Module.SubtractiveBlending; break;
            case "Multiply": blendingMode = THREE_Module.MultiplyBlending; break;
            case "Normal":
            default: blendingMode = isFireSystem ? THREE_Module.AdditiveBlending : THREE_Module.NormalBlending; break;
        }
    } else {
      blendingMode = isFireSystem ? THREE_Module.AdditiveBlending : THREE_Module.NormalBlending;
    }


    const material = new THREE_Module.PointsMaterial({
      map: isFireSystem ? fireParticleTexture : smokeParticleTexture,
      blending: blendingMode, 
      depthWrite: false,
      transparent: true,
      vertexColors: true, 
      sizeAttenuation: true,
    });
    
    material.onBeforeCompile = shader => {
        const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        shader.vertexShader = `
          attribute float particleSize; 
          attribute float alpha;
          varying float vAlpha;
          ${shader.vertexShader}
        `.replace(
          `#include <begin_vertex>`,
          `#include <begin_vertex>
           transformed = vec3( position );
           vAlpha = alpha; 
          `
        ).replace(
           `#include <project_vertex>`,
           `
            vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );
            gl_Position = projectionMatrix * mvPosition;
            gl_PointSize = particleSize * ( ${pixelRatio.toFixed(1)} * 100.0 / -mvPosition.z );
           `
        );

        shader.fragmentShader = `
          varying float vAlpha; 
          ${shader.fragmentShader}
        `.replace(
          `vec4 diffuseColor = vec4( diffuse, opacity );`,
          `vec4 diffuseColor = vec4( vColor, vAlpha * opacity );` 
        );
      };

    return { geometry, material };
  }, [THREE_Module, smokeParticleTexture, fireParticleTexture, mouseSceneXRef]);


  useEffect(() => {
    if (!mountRef.current || !isThreeLoaded || !THREE_Module || !smokeParticleTexture || !fireParticleTexture) return;

    const scene = new THREE_Module.Scene();
    sceneRef.current = scene;
    
    const camera = new THREE_Module.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    camera.position.z = 5;
    cameraRef.current = camera;

    const renderer = new THREE_Module.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(typeof window !== 'undefined' ? window.devicePixelRatio : 1);
    renderer.setClearColor(new THREE_Module.Color(backgroundColor));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    if (onCanvasReady) {
      onCanvasReady(renderer.domElement);
    }
    
    const { geometry: smokeGeo, material: smokeMat } = initParticles(
      actualSmokeParticleCount, false, smokeBaseColor, smokeAccentColor, smokeSpeed, smokeSpread, smokeOpacity, smokeSource, smokeBlendMode
    );
    if (smokeGeo && smokeMat) {
      const smokePoints = new THREE_Module.Points(smokeGeo, smokeMat);
      smokePoints.visible = isSmokeEnabled;
      scene.add(smokePoints);
      smokeParticlesRef.current = smokePoints;
    }

    const { geometry: fireGeo, material: fireMat } = initParticles(
      actualFireParticleCount, true, fireBaseColor, fireAccentColor, fireSpeed, fireSpread, fireOpacity, fireParticleSource, fireBlendMode
    );
    if (fireGeo && fireMat) {
      const firePoints = new THREE_Module.Points(fireGeo, fireMat);
      firePoints.visible = isFireEnabled;
      scene.add(firePoints);
      fireParticlesRef.current = firePoints;
    }

    const clock = new THREE_Module.Clock();

    const animate = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !THREE_Module) return;
      
      animationFrameIdRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta(); 

      if (isPlaying) {
        if (isSmokeEnabled && smokeParticlesRef.current) {
          const geom = smokeParticlesRef.current.geometry as THREE.BufferGeometry;
          const positions = geom.getAttribute('position') as THREE.BufferAttribute;
          const velocities = geom.getAttribute('velocity') as THREE.BufferAttribute;
          const alphas = geom.getAttribute('alpha') as THREE.BufferAttribute;
          const particleSizesAttr = geom.getAttribute('particleSize') as THREE.BufferAttribute;
          const lives = geom.getAttribute('life') as THREE.BufferAttribute;
          const colorsAttr = geom.getAttribute('color') as THREE.BufferAttribute;
          const currentSmokeBaseC = new THREE_Module.Color(smokeBaseColor);
          const currentSmokeAccentC = new THREE_Module.Color(smokeAccentColor);
          const finalSmokeColor = new THREE_Module.Color();
          const fullSmokeLifespan = BASE_SMOKE_LIFESPAN * 0.7 + BASE_SMOKE_LIFESPAN * 0.3;


          for (let i = 0; i < positions.count; i++) {
            lives.setX(i, lives.getX(i) - delta * 15); 

            if (lives.getX(i) <= 0) { 
              let newX, newY, newZ;
              switch(smokeSource) {
                case "Bottom":
                  newX = (Math.random() - 0.5) * smokeSpread * 2.8;
                  newY = -2.8 + (Math.random() * 0.3);
                  newZ = (Math.random() - 0.5) * smokeSpread * 0.8;
                  break;
                case "Mouse":
                  newX = mouseSceneXRef.current + (Math.random() - 0.5) * smokeSpread * 0.6;
                  newY = (Math.random() - 0.5) * 0.5 - 2.0;
                  newZ = (Math.random() - 0.5) * smokeSpread * 0.6;
                  break;
                case "Center":
                default:
                  newX = (Math.random() - 0.5) * smokeSpread * 2.2; 
                  newY = (Math.random() - 0.5) * 0.5 - 2.0;
                  newZ = (Math.random() - 0.5) * smokeSpread * 2.2; 
                  break;
              }
              positions.setXYZ(i, newX, newY, newZ);
              velocities.setXYZ(i, (Math.random() - 0.5) * 0.025 * smokeSpread, Math.random() * smokeSpeed * 0.8 + smokeSpeed * 0.2, (Math.random() - 0.5) * 0.025 * smokeSpread);
              lives.setX(i, fullSmokeLifespan);
              
              finalSmokeColor.copy(currentSmokeBaseC);
              finalSmokeColor.lerp(currentSmokeAccentC, Math.random() * 0.3);
              colorsAttr.setXYZ(i, finalSmokeColor.r, finalSmokeColor.g, finalSmokeColor.b);
              
              alphas.setX(i, smokeOpacity * (0.05 + Math.random() * 0.15)); // Start very faint
              particleSizesAttr.setX(i, (0.4 + Math.random() * 0.4) * (smokeSpread / 1.8)); // Start smaller

            } else { 
              const lifeRatio = Math.max(0, lives.getX(i) / fullSmokeLifespan); 
              
              const baseTurbulenceEffect = smokeSpread * 0.020; 
              const turbulenceStrength = smokeTurbulence; 
              const timeFactorTurbulence = (fullSmokeLifespan - lives.getX(i)) * 0.05 + positions.getY(i) * 0.08; 
              const xTurbulence = Math.sin(timeFactorTurbulence + i * 0.1) * baseTurbulenceEffect * turbulenceStrength * (1.0 - lifeRatio * 0.5); // Turbulence stronger for younger particles
              const zTurbulence = Math.cos(timeFactorTurbulence * 0.7 + i * 0.07) * baseTurbulenceEffect * turbulenceStrength * (1.0 - lifeRatio * 0.5);

              positions.setXYZ(
                i,
                positions.getX(i) + velocities.getX(i) * delta * 60 + xTurbulence, 
                positions.getY(i) + velocities.getY(i) * delta * 60,
                positions.getZ(i) + velocities.getZ(i) * delta * 60 + zTurbulence
              );
              
              // Alpha: fade in, hold, then fade out
              const fadeInEnd = 0.85; // Fraction of life remaining when fade-in is complete
              const fadeOutStart = 0.35; // Fraction of life remaining when fade-out starts
              let alphaMod = 1.0;
              if (lifeRatio > fadeInEnd) { // Fading In
                alphaMod = (1.0 - lifeRatio) / (1.0 - fadeInEnd);
              } else if (lifeRatio < fadeOutStart) { // Fading Out
                alphaMod = lifeRatio / fadeOutStart;
              }
              alphas.setX(i, smokeOpacity * (0.4 + Math.random() * 0.3) * THREE_Module.MathUtils.smootherstep(alphaMod,0,1));
              
              // Size: grow significantly over life
              const initialSize = particleSizesAttr.getX(i); // Get initial size from reset or previous frame
              const growthFactor = 1.0 + (1.0 - lifeRatio) * (2.5 + smokeSpread * 0.2); // More significant growth
              particleSizesAttr.setX(i, initialSize * (1.0 + delta * growthFactor * 0.1)); // Gradual growth
            }
          }
          positions.needsUpdate = true; velocities.needsUpdate = true; alphas.needsUpdate = true; 
          particleSizesAttr.needsUpdate = true; lives.needsUpdate = true; colorsAttr.needsUpdate = true;
        }

        if (isFireEnabled && fireParticlesRef.current) {
          const geom = fireParticlesRef.current.geometry as THREE.BufferGeometry;
          const positions = geom.getAttribute('position') as THREE.BufferAttribute;
          const velocities = geom.getAttribute('velocity') as THREE.BufferAttribute;
          const alphas = geom.getAttribute('alpha') as THREE.BufferAttribute;
          const particleSizesAttr = geom.getAttribute('particleSize') as THREE.BufferAttribute;
          const lives = geom.getAttribute('life') as THREE.BufferAttribute;
          const colorsAttr = geom.getAttribute('color') as THREE.BufferAttribute; 
          const currentFireBaseC = new THREE_Module.Color(fireBaseColor);
          const currentFireAccentC = new THREE_Module.Color(fireAccentColor);
          const finalFireColor = new THREE_Module.Color();
          const fullFireLifespan = BASE_FIRE_LIFESPAN * 0.5 + BASE_FIRE_LIFESPAN * 0.5;


          for (let i = 0; i < positions.count; i++) {
            lives.setX(i, lives.getX(i) - delta * 20); 

            if (lives.getX(i) <= 0) {
              let newX, newY, newZ;
              switch(fireParticleSource) {
                case "Bottom":
                  newX = (Math.random() - 0.5) * fireSpread * 2.5; 
                  newY = -2.5 + (Math.random() * 0.1);
                  newZ = (Math.random() - 0.5) * fireSpread * 0.6; 
                  break;
                case "Mouse":
                  newX = mouseSceneXRef.current + (Math.random() - 0.5) * fireSpread * 0.3;
                  newY = (Math.random() - 0.5) * 0.5 - 2.0;
                  newZ = (Math.random() - 0.5) * fireSpread * 0.3;
                  break;
                case "Center":
                default:
                  newX = (Math.random() - 0.5) * fireSpread * 1.8; 
                  newY = -2.5 + (Math.random() - 0.5) * 0.2;
                  newZ = (Math.random() - 0.5) * fireSpread * 1.8; 
                  break;
              }
              positions.setXYZ(i, newX, newY, newZ);
              velocities.setXYZ(i, (Math.random() - 0.5) * 0.02 * fireSpread, (Math.random() * fireSpeed * 1.8) + fireSpeed * 1.5, (Math.random() - 0.5) * 0.02 * fireSpread);
              lives.setX(i, fullFireLifespan);
              
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
              
              alphas.setX(i, fireOpacity * (0.8 + Math.random() * 0.2));
              particleSizesAttr.setX(i, (0.6 + Math.random() * 0.6) * (fireSpread / 1.1));

            } else {
              const lifeRatio = Math.max(0, lives.getX(i) / fullFireLifespan); 

              const baseFireTurbulenceEffect = fireSpread * 0.01; 
              const fireTurbulenceStrength = fireTurbulence; 
              const timeFactorFireTurbulence = (fullFireLifespan - lives.getX(i)) * 0.25 + positions.getY(i) * 0.2; 
              const xFireTurbulence = Math.sin(timeFactorFireTurbulence + i * 0.15) * baseFireTurbulenceEffect * fireTurbulenceStrength;
              const zFireTurbulence = Math.cos(timeFactorFireTurbulence * 0.6 + i * 0.1) * baseFireTurbulenceEffect * fireTurbulenceStrength;

              positions.setXYZ(
                i,
                positions.getX(i) + velocities.getX(i) * delta * 60 + xFireTurbulence,
                positions.getY(i) + velocities.getY(i) * delta * 60,
                positions.getZ(i) + velocities.getZ(i) * delta * 60 + zFireTurbulence
              );
              
              alphas.setX(i, fireOpacity * (0.8 + Math.random() * 0.2) * Math.pow(lifeRatio, 1.5)); // Fire fades more traditionally
              
              particleSizesAttr.setX(i, particleSizesAttr.getX(i) * (0.95 + lifeRatio * 0.1 + Math.random() * 0.05)); // Slight flicker and shrink
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
      if (mountRef.current && rendererRef.current?.domElement) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current?.dispose();
      smokeParticlesRef.current?.geometry.dispose(); (smokeParticlesRef.current?.material as THREE.Material)?.dispose();
      fireParticlesRef.current?.geometry.dispose(); (fireParticlesRef.current?.material as THREE.Material)?.dispose();
      smokeParticleTexture?.dispose(); fireParticleTexture?.dispose();
      sceneRef.current = null; cameraRef.current = null; rendererRef.current = null;
      smokeParticlesRef.current = null; fireParticlesRef.current = null;
    };
  }, [
      isThreeLoaded, actualSmokeParticleCount, actualFireParticleCount, onCanvasReady, initParticles, 
      backgroundColor, 
      smokeBaseColor, smokeAccentColor, smokeSpeed, smokeSpread, smokeOpacity, smokeTurbulence, smokeSource, smokeBlendMode, isSmokeEnabled, 
      fireBaseColor, fireAccentColor, fireSpeed, fireSpread, fireOpacity, fireTurbulence, fireParticleSource, fireBlendMode, isFireEnabled, 
      isPlaying
    ]); 


  useEffect(() => {
    if (smokeParticlesRef.current && smokeParticlesRef.current.material && THREE_Module && isThreeLoaded) {
      let newBlendingMode = THREE_Module.NormalBlending;
       switch(smokeBlendMode) {
            case "Additive": newBlendingMode = THREE_Module.AdditiveBlending; break;
            case "Subtractive": newBlendingMode = THREE_Module.SubtractiveBlending; break;
            case "Multiply": newBlendingMode = THREE_Module.MultiplyBlending; break;
            case "Normal":
            default: newBlendingMode = THREE_Module.NormalBlending; break;
        }
      (smokeParticlesRef.current.material as THREE.PointsMaterial).blending = newBlendingMode;
      (smokeParticlesRef.current.material as THREE.PointsMaterial).needsUpdate = true;
    }
  }, [smokeBlendMode, isThreeLoaded, THREE_Module]);

  useEffect(() => {
    if (fireParticlesRef.current && fireParticlesRef.current.material && THREE_Module && isThreeLoaded) {
      let newBlendingMode = THREE_Module.AdditiveBlending; 
      switch(fireBlendMode) {
        case "Additive": newBlendingMode = THREE_Module.AdditiveBlending; break;
        case "Subtractive": newBlendingMode = THREE_Module.SubtractiveBlending; break;
        case "Multiply": newBlendingMode = THREE_Module.MultiplyBlending; break;
        case "Normal": 
        default: newBlendingMode = THREE_Module.AdditiveBlending; break; 
      }
      (fireParticlesRef.current.material as THREE.PointsMaterial).blending = newBlendingMode;
      (fireParticlesRef.current.material as THREE.PointsMaterial).needsUpdate = true;
    }
  }, [fireBlendMode, isThreeLoaded, THREE_Module]);


  useEffect(() => {
    if (smokeParticlesRef.current) {
      smokeParticlesRef.current.visible = !!isSmokeEnabled;
    }
  }, [isSmokeEnabled]);

  useEffect(() => {
    if (fireParticlesRef.current) {
      fireParticlesRef.current.visible = !!isFireEnabled;
    }
  }, [isFireEnabled]);

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
        <p className="text-lg">Loading 3D Smoke & Fire Simulation...</p>
      </div>
    );
  }

  return <div ref={mountRef} className="w-full h-full" role="img" aria-label="Smoke and fire simulation canvas" data-ai-hint="smoke fire particles" />;
};

export default SmokeCanvas;
