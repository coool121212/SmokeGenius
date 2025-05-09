
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

const BASE_FIRE_LIFESPAN = 60; // Frames, approx 1 second at 60fps
const BASE_SMOKE_LIFESPAN = 150; // Frames, approx 2.5 seconds at 60fps

const SmokeCanvas: React.FC<SmokeCanvasProps> = ({
  smokeDensity = 2000,
  smokeColor = '#1A1A1A',
  smokeSpeed = 0.02,
  smokeSpread = 2,
  
  isFireEnabled = true,
  fireColor = '#FFA500',
  fireDensity = 1000,
  fireSpeed = 0.03,
  fireSpread = 1.5,

  backgroundColor = '#333333',
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
    gradient.addColorStop(0, 'rgba(255,255,255,0.7)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

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
    gradient.addColorStop(0, 'rgba(255,220,150,1)');
    gradient.addColorStop(0.2, 'rgba(255,180,80,0.8)');
    gradient.addColorStop(0.5, 'rgba(255,100,50,0.5)');
    gradient.addColorStop(1, 'rgba(255,50,0,0)');
    
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
    const particleColors = new Float32Array(count * 3); // Renamed to avoid confusion with prop
    const alphas = new Float32Array(count);
    const particleSizes = new Float32Array(count); // Renamed to avoid confusion
    const lives = new Float32Array(count);

    const baseColor = new THREE_Module.Color(colorVal);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      if (isFire) {
        positions[i3] = (Math.random() - 0.5) * spreadVal * 0.7; 
        positions[i3 + 1] = -2.5 + (Math.random() - 0.5) * 0.3; 
        positions[i3 + 2] = (Math.random() - 0.5) * spreadVal * 0.7;
      } else { // Smoke
        positions[i3] = (Math.random() - 0.5) * spreadVal * 1.5;
        positions[i3 + 1] = (Math.random() - 0.5) * 0.5 - 2.0; 
        positions[i3 + 2] = (Math.random() - 0.5) * spreadVal;
      }
      
      if (isFire) {
        velocities[i3] = (Math.random() - 0.5) * 0.015 * spreadVal;
        velocities[i3 + 1] = (Math.random() * speedVal * 2.0) + speedVal * 1.2; 
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.015 * spreadVal;
        
        const fireHsl = { h: 0, s: 0, l: 0 };
        baseColor.getHSL(fireHsl);
        const variedColor = new THREE_Module.Color().setHSL(
            fireHsl.h + (Math.random() -0.5) * 0.1, 
            Math.max(0.7, fireHsl.s - Math.random() * 0.2), 
            Math.min(0.8, fireHsl.l + Math.random() * 0.1) 
        );
        particleColors[i3] = variedColor.r;
        particleColors[i3 + 1] = variedColor.g;
        particleColors[i3 + 2] = variedColor.b;

        alphas[i] = 0.6 + Math.random() * 0.4;
        particleSizes[i] = 0.25 + Math.random() * 0.35 * (spreadVal / 1.5); 
        lives[i] = Math.random() * BASE_FIRE_LIFESPAN * 0.6 + BASE_FIRE_LIFESPAN * 0.4;
      } else { // Smoke
        velocities[i3] = (Math.random() - 0.5) * 0.025 * spreadVal; 
        velocities[i3 + 1] = Math.random() * speedVal + 0.01;
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.025 * spreadVal;

        particleColors[i3] = baseColor.r;
        particleColors[i3 + 1] = baseColor.g;
        particleColors[i3 + 2] = baseColor.b;
        alphas[i] = 0.25 + Math.random() * 0.35;
        particleSizes[i] = 0.35 + Math.random() * 0.3 * (spreadVal / 2.0) ; 
        lives[i] = Math.random() * BASE_SMOKE_LIFESPAN * 0.5 + BASE_SMOKE_LIFESPAN * 0.5;
      }
    }

    geometry.setAttribute('position', new THREE_Module.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE_Module.BufferAttribute(velocities, 3));
    geometry.setAttribute('color', new THREE_Module.BufferAttribute(particleColors, 3)); // Changed from customColor
    geometry.setAttribute('alpha', new THREE_Module.BufferAttribute(alphas, 1));
    geometry.setAttribute('particleSize', new THREE_Module.BufferAttribute(particleSizes, 1)); // Changed from size
    geometry.setAttribute('life', new THREE_Module.BufferAttribute(lives, 1));

    const material = new THREE_Module.PointsMaterial({
      map: isFire ? fireParticleTexture : smokeParticleTexture,
      blending: isFire ? THREE_Module.AdditiveBlending : THREE_Module.NormalBlending, 
      depthWrite: false,
      transparent: true,
      vertexColors: true, // This is key for 'color' attribute to work with vColor
      sizeAttenuation: true,
    });
    
    material.onBeforeCompile = shader => {
        const pixelRatio = window.devicePixelRatio || 1;
        shader.vertexShader = `
          attribute float particleSize; // Changed from 'size'
          attribute float alpha;
          // attribute vec3 color; // Not needed here, THREE.js handles 'color' attribute
          varying float vAlpha;
          // varying vec3 vColor; // Not needed, THREE.js handles if 'vertexColors: true'
          ${shader.vertexShader}
        `.replace(
          `#include <begin_vertex>`,
          `#include <begin_vertex>
           transformed = vec3( position );
           vAlpha = alpha; // Assign alpha to our custom varying
           // vColor = color; // Not needed if attribute is 'color' & vertexColors is true
          `
        ).replace(
          /gl_PointSize = \w+;/, // More general regex to catch default size assignment
          `gl_PointSize = particleSize * ${pixelRatio.toFixed(1)};` // Use particleSize attribute
        ).replace(
           `#include <project_vertex>`,
           `
            vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );
            gl_Position = projectionMatrix * mvPosition;
            gl_PointSize = particleSize * ( ${pixelRatio.toFixed(1)} / -mvPosition.z ); // Use particleSize
           `
        );

        shader.fragmentShader = `
          varying float vAlpha; // Our custom varying
          // varying vec3 vColor; // Not needed, THREE.js provides vColor from 'color' attribute
          ${shader.fragmentShader}
        `.replace(
          `vec4 diffuseColor = vec4( diffuse, opacity );`,
          `vec4 diffuseColor = vec4( vColor, vAlpha * opacity );` // vColor is standard, vAlpha is ours
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

      if (isPlaying) {
        if (smokeParticlesRef.current) {
          const geom = smokeParticlesRef.current.geometry as THREE.BufferGeometry;
          const positions = geom.getAttribute('position') as THREE.BufferAttribute;
          const velocities = geom.getAttribute('velocity') as THREE.BufferAttribute;
          const alphas = geom.getAttribute('alpha') as THREE.BufferAttribute;
          const particleSizesAttr = geom.getAttribute('particleSize') as THREE.BufferAttribute; // Changed
          const lives = geom.getAttribute('life') as THREE.BufferAttribute;
          const colorsAttr = geom.getAttribute('color') as THREE.BufferAttribute; // Changed
          const currentSmokeColor = new THREE_Module.Color(smokeColor);

          for (let i = 0; i < positions.count; i++) {
            lives.setX(i, lives.getX(i) - delta * 15); 

            if (lives.getX(i) <= 0) { 
              positions.setXYZ(i, (Math.random() - 0.5) * smokeSpread * 1.5, (Math.random() - 0.5) * 0.5 - 2.0, (Math.random() - 0.5) * smokeSpread);
              velocities.setXYZ(i, (Math.random() - 0.5) * 0.025 * smokeSpread, Math.random() * smokeSpeed + 0.01, (Math.random() - 0.5) * 0.025 * smokeSpread);
              lives.setX(i, Math.random() * BASE_SMOKE_LIFESPAN * 0.5 + BASE_SMOKE_LIFESPAN * 0.5);
              alphas.setX(i, 0.25 + Math.random() * 0.35);
              particleSizesAttr.setX(i, (0.35 + Math.random() * 0.3) * (smokeSpread / 2.0));
              colorsAttr.setXYZ(i, currentSmokeColor.r, currentSmokeColor.g, currentSmokeColor.b);
            } else { 
              positions.setXYZ(
                i,
                positions.getX(i) + velocities.getX(i) * delta * 60 + Math.sin(positions.getY(i) * 0.5 + lives.getX(i) * 0.05) * 0.015 * smokeSpread, 
                positions.getY(i) + velocities.getY(i) * delta * 60,
                positions.getZ(i) + velocities.getZ(i) * delta * 60 + Math.cos(positions.getY(i) * 0.5 + lives.getX(i) * 0.05) * 0.015 * smokeSpread
              );
              const lifeRatio = Math.max(0, lives.getX(i) / BASE_SMOKE_LIFESPAN);
              alphas.setX(i, (0.25 + Math.random() * 0.15) * lifeRatio); 
              particleSizesAttr.setX(i, ((0.35 + Math.random() * 0.3) * (smokeSpread / 2.0)) * (1 + (1-lifeRatio) * 0.5) ); 
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
          const particleSizesAttr = geom.getAttribute('particleSize') as THREE.BufferAttribute; // Changed
          const lives = geom.getAttribute('life') as THREE.BufferAttribute;
          const colorsAttr = geom.getAttribute('color') as THREE.BufferAttribute; // Changed
          const currentFireColor = new THREE_Module.Color(fireColor);

          for (let i = 0; i < positions.count; i++) {
            lives.setX(i, lives.getX(i) - delta * 20); 

            if (lives.getX(i) <= 0) {
              positions.setXYZ(i, (Math.random() - 0.5) * fireSpread * 0.7, -2.5 + (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * fireSpread * 0.7);
              velocities.setXYZ(i, (Math.random() - 0.5) * 0.015 * fireSpread, (Math.random() * fireSpeed * 2.0) + fireSpeed * 1.2, (Math.random() - 0.5) * 0.015 * fireSpread);
              lives.setX(i, Math.random() * BASE_FIRE_LIFESPAN * 0.6 + BASE_FIRE_LIFESPAN * 0.4);
              alphas.setX(i, 0.6 + Math.random() * 0.4);
              particleSizesAttr.setX(i, (0.25 + Math.random() * 0.35) * (fireSpread / 1.5));
              
              const fireHsl = { h: 0, s: 0, l: 0 };
              currentFireColor.getHSL(fireHsl);
              const variedColor = new THREE_Module.Color().setHSL(
                  fireHsl.h + (Math.random() -0.5) * 0.08, 
                  Math.max(0.75, fireHsl.s - Math.random() * 0.15), 
                  Math.min(0.75, fireHsl.l + Math.random() * 0.15)
              );
              colorsAttr.setXYZ(i, variedColor.r, variedColor.g, variedColor.b);

            } else {
              positions.setXYZ(
                i,
                positions.getX(i) + velocities.getX(i) * delta * 60,
                positions.getY(i) + velocities.getY(i) * delta * 60,
                positions.getZ(i) + velocities.getZ(i) * delta * 60
              );
              const lifeRatio = Math.max(0, lives.getX(i) / BASE_FIRE_LIFESPAN);
              alphas.setX(i, (0.6 + Math.random() * 0.2) * lifeRatio); 
              particleSizesAttr.setX(i, ((0.25 + Math.random() * 0.35) * (fireSpread / 1.5)) * (0.8 + lifeRatio * 0.4) ); 
              
              const fireHsl = { h: 0, s: 0, l: 0 };
              const baseParticleColor = new THREE_Module.Color(colorsAttr.getX(i), colorsAttr.getY(i), colorsAttr.getZ(i));
              baseParticleColor.getHSL(fireHsl);

              const finalColor = new THREE_Module.Color().setHSL(
                  fireHsl.h, 
                  fireHsl.s * (0.5 + lifeRatio * 0.5), 
                  fireHsl.l * (0.4 + lifeRatio * 0.6) 
              );
              colorsAttr.setXYZ(i, finalColor.r, finalColor.g, finalColor.b);
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
