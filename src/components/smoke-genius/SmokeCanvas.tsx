
"use client";

import type * as THREE from 'three';
import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { debounce } from '@/lib/utils'; 

let THREE_Module: typeof THREE | null = null;

interface SmokeCanvasProps {
  particleCount?: number;
  particleColor?: string;
  particleSpeed?: number;
  particleSpread?: number;
  isPlaying?: boolean;
  isFireEnabled?: boolean; // New prop
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

const MAX_PARTICLES = 10000;
const FIRE_PARTICLE_COUNT_RATIO = 0.75;
const BASE_FIRE_LIFESPAN = 60;
const BASE_SMOKE_LIFESPAN = 150;

const SmokeCanvas: React.FC<SmokeCanvasProps> = ({
  particleCount = 1000,
  particleColor = '#CCCCCC',
  particleSpeed = 0.02,
  particleSpread = 2,
  isPlaying = true,
  isFireEnabled = true, // Default to true
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

  const actualParticleCount = Math.min(particleCount, MAX_PARTICLES);
  const fireParticleCount = Math.floor(actualParticleCount * FIRE_PARTICLE_COUNT_RATIO);

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
    gradient.addColorStop(0, 'rgba(200,200,200,0.6)');
    gradient.addColorStop(0.3, 'rgba(200,200,200,0.4)');
    gradient.addColorStop(1, 'rgba(200,200,200,0)');

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
    gradient.addColorStop(0, 'rgba(255,220,100,1)');
    gradient.addColorStop(0.2, 'rgba(255,165,0,0.8)');
    gradient.addColorStop(0.5, 'rgba(255,69,0,0.5)');
    gradient.addColorStop(1, 'rgba(255,0,0,0)');
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    return new THREE_Module.CanvasTexture(canvas);
  }, [isThreeLoaded]);


  const initParticles = useCallback((
    count: number,
    isFire: boolean,
    baseSpeed: number,
    spread: number
  ) => {
    if (!THREE_Module) return { geometry: null, material: null };

    const geometry = new THREE_Module.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const alphas = new Float32Array(count);
    const sizes = new Float32Array(count);
    const lives = new Float32Array(count);

    const baseColor = new THREE_Module.Color();

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      if (isFire) {
        positions[i3] = (Math.random() - 0.5) * spread * 0.5; 
        positions[i3 + 1] = -2.5 + (Math.random() - 0.5) * 0.2; 
        positions[i3 + 2] = (Math.random() - 0.5) * spread * 0.5;
      } else {
        positions[i3] = (Math.random() - 0.5) * spread * 2;
        positions[i3 + 1] = (Math.random() - 0.5) * 0.5 - 2; 
        positions[i3 + 2] = (Math.random() - 0.5) * spread;
      }
      
      if (isFire) {
        velocities[i3] = (Math.random() - 0.5) * 0.01 * spread * 0.5;
        velocities[i3 + 1] = (Math.random() * baseSpeed * 2.5) + baseSpeed * 1.5; 
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.01 * spread * 0.5;
      } else {
        velocities[i3] = (Math.random() - 0.5) * 0.02 * spread; 
        velocities[i3 + 1] = Math.random() * baseSpeed + 0.01;
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.02 * spread;
      }

      if (isFire) {
        baseColor.setHSL(Math.random() * 0.1 + 0.05, 1, 0.6 + Math.random()*0.2); 
        alphas[i] = 0.7 + Math.random() * 0.3;
        sizes[i] = 0.3 + Math.random() * 0.4; 
        lives[i] = Math.random() * BASE_FIRE_LIFESPAN * 0.5 + BASE_FIRE_LIFESPAN * 0.5;
      } else {
        baseColor.set(particleColor); 
        alphas[i] = 0.3 + Math.random() * 0.4;
        sizes[i] = 0.4 + Math.random() * 0.3; 
        lives[i] = Math.random() * BASE_SMOKE_LIFESPAN * 0.5 + BASE_SMOKE_LIFESPAN * 0.5;
      }
      colors[i3] = baseColor.r;
      colors[i3 + 1] = baseColor.g;
      colors[i3 + 2] = baseColor.b;
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
    material.onBeforeCompile = shader => {
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
        ).replace(
          `gl_PointSize = size;`,
          `gl_PointSize = size * 그냥pixelRatioPlaceholder;`
        ).replace(
          `#include <project_vertex>`,
          `
            vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );
            gl_Position = projectionMatrix * mvPosition;
            gl_PointSize = size * ( 그냥pixelRatioPlaceholder / -mvPosition.z );
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
  }, [THREE_Module, smokeParticleTexture, fireParticleTexture, particleColor]);


  useEffect(() => {
    if (!mountRef.current || !isThreeLoaded || !THREE_Module || !smokeParticleTexture || !fireParticleTexture) return;

    const scene = new THREE_Module.Scene();
    sceneRef.current = scene;
    
    const camera = new THREE_Module.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    camera.position.z = 5;
    cameraRef.current = camera;

    const renderer = new THREE_Module.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    const pixelRatio = window.devicePixelRatio;
    renderer.setPixelRatio(pixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    if (onCanvasReady) {
      onCanvasReady(renderer.domElement);
    }
    
    const { geometry: smokeGeo, material: smokeMat } = initParticles(actualParticleCount, false, particleSpeed, particleSpread);
    if (smokeGeo && smokeMat) {
      if (smokeMat.onBeforeCompile) {
        smokeMat.onBeforeCompile = shader => {
           shader.vertexShader = shader.vertexShader.replace(
            `gl_PointSize = size * 그냥pixelRatioPlaceholder;`,
            `gl_PointSize = size * ${pixelRatio.toFixed(1)};`
          ).replace(
            `gl_PointSize = size * ( 그냥pixelRatioPlaceholder / -mvPosition.z );`,
            `gl_PointSize = size * ( ${pixelRatio.toFixed(1)} / -mvPosition.z );`
          );
        };
      }
      const smokePoints = new THREE_Module.Points(smokeGeo, smokeMat);
      scene.add(smokePoints);
      smokeParticlesRef.current = smokePoints;
    }

    const { geometry: fireGeo, material: fireMat } = initParticles(fireParticleCount, true, particleSpeed * 2, particleSpread * 0.5);
    if (fireGeo && fireMat) {
       if (fireMat.onBeforeCompile) {
        fireMat.onBeforeCompile = shader => {
          shader.vertexShader = shader.vertexShader.replace(
            `gl_PointSize = size * 그냥pixelRatioPlaceholder;`,
            `gl_PointSize = size * ${pixelRatio.toFixed(1)};`
          ).replace(
            `gl_PointSize = size * ( 그냥pixelRatioPlaceholder / -mvPosition.z );`,
            `gl_PointSize = size * ( ${pixelRatio.toFixed(1)} / -mvPosition.z );`
          );
        };
      }
      const firePoints = new THREE_Module.Points(fireGeo, fireMat);
      firePoints.visible = isFireEnabled; // Set initial visibility
      scene.add(firePoints);
      fireParticlesRef.current = firePoints;
    }


    const clock = new THREE_Module.Clock();

    const animate = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
      
      animationFrameIdRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();

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

          for (let i = 0; i < positions.count; i++) {
            lives.setX(i, lives.getX(i) - delta * 15); 

            if (lives.getX(i) <= 0) {
              positions.setXYZ(i, (Math.random() - 0.5) * particleSpread * 2, (Math.random() - 0.5) * 0.5 - 2.5, (Math.random() - 0.5) * particleSpread);
              velocities.setXYZ(i, (Math.random() - 0.5) * 0.02 * particleSpread, Math.random() * particleSpeed + 0.01, (Math.random() - 0.5) * 0.02 * particleSpread);
              lives.setX(i, Math.random() * BASE_SMOKE_LIFESPAN * 0.5 + BASE_SMOKE_LIFESPAN * 0.5);
              alphas.setX(i, 0.3 + Math.random() * 0.4);
              sizes.setX(i, 0.4 + Math.random() * 0.3);
              const baseSmokeColor = new THREE_Module.Color(particleColor);
              colors.setXYZ(i, baseSmokeColor.r, baseSmokeColor.g, baseSmokeColor.b);

            } else {
              positions.setXYZ(
                i,
                positions.getX(i) + velocities.getX(i) * delta * 60 + Math.sin(positions.getY(i) + lives.getX(i) * 0.1) * 0.01, 
                positions.getY(i) + velocities.getY(i) * delta * 60,
                positions.getZ(i) + velocities.getZ(i) * delta * 60 + Math.cos(positions.getY(i) + lives.getX(i) * 0.1) * 0.01 
              );
              alphas.setX(i, (0.3 + Math.random() * 0.4) * (lives.getX(i) / (BASE_SMOKE_LIFESPAN * 0.75)));
              const lifeRatio = lives.getX(i) / BASE_SMOKE_LIFESPAN;
              sizes.setX(i, (0.4 + Math.random() * 0.3) * (1 + Math.sin( (1-lifeRatio) * Math.PI) * 0.5 ) );
            }
          }
          positions.needsUpdate = true;
          velocities.needsUpdate = true; 
          alphas.needsUpdate = true;
          sizes.needsUpdate = true;
          lives.needsUpdate = true;
          colors.needsUpdate = true;
        }

        // Animate Fire (only if enabled)
        if (isFireEnabled && fireParticlesRef.current) {
          const geom = fireParticlesRef.current.geometry as THREE.BufferGeometry;
          const positions = geom.getAttribute('position') as THREE.BufferAttribute;
          const velocities = geom.getAttribute('velocity') as THREE.BufferAttribute;
          const alphas = geom.getAttribute('alpha') as THREE.BufferAttribute;
          const sizes = geom.getAttribute('size') as THREE.BufferAttribute;
          const lives = geom.getAttribute('life') as THREE.BufferAttribute;
          const colors = geom.getAttribute('customColor') as THREE.BufferAttribute;

          const fireBaseSpeed = particleSpeed * 2;
          const fireSpread = particleSpread * 0.5;

          for (let i = 0; i < positions.count; i++) {
            lives.setX(i, lives.getX(i) - delta * 25); 

            if (lives.getX(i) <= 0) {
              positions.setXYZ(i, (Math.random() - 0.5) * fireSpread * 0.5, -2.5 + (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * fireSpread * 0.5);
              velocities.setXYZ(i, (Math.random() - 0.5) * 0.01 * fireSpread, (Math.random() * fireBaseSpeed * 2.5) + fireBaseSpeed * 1.5, (Math.random() - 0.5) * 0.01 * fireSpread);
              lives.setX(i, Math.random() * BASE_FIRE_LIFESPAN * 0.5 + BASE_FIRE_LIFESPAN * 0.5);
              alphas.setX(i, 0.7 + Math.random() * 0.3);
              sizes.setX(i, 0.3 + Math.random() * 0.4);
              const fireC = new THREE_Module.Color();
              fireC.setHSL(Math.random() * 0.1 + 0.05, 1, 0.6 + Math.random()*0.2);
              colors.setXYZ(i, fireC.r, fireC.g, fireC.b);
            } else {
              positions.setXYZ(
                i,
                positions.getX(i) + velocities.getX(i) * delta * 60,
                positions.getY(i) + velocities.getY(i) * delta * 60,
                positions.getZ(i) + velocities.getZ(i) * delta * 60
              );
              const lifeRatio = lives.getX(i) / BASE_FIRE_LIFESPAN;
              alphas.setX(i, (0.7 + Math.random() * 0.3) * lifeRatio);
              sizes.setX(i, (0.3 + Math.random() * 0.4) * (0.8 + Math.random() * 0.4));
              
              const c = new THREE_Module.Color();
              c.setHSL(0.05 + 0.1 * (1 - lifeRatio), 1, 0.5 + 0.2 * lifeRatio);
              colors.setXYZ(i, c.r, c.g, c.b);
            }
          }
          positions.needsUpdate = true;
          alphas.needsUpdate = true;
          sizes.needsUpdate = true;
          lives.needsUpdate = true;
          colors.needsUpdate = true;
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
        const newPixelRatio = window.devicePixelRatio;
        rendererRef.current.setPixelRatio(newPixelRatio);

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
      
      smokeParticlesRef.current?.geometry.dispose();
      (smokeParticlesRef.current?.material as THREE.Material)?.dispose();
      smokeParticleTexture?.dispose();

      fireParticlesRef.current?.geometry.dispose();
      (fireParticlesRef.current?.material as THREE.Material)?.dispose();
      fireParticleTexture?.dispose();
      
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      smokeParticlesRef.current = null;
      fireParticlesRef.current = null;
    };
  }, [isThreeLoaded, actualParticleCount, fireParticleCount, particleSpread, smokeParticleTexture, fireParticleTexture, onCanvasReady, particleSpeed, isPlaying, particleColor, initParticles, isFireEnabled]); // Added isFireEnabled to dependencies


  useEffect(() => {
    if (!isThreeLoaded || !THREE_Module || !smokeParticlesRef.current) return;
    // This effect is primarily for the material's base color if not using vertexColors,
    // but since we ARE using vertexColors, the `particleColor` is used in `initParticles` 
    // and during particle reset logic.
  }, [particleColor, isThreeLoaded, THREE_Module]);


   useEffect(() => {
    if (!isThreeLoaded || !smokeParticlesRef.current || !smokeParticlesRef.current.geometry) return;
    
    const velocitiesAttribute = smokeParticlesRef.current.geometry.getAttribute('velocity') as THREE.BufferAttribute;
    if (velocitiesAttribute) {
      for (let i = 0; i < velocitiesAttribute.count; i++) {
          const currentXVel = velocitiesAttribute.getX(i);
          const currentZVel = velocitiesAttribute.getZ(i);
          const newYVel = Math.random() * particleSpeed + 0.01;
          velocitiesAttribute.setXYZ(i, currentXVel, newYVel, currentZVel);
      }
      velocitiesAttribute.needsUpdate = true;
    }
  }, [particleSpeed, isThreeLoaded, actualParticleCount]);

  // Effect to toggle fire visibility
  useEffect(() => {
    if (fireParticlesRef.current) {
      fireParticlesRef.current.visible = !!isFireEnabled;
    }
  }, [isFireEnabled]);

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
