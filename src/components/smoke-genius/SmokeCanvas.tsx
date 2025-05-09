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

  // Smoke particle texture (dynamic color update is handled in shader/attributes)
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
    // Generic white gradient, color will be applied via vertex colors
    gradient.addColorStop(0, 'rgba(255,255,255,0.7)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    return new THREE_Module.CanvasTexture(canvas);
  }, [isThreeLoaded]);

  // Fire particle texture (base texture, color variations handled in shader/attributes)
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
    // Base bright texture for fire, specific coloring via vertex attributes
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
    const colors = new Float32Array(count * 3);
    const alphas = new Float32Array(count);
    const sizes = new Float32Array(count);
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
        
        // Fire color will be derived from fireColor prop + life cycle variation
        const fireHsl = { h: 0, s: 0, l: 0 };
        baseColor.getHSL(fireHsl);
        const variedColor = new THREE_Module.Color().setHSL(
            fireHsl.h + (Math.random() -0.5) * 0.1, // slight hue variation
            Math.max(0.7, fireHsl.s - Math.random() * 0.2), // high saturation
            Math.min(0.8, fireHsl.l + Math.random() * 0.1) // brightness variation
        );
        colors[i3] = variedColor.r;
        colors[i3 + 1] = variedColor.g;
        colors[i3 + 2] = variedColor.b;

        alphas[i] = 0.6 + Math.random() * 0.4;
        sizes[i] = 0.25 + Math.random() * 0.35 * (spreadVal / 1.5); 
        lives[i] = Math.random() * BASE_FIRE_LIFESPAN * 0.6 + BASE_FIRE_LIFESPAN * 0.4;
      } else { // Smoke
        velocities[i3] = (Math.random() - 0.5) * 0.025 * spreadVal; 
        velocities[i3 + 1] = Math.random() * speedVal + 0.01;
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.025 * spreadVal;

        colors[i3] = baseColor.r;
        colors[i3 + 1] = baseColor.g;
        colors[i3 + 2] = baseColor.b;
        alphas[i] = 0.25 + Math.random() * 0.35;
        sizes[i] = 0.35 + Math.random() * 0.3 * (spreadVal / 2.0) ; 
        lives[i] = Math.random() * BASE_SMOKE_LIFESPAN * 0.5 + BASE_SMOKE_LIFESPAN * 0.5;
      }
    }

    geometry.setAttribute('position', new THREE_Module.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE_Module.BufferAttribute(velocities, 3));
    geometry.setAttribute('customColor', new THREE_Module.BufferAttribute(colors, 3));
    geometry.setAttribute('alpha', new THREE_Module.BufferAttribute(alphas, 1));
    geometry.setAttribute('size', new THREE_Module.BufferAttribute(sizes, 1));
    geometry.setAttribute('life', new THREE_Module.BufferAttribute(lives, 1));

    const material = new THREE_Module.PointsMaterial({
      map: isFire ? fireParticleTexture : smokeParticleTexture,
      blending: isFire ? THREE_Module.AdditiveBlending : THREE_Module.NormalBlending, 
      depthWrite: false,
      transparent: true,
      vertexColors: true,
      sizeAttenuation: true,
    });
    
    // Shader modification to use custom attributes for size and alpha per particle
    // And to correctly apply pixelRatio for consistent sizing
    material.onBeforeCompile = shader => {
        const pixelRatio = window.devicePixelRatio || 1;
        shader.vertexShader = `
          attribute float size;
          attribute float alpha;
          attribute vec3 customColor;
          varying float vAlpha;
          varying vec3 vColor;
          ${shader.vertexShader}
        `.replace(
          `#include <begin_vertex>`,
          `#include <begin_vertex>
           transformed = vec3( position );
           vAlpha = alpha;
           vColor = customColor;
          `
        ).replace( // Ensure this specific placeholder is targeted if it exists, otherwise use a general approach
          /gl_PointSize = size;/, // More robust regex to find default size assignment
          `gl_PointSize = size * ${pixelRatio.toFixed(1)};` 
        ).replace( // For perspective correct sizing
           `#include <project_vertex>`,
           `
            vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );
            gl_Position = projectionMatrix * mvPosition;
            // Perspective-correct point size
            gl_PointSize = size * ( ${pixelRatio.toFixed(1)} / -mvPosition.z );
           `
        );

        shader.fragmentShader = `
          varying float vAlpha;
          varying vec3 vColor;
          ${shader.fragmentShader}
        `.replace(
          `vec4 diffuseColor = vec4( diffuse, opacity );`,
          `vec4 diffuseColor = vec4( vColor, vAlpha * opacity );`
        );
      };

    return { geometry, material };
  }, [THREE_Module, smokeParticleTexture, fireParticleTexture]);


  // Main initialization effect
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
    renderer.setClearColor(new THREE_Module.Color(backgroundColor)); // Initial background color
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    if (onCanvasReady) {
      onCanvasReady(renderer.domElement);
    }
    
    // Initialize Smoke Particles
    const { geometry: smokeGeo, material: smokeMat } = initParticles(actualSmokeParticleCount, false, smokeColor, smokeSpeed, smokeSpread);
    if (smokeGeo && smokeMat) {
      const smokePoints = new THREE_Module.Points(smokeGeo, smokeMat);
      scene.add(smokePoints);
      smokeParticlesRef.current = smokePoints;
    }

    // Initialize Fire Particles
    const { geometry: fireGeo, material: fireMat } = initParticles(actualFireParticleCount, true, fireColor, fireSpeed, fireSpread);
    if (fireGeo && fireMat) {
      const firePoints = new THREE_Module.Points(fireGeo, fireMat);
      firePoints.visible = isFireEnabled;
      scene.add(firePoints);
      fireParticlesRef.current = firePoints;
    }

    const clock = new THREE_Module.Clock();

    const animate = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
      
      animationFrameIdRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta(); // Time elapsed since last frame

      if (isPlaying) {
        // Animate Smoke
        if (smokeParticlesRef.current) {
          const geom = smokeParticlesRef.current.geometry as THREE.BufferGeometry;
          const positions = geom.getAttribute('position') as THREE.BufferAttribute;
          const velocities = geom.getAttribute('velocity') as THREE.BufferAttribute;
          const alphas = geom.getAttribute('alpha') as THREE.BufferAttribute;
          const sizes = geom.getAttribute('size') as THREE.BufferAttribute;
          const lives = geom.getAttribute('life') as THREE.BufferAttribute;
          const colors = geom.getAttribute('customColor') as THREE.BufferAttribute;
          const currentSmokeColor = new THREE_Module.Color(smokeColor);

          for (let i = 0; i < positions.count; i++) {
            lives.setX(i, lives.getX(i) - delta * 15); // Decrease life

            if (lives.getX(i) <= 0) { // Particle died, reset it
              positions.setXYZ(i, (Math.random() - 0.5) * smokeSpread * 1.5, (Math.random() - 0.5) * 0.5 - 2.0, (Math.random() - 0.5) * smokeSpread);
              velocities.setXYZ(i, (Math.random() - 0.5) * 0.025 * smokeSpread, Math.random() * smokeSpeed + 0.01, (Math.random() - 0.5) * 0.025 * smokeSpread);
              lives.setX(i, Math.random() * BASE_SMOKE_LIFESPAN * 0.5 + BASE_SMOKE_LIFESPAN * 0.5);
              alphas.setX(i, 0.25 + Math.random() * 0.35);
              sizes.setX(i, (0.35 + Math.random() * 0.3) * (smokeSpread / 2.0));
              colors.setXYZ(i, currentSmokeColor.r, currentSmokeColor.g, currentSmokeColor.b);
            } else { // Particle is alive, update it
              positions.setXYZ(
                i,
                positions.getX(i) + velocities.getX(i) * delta * 60 + Math.sin(positions.getY(i) * 0.5 + lives.getX(i) * 0.05) * 0.015 * smokeSpread, 
                positions.getY(i) + velocities.getY(i) * delta * 60,
                positions.getZ(i) + velocities.getZ(i) * delta * 60 + Math.cos(positions.getY(i) * 0.5 + lives.getX(i) * 0.05) * 0.015 * smokeSpread
              );
              const lifeRatio = Math.max(0, lives.getX(i) / BASE_SMOKE_LIFESPAN);
              alphas.setX(i, (0.25 + Math.random() * 0.15) * lifeRatio); // Fade out
              sizes.setX(i, ((0.35 + Math.random() * 0.3) * (smokeSpread / 2.0)) * (1 + (1-lifeRatio) * 0.5) ); // Grow then shrink slightly
            }
          }
          positions.needsUpdate = true; velocities.needsUpdate = true; alphas.needsUpdate = true; sizes.needsUpdate = true; lives.needsUpdate = true; colors.needsUpdate = true;
        }

        // Animate Fire
        if (isFireEnabled && fireParticlesRef.current) {
          const geom = fireParticlesRef.current.geometry as THREE.BufferGeometry;
          const positions = geom.getAttribute('position') as THREE.BufferAttribute;
          const velocities = geom.getAttribute('velocity') as THREE.BufferAttribute;
          const alphas = geom.getAttribute('alpha') as THREE.BufferAttribute;
          const sizes = geom.getAttribute('size') as THREE.BufferAttribute;
          const lives = geom.getAttribute('life') as THREE.BufferAttribute;
          const colors = geom.getAttribute('customColor') as THREE.BufferAttribute;
          const currentFireColor = new THREE_Module.Color(fireColor);

          for (let i = 0; i < positions.count; i++) {
            lives.setX(i, lives.getX(i) - delta * 20); 

            if (lives.getX(i) <= 0) {
              positions.setXYZ(i, (Math.random() - 0.5) * fireSpread * 0.7, -2.5 + (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * fireSpread * 0.7);
              velocities.setXYZ(i, (Math.random() - 0.5) * 0.015 * fireSpread, (Math.random() * fireSpeed * 2.0) + fireSpeed * 1.2, (Math.random() - 0.5) * 0.015 * fireSpread);
              lives.setX(i, Math.random() * BASE_FIRE_LIFESPAN * 0.6 + BASE_FIRE_LIFESPAN * 0.4);
              alphas.setX(i, 0.6 + Math.random() * 0.4);
              sizes.setX(i, (0.25 + Math.random() * 0.35) * (fireSpread / 1.5));
              
              const fireHsl = { h: 0, s: 0, l: 0 };
              currentFireColor.getHSL(fireHsl);
              const variedColor = new THREE_Module.Color().setHSL(
                  fireHsl.h + (Math.random() -0.5) * 0.08, 
                  Math.max(0.75, fireHsl.s - Math.random() * 0.15), 
                  Math.min(0.75, fireHsl.l + Math.random() * 0.15)
              );
              colors.setXYZ(i, variedColor.r, variedColor.g, variedColor.b);

            } else {
              positions.setXYZ(
                i,
                positions.getX(i) + velocities.getX(i) * delta * 60,
                positions.getY(i) + velocities.getY(i) * delta * 60,
                positions.getZ(i) + velocities.getZ(i) * delta * 60
              );
              const lifeRatio = Math.max(0, lives.getX(i) / BASE_FIRE_LIFESPAN);
              alphas.setX(i, (0.6 + Math.random() * 0.2) * lifeRatio); // Fade out
              sizes.setX(i, ((0.25 + Math.random() * 0.35) * (fireSpread / 1.5)) * (0.8 + lifeRatio * 0.4) ); // Smaller as it dies
              
              // Transition color based on life (e.g., brighter when young, more reddish/embers when old)
              const fireHsl = { h: 0, s: 0, l: 0 };
              colors.getXYZ(i, fireHsl); // Get current color of particle
              const baseParticleColor = new THREE_Module.Color(colors.getX(i), colors.getY(i), colors.getZ(i));
              baseParticleColor.getHSL(fireHsl);

              const finalColor = new THREE_Module.Color().setHSL(
                  fireHsl.h, // Keep base hue
                  fireHsl.s * (0.5 + lifeRatio * 0.5), // Desaturate a bit as it dies
                  fireHsl.l * (0.4 + lifeRatio * 0.6) // Dim as it dies
              );
              colors.setXYZ(i, finalColor.r, finalColor.g, finalColor.b);
            }
          }
          positions.needsUpdate = true; velocities.needsUpdate = true; alphas.needsUpdate = true; sizes.needsUpdate = true; lives.needsUpdate = true; colors.needsUpdate = true;
        }
      }
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    animate();

    const debouncedResize = debounce(() => {
      if (mountRef.current && rendererRef.current && cameraRef.current) {
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        rendererRef.current.setSize(width, height);
        rendererRef.current.setPixelRatio(window.devicePixelRatio);
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
      }
    }, 250);

    window.addEventListener('resize', debouncedResize);

    return () => {
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      window.removeEventListener('resize', debouncedResize);
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
  // Must re-run if counts or primary simulation parameters change significantly to re-initialize particles
  }, [isThreeLoaded, actualSmokeParticleCount, actualFireParticleCount, onCanvasReady, initParticles]); 


  // Effect to update smoke parameters dynamically (color, speed, spread)
  useEffect(() => {
    if (!isThreeLoaded || !THREE_Module || !smokeParticlesRef.current?.geometry) return;
    const geom = smokeParticlesRef.current.geometry as THREE.BufferGeometry;
    const velocities = geom.getAttribute('velocity') as THREE.BufferAttribute;
    // Color is handled in animation loop for per-particle basis if needed, or globally here for material.
    // For speed/spread, one might re-initialize or adjust velocities.
    // For simplicity, these often require re-initialization for best effect, which is covered by main useEffect.
    // However, direct velocity update is possible:
     for (let i = 0; i < velocities.count; i++) {
        const baseVelY = Math.random() * smokeSpeed + 0.01;
        // Update X and Z based on spread, if desired without full re-init
        const baseVelX = (Math.random() - 0.5) * 0.025 * smokeSpread;
        const baseVelZ = (Math.random() - 0.5) * 0.025 * smokeSpread;
        velocities.setXYZ(i, baseVelX, baseVelY, baseVelZ);
     }
     velocities.needsUpdate = true;
  }, [smokeColor, smokeSpeed, smokeSpread, isThreeLoaded, THREE_Module]);

  // Effect to update fire parameters dynamically
  useEffect(() => {
    if (!isThreeLoaded || !THREE_Module || !fireParticlesRef.current?.geometry) return;
     const geom = fireParticlesRef.current.geometry as THREE.BufferGeometry;
     const velocities = geom.getAttribute('velocity') as THREE.BufferAttribute;
     for (let i = 0; i < velocities.count; i++) {
        const baseVelY = (Math.random() * fireSpeed * 2.0) + fireSpeed * 1.2;
        const baseVelX = (Math.random() - 0.5) * 0.015 * fireSpread;
        const baseVelZ = (Math.random() - 0.5) * 0.015 * fireSpread;
        velocities.setXYZ(i, baseVelX, baseVelY, baseVelZ);
     }
     velocities.needsUpdate = true;
  }, [fireColor, fireSpeed, fireSpread, isThreeLoaded, THREE_Module]);


  // Toggle fire visibility
  useEffect(() => {
    if (fireParticlesRef.current) {
      fireParticlesRef.current.visible = !!isFireEnabled;
    }
  }, [isFireEnabled]);

  // Update background color
  useEffect(() => {
    if (rendererRef.current && THREE_Module) {
      rendererRef.current.setClearColor(new THREE_Module.Color(backgroundColor));
    }
  }, [backgroundColor, THREE_Module, isThreeLoaded]);
  
  // Update play state
  useEffect(() => {
    // Animation loop itself checks `isPlaying`. No specific action needed here
    // unless we want to explicitly pause/resume something in Three.js clock etc.
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
