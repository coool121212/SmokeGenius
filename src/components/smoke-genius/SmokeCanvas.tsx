
"use client";

import type * as THREE from 'three';
import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { debounce } from '@/lib/utils'; 

let THREE_Module: typeof THREE | null = null;

interface SmokeCanvasProps {
  smokeDensity?: number;
  smokeColor?: string;
  smokeSpeed?: number;
  smokeSpread?: number;
  
  isFireEnabled?: boolean;
  fireColor?: string;
  fireDensity?: number;
  fireSpeed?: number;
  fireSpread?: number;

  backgroundColor?: string;
  isPlaying?: boolean;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

const MAX_SMOKE_PARTICLES = 8000;
const MAX_FIRE_PARTICLES = 5000;

const BASE_FIRE_LIFESPAN = 70; // Frames, approx 1.16s at 60fps - slightly increased for more visible embers
const BASE_SMOKE_LIFESPAN = 180; // Frames, approx 3s at 60fps - slightly increased for longer lasting smoke

const SmokeCanvas: React.FC<SmokeCanvasProps> = ({
  smokeDensity = 2000,
  smokeColor = '#F5F5F5', // Default to whitish smoke as per recent change
  smokeSpeed = 0.02,
  smokeSpread = 2,
  
  isFireEnabled = true,
  fireColor = '#FFA500',
  fireDensity = 1000,
  fireSpeed = 0.03,
  fireSpread = 1.5,

  backgroundColor = '#000000', // Default background to black as per recent change
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
    // Refined smoke texture: denser core, sharper falloff, slightly greyish
    gradient.addColorStop(0, 'rgba(220,220,220,0.8)'); 
    gradient.addColorStop(0.2, 'rgba(200,200,200,0.5)');
    gradient.addColorStop(0.8, 'rgba(180,180,180,0.1)');
    gradient.addColorStop(1, 'rgba(150,150,150,0)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
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
    // Refined fire texture: hotter (whiter) core, more intense colors
    gradient.addColorStop(0, 'rgba(255,255,240,1)');    
    gradient.addColorStop(0.15, 'rgba(255,220,100,0.9)');
    gradient.addColorStop(0.4, 'rgba(255,150,50,0.7)'); 
    gradient.addColorStop(0.7, 'rgba(255,80,0,0.3)');   
    gradient.addColorStop(1, 'rgba(200,0,0,0)');  

    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    return new THREE_Module.CanvasTexture(canvas);
  }, [isThreeLoaded]);


  const initParticles = useCallback((
    count: number,
    isFire: boolean,
    colorVal: string,
    speedVal: number,
    spreadVal: number
  ) => {
    if (!THREE_Module) return { geometry: null, material: null };

    const geometry = new THREE_Module.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const particleColors = new Float32Array(count * 3); 
    const alphas = new Float32Array(count);
    const particleSizes = new Float32Array(count); 
    const lives = new Float32Array(count);

    const baseColor = new THREE_Module.Color(colorVal);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      if (isFire) {
        positions[i3] = (Math.random() - 0.5) * spreadVal * 0.6; // Reduced initial horizontal spread for fire base
        positions[i3 + 1] = -2.5 + (Math.random() - 0.5) * 0.2; 
        positions[i3 + 2] = (Math.random() - 0.5) * spreadVal * 0.6;
      } else { // Smoke
        positions[i3] = (Math.random() - 0.5) * spreadVal * 1.2; // Smoke can start wider
        positions[i3 + 1] = (Math.random() - 0.5) * 0.5 - 2.0; 
        positions[i3 + 2] = (Math.random() - 0.5) * spreadVal * 1.2;
      }
      
      if (isFire) {
        velocities[i3] = (Math.random() - 0.5) * 0.02 * spreadVal; // Slightly more horizontal velocity
        velocities[i3 + 1] = (Math.random() * speedVal * 1.8) + speedVal * 1.5; // More varied upward speed
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.02 * spreadVal;
        
        const fireHsl = { h: 0, s: 0, l: 0 };
        baseColor.getHSL(fireHsl);
        const variedColor = new THREE_Module.Color().setHSL(
            fireHsl.h + (Math.random() -0.5) * 0.1, 
            Math.max(0.8, fireHsl.s - Math.random() * 0.2), 
            Math.min(0.9, fireHsl.l + Math.random() * 0.15) 
        );
        particleColors[i3] = variedColor.r;
        particleColors[i3 + 1] = variedColor.g;
        particleColors[i3 + 2] = variedColor.b;

        alphas[i] = 0.7 + Math.random() * 0.3; // Fire starts more opaque
        particleSizes[i] = 0.3 + Math.random() * 0.4 * (spreadVal / 1.5); 
        lives[i] = Math.random() * BASE_FIRE_LIFESPAN * 0.5 + BASE_FIRE_LIFESPAN * 0.5; // Lifespan variation
      } else { // Smoke
        velocities[i3] = (Math.random() - 0.5) * 0.02 * spreadVal; 
        velocities[i3 + 1] = Math.random() * speedVal + 0.015; // Slightly faster base rise
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.02 * spreadVal;

        particleColors[i3] = baseColor.r;
        particleColors[i3 + 1] = baseColor.g;
        particleColors[i3 + 2] = baseColor.b;
        alphas[i] = 0.3 + Math.random() * 0.4; // Smoke starts a bit more opaque
        particleSizes[i] = 0.4 + Math.random() * 0.35 * (spreadVal / 2.0) ; 
        lives[i] = Math.random() * BASE_SMOKE_LIFESPAN * 0.6 + BASE_SMOKE_LIFESPAN * 0.4; // Wider lifespan variation
      }
    }

    geometry.setAttribute('position', new THREE_Module.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE_Module.BufferAttribute(velocities, 3));
    geometry.setAttribute('color', new THREE_Module.BufferAttribute(particleColors, 3));
    geometry.setAttribute('alpha', new THREE_Module.BufferAttribute(alphas, 1));
    geometry.setAttribute('particleSize', new THREE_Module.BufferAttribute(particleSizes, 1)); 
    geometry.setAttribute('life', new THREE_Module.BufferAttribute(lives, 1));

    const material = new THREE_Module.PointsMaterial({
      map: isFire ? fireParticleTexture : smokeParticleTexture,
      blending: isFire ? THREE_Module.AdditiveBlending : THREE_Module.NormalBlending, 
      depthWrite: false,
      transparent: true,
      vertexColors: true, 
      sizeAttenuation: true,
    });
    
    material.onBeforeCompile = shader => {
        const pixelRatio = window.devicePixelRatio || 1;
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
          /gl_PointSize = \w+;/, 
          `gl_PointSize = particleSize * ${pixelRatio.toFixed(1)};` 
        ).replace(
           `#include <project_vertex>`,
           `
            vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );
            gl_Position = projectionMatrix * mvPosition;
            gl_PointSize = particleSize * ( ${pixelRatio.toFixed(1)} / -mvPosition.z ); 
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
  }, [THREE_Module, smokeParticleTexture, fireParticleTexture]);


  useEffect(() => {
    if (!mountRef.current || !isThreeLoaded || !THREE_Module || !smokeParticleTexture || !fireParticleTexture) return;

    const scene = new THREE_Module.Scene();
    sceneRef.current = scene;
    
    const camera = new THREE_Module.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    camera.position.z = 5;
    cameraRef.current = camera;

    const renderer = new THREE_Module.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(new THREE_Module.Color(backgroundColor));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    if (onCanvasReady) {
      onCanvasReady(renderer.domElement);
    }
    
    const { geometry: smokeGeo, material: smokeMat } = initParticles(actualSmokeParticleCount, false, smokeColor, smokeSpeed, smokeSpread);
    if (smokeGeo && smokeMat) {
      const smokePoints = new THREE_Module.Points(smokeGeo, smokeMat);
      scene.add(smokePoints);
      smokeParticlesRef.current = smokePoints;
    }

    const { geometry: fireGeo, material: fireMat } = initParticles(actualFireParticleCount, true, fireColor, fireSpeed, fireSpread);
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
      // const elapsedTime = clock.getElapsedTime(); // Useful for global time-based effects

      if (isPlaying) {
        if (smokeParticlesRef.current) {
          const geom = smokeParticlesRef.current.geometry as THREE.BufferGeometry;
          const positions = geom.getAttribute('position') as THREE.BufferAttribute;
          const velocities = geom.getAttribute('velocity') as THREE.BufferAttribute;
          const alphas = geom.getAttribute('alpha') as THREE.BufferAttribute;
          const particleSizesAttr = geom.getAttribute('particleSize') as THREE.BufferAttribute;
          const lives = geom.getAttribute('life') as THREE.BufferAttribute;
          const colorsAttr = geom.getAttribute('color') as THREE.BufferAttribute;
          const currentSmokeColor = new THREE_Module.Color(smokeColor);

          for (let i = 0; i < positions.count; i++) {
            lives.setX(i, lives.getX(i) - delta * 15); 

            if (lives.getX(i) <= 0) { 
              positions.setXYZ(i, (Math.random() - 0.5) * smokeSpread * 1.2, (Math.random() - 0.5) * 0.5 - 2.0, (Math.random() - 0.5) * smokeSpread * 1.2);
              velocities.setXYZ(i, (Math.random() - 0.5) * 0.02 * smokeSpread, Math.random() * smokeSpeed + 0.015, (Math.random() - 0.5) * 0.02 * smokeSpread);
              lives.setX(i, Math.random() * BASE_SMOKE_LIFESPAN * 0.6 + BASE_SMOKE_LIFESPAN * 0.4);
              alphas.setX(i, 0.3 + Math.random() * 0.4);
              particleSizesAttr.setX(i, (0.4 + Math.random() * 0.35) * (smokeSpread / 2.0));
              colorsAttr.setXYZ(i, currentSmokeColor.r, currentSmokeColor.g, currentSmokeColor.b);
            } else { 
              // Enhanced smoke turbulence
              const turbulenceFactor = 0.03 * smokeSpread; 
              const xTurbulence = Math.sin(positions.getY(i) * 0.4 + lives.getX(i) * 0.07) * turbulenceFactor;
              const zTurbulence = Math.cos(positions.getY(i) * 0.4 + lives.getX(i) * 0.07) * turbulenceFactor;

              positions.setXYZ(
                i,
                positions.getX(i) + velocities.getX(i) * delta * 60 + xTurbulence, 
                positions.getY(i) + velocities.getY(i) * delta * 60,
                positions.getZ(i) + velocities.getZ(i) * delta * 60 + zTurbulence
              );
              const lifeRatio = Math.max(0, lives.getX(i) / BASE_SMOKE_LIFESPAN);
              alphas.setX(i, (0.2 + Math.random() * 0.2) * lifeRatio); // Smoke fades more
              particleSizesAttr.setX(i, ((0.4 + Math.random() * 0.35) * (smokeSpread / 2.0)) * (1 + (1-lifeRatio) * 0.8) ); // Smoke expands more as it ages
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
          const currentFireColor = new THREE_Module.Color(fireColor);

          for (let i = 0; i < positions.count; i++) {
            lives.setX(i, lives.getX(i) - delta * 20); 

            if (lives.getX(i) <= 0) {
              positions.setXYZ(i, (Math.random() - 0.5) * fireSpread * 0.6, -2.5 + (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * fireSpread * 0.6);
              velocities.setXYZ(i, (Math.random() - 0.5) * 0.02 * fireSpread, (Math.random() * fireSpeed * 1.8) + fireSpeed * 1.5, (Math.random() - 0.5) * 0.02 * fireSpread);
              lives.setX(i, Math.random() * BASE_FIRE_LIFESPAN * 0.5 + BASE_FIRE_LIFESPAN * 0.5);
              alphas.setX(i, 0.7 + Math.random() * 0.3);
              particleSizesAttr.setX(i, (0.3 + Math.random() * 0.4) * (fireSpread / 1.5));
              
              const fireHsl = { h: 0, s: 0, l: 0 };
              currentFireColor.getHSL(fireHsl);
              const variedColor = new THREE_Module.Color().setHSL(
                  fireHsl.h + (Math.random() -0.5) * 0.08, 
                  Math.max(0.8, fireHsl.s - Math.random() * 0.15), 
                  Math.min(0.85, fireHsl.l + Math.random() * 0.15)
              );
              colorsAttr.setXYZ(i, variedColor.r, variedColor.g, variedColor.b);

            } else {
              // Added fire turbulence/flicker
              const fireTurbulenceFactor = 0.025 * fireSpread;
              const xFireTurbulence = Math.sin(positions.getY(i) * 0.9 + lives.getX(i) * 0.15) * fireTurbulenceFactor;
              const zFireTurbulence = Math.cos(positions.getY(i) * 0.9 + lives.getX(i) * 0.15) * fireTurbulenceFactor;

              positions.setXYZ(
                i,
                positions.getX(i) + velocities.getX(i) * delta * 60 + xFireTurbulence,
                positions.getY(i) + velocities.getY(i) * delta * 60,
                positions.getZ(i) + velocities.getZ(i) * delta * 60 + zFireTurbulence
              );
              const lifeRatio = Math.max(0, lives.getX(i) / BASE_FIRE_LIFESPAN);
              alphas.setX(i, (0.65 + Math.random() * 0.25) * lifeRatio); 
              particleSizesAttr.setX(i, ((0.3 + Math.random() * 0.4) * (fireSpread / 1.5)) * (0.7 + lifeRatio * 0.5) ); // Fire particles shrink a bit more as they die
              
              // Removed color change over lifespan for fire particles as per user request
              // The color will remain as set when the particle (re)spawned.
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
        rendererRef.current.setPixelRatio(window.devicePixelRatio);
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
  }, [isThreeLoaded, actualSmokeParticleCount, actualFireParticleCount, onCanvasReady, initParticles, backgroundColor, fireColor, fireSpeed, fireSpread, isFireEnabled, smokeColor, smokeSpeed, smokeSpread, isPlaying]); 


  useEffect(() => {
    if (!isThreeLoaded || !THREE_Module || !smokeParticlesRef.current?.geometry) return;
  }, [smokeColor, smokeSpeed, smokeSpread, isThreeLoaded, THREE_Module]);

  useEffect(() => {
    if (!isThreeLoaded || !THREE_Module || !fireParticlesRef.current?.geometry) return;
  }, [fireColor, fireSpeed, fireSpread, isThreeLoaded, THREE_Module]);


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
  
  useEffect(() => {
  }, [isPlaying]);


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

