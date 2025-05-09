
"use client";

import type * as THREE from 'three';
import React, { useEffect, useRef, useMemo, useState } from 'react';
import { debounce } from '@/lib/utils'; // Import debounce

// Import THREE dynamically if it's large or only used client-side
let THREE_Module: typeof THREE | null = null;

interface SmokeCanvasProps {
  particleCount?: number;
  particleColor?: string;
  particleSpeed?: number;
  particleSpread?: number;
  isPlaying?: boolean;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

const SmokeCanvas: React.FC<SmokeCanvasProps> = ({
  particleCount = 500,
  particleColor = '#FFFFFF',
  particleSpeed = 0.02,
  particleSpread = 2,
  isPlaying = true,
  onCanvasReady,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  
  const [isThreeLoaded, setIsThreeLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    import('three').then(three => {
      THREE_Module = three;
      setIsThreeLoaded(true);
      setLoadError(null); // Clear any previous error
    }).catch(err => {
      console.error("Failed to load Three.js", err);
      setLoadError("Failed to load 3D rendering library. Please try refreshing the page.");
      setIsThreeLoaded(false); // Ensure this is false on error
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
    gradient.addColorStop(0, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    return new THREE_Module.CanvasTexture(canvas);
  }, [isThreeLoaded]);

  useEffect(() => {
    if (!mountRef.current || !isThreeLoaded || !THREE_Module || !smokeParticleTexture) return;

    const scene = new THREE_Module.Scene();
    sceneRef.current = scene;
    
    const camera = new THREE_Module.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    camera.position.z = 5;
    cameraRef.current = camera;

    const renderer = new THREE_Module.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    if (onCanvasReady) {
      onCanvasReady(renderer.domElement);
    }
    
    const geometry = new THREE_Module.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * particleSpread * 2;
      positions[i + 1] = (Math.random() - 0.5) * 0.5 - 2;
      positions[i + 2] = (Math.random() - 0.5) * particleSpread;
      
      velocities[i] = (Math.random() - 0.5) * 0.01 * particleSpread;
      velocities[i+1] = Math.random() * particleSpeed + 0.01;
      velocities[i+2] = (Math.random() - 0.5) * 0.01 * particleSpread;
    }
    geometry.setAttribute('position', new THREE_Module.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE_Module.BufferAttribute(velocities, 3));

    const material = new THREE_Module.PointsMaterial({
      size: 0.5,
      map: smokeParticleTexture,
      blending: THREE_Module.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      color: particleColor,
      opacity: 0.7,
    });

    const particles = new THREE_Module.Points(geometry, material);
    scene.add(particles);
    particlesRef.current = particles;

    const animate = () => {
      if (!particlesRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) return;
      
      animationFrameIdRef.current = requestAnimationFrame(animate);

      if (isPlaying) {
        const positionsAttribute = particlesRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
        const velocitiesAttribute = particlesRef.current.geometry.getAttribute('velocity') as THREE.BufferAttribute;

        for (let i = 0; i < positionsAttribute.count; i++) {
          positionsAttribute.setY(i, positionsAttribute.getY(i) + velocitiesAttribute.getY(i));
          positionsAttribute.setX(i, positionsAttribute.getX(i) + velocitiesAttribute.getX(i));
          positionsAttribute.setZ(i, positionsAttribute.getZ(i) + velocitiesAttribute.getZ(i));
          
          if (positionsAttribute.getY(i) > 5) {
            positionsAttribute.setY(i, (Math.random() - 0.5) * 0.5 - 2);
            positionsAttribute.setX(i, (Math.random() - 0.5) * particleSpread * 2);
            positionsAttribute.setZ(i, (Math.random() - 0.5) * particleSpread);
          }
        }
        positionsAttribute.needsUpdate = true;
      }
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    animate();

    const debouncedResize = debounce(() => {
      if (mountRef.current && rendererRef.current && cameraRef.current) {
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        rendererRef.current.setSize(width, height);
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
      particlesRef.current?.geometry.dispose();
      (particlesRef.current?.material as THREE.Material)?.dispose();
      smokeParticleTexture?.dispose();
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      particlesRef.current = null;
    };
  }, [isThreeLoaded, particleCount, particleSpread, smokeParticleTexture, onCanvasReady, particleSpeed, isPlaying, particleColor]);

  useEffect(() => {
    if (!isThreeLoaded || !THREE_Module) return;
    if (particlesRef.current && particlesRef.current.material) {
      (particlesRef.current.material as THREE.PointsMaterial).color.set(new THREE_Module.Color(particleColor));
    }
  }, [particleColor, isThreeLoaded]);

   useEffect(() => {
    if (!isThreeLoaded || !particlesRef.current || !particlesRef.current.geometry) return;
    
    const velocitiesAttribute = particlesRef.current.geometry.getAttribute('velocity') as THREE.BufferAttribute;
    if (velocitiesAttribute) {
      for (let i = 0; i < velocitiesAttribute.count; i++) {
          const currentXVel = velocitiesAttribute.getX(i);
          // To make speed only affect upward motion, we re-calculate y-velocity based on particleSpeed
          // and keep x/z velocities relative to their initial random spread.
          // If particleSpeed should influence x/z velocities too, this logic would need adjustment.
          // For now, assuming particleSpeed mostly controls upward movement strength.
          const initialBaseYVelocity = Math.random() * particleSpeed + 0.01; // Recalculate Y based on new speed
          const currentZVel = velocitiesAttribute.getZ(i);

          velocitiesAttribute.setXYZ(
              i,
              currentXVel, 
              initialBaseYVelocity,
              currentZVel
          );
      }
      velocitiesAttribute.needsUpdate = true;
    }
  }, [particleSpeed, isThreeLoaded]); // Ensure effect re-runs if particleSpeed or isThreeLoaded changes

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
        <p className="text-lg">Loading 3D Smoke Simulation...</p>
      </div>
    );
  }

  return <div ref={mountRef} className="w-full h-full" role="img" aria-label="Smoke simulation canvas" data-ai-hint="smoke particles" />;
};

export default SmokeCanvas;
