import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import type { BlendMode, ParticleSource } from './types';

interface SmokeCanvasProps {
  // Smoke Props
  isSmokeEnabled: boolean;
  smokeDensity: number;
  smokeBaseColor: string;
  smokeAccentColor: string;
  smokeSpeed: number;
  smokeSpread: number;
  smokeBlendMode: BlendMode;
  smokeSource: ParticleSource;
  smokeOpacity: number;
  smokeTurbulence: number;
  smokeDissipation: number;
  smokeBuoyancy: number;
  particleText: string;
  persistTextShape: boolean;

  // Fire Props
  isFireEnabled: boolean;
  fireBaseColor: string;
  fireAccentColor: string;
  fireDensity: number;
  fireSpeed: number;
  fireSpread: number;
  fireParticleSource: ParticleSource;
  fireBlendMode: BlendMode;
  fireOpacity: number;
  fireTurbulence: number;

  // Scene Props
  backgroundColor: string;
  windDirectionX: number;
  windStrength: number;

  // Playback & Canvas Ready
  isPlaying: boolean;
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
}

const SmokeCanvas: React.FC<SmokeCanvasProps> = ({
  // Smoke Props
  isSmokeEnabled,
  smokeDensity,
  smokeBaseColor,
  smokeAccentColor,
  smokeSpeed,
  smokeSpread,
  smokeBlendMode,
  smokeSource,
  smokeOpacity,
  smokeTurbulence,
  smokeDissipation,
  smokeBuoyancy,
  particleText,
  persistTextShape,

  // Fire Props
  isFireEnabled,
  fireBaseColor,
  fireAccentColor,
  fireDensity,
  fireSpeed,
  fireSpread,
  fireParticleSource,
  fireBlendMode,
  fireOpacity,
  fireTurbulence,

  // Scene Props
  backgroundColor,
  windDirectionX,
  windStrength,

  // Playback & Canvas Ready
  isPlaying,
  onCanvasReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const textCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const textContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const animationFrameRef = useRef<number>();

  const initScene = useCallback(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setClearColor(backgroundColor);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    onCanvasReady(renderer.domElement);

    // Text canvas setup for particle positioning
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 1024; // Increased for better text resolution
    textCanvas.height = 512; // Increased height to prevent vertical cutoff
    textCanvasRef.current = textCanvas;
    textContextRef.current = textCanvas.getContext('2d');

    // Initial particles setup
    createParticles();

    // Start animation
    animate();

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      renderer.dispose();
    };
  }, [backgroundColor, onCanvasReady]);

  const createParticles = useCallback(() => {
    if (!sceneRef.current || !textContextRef.current || !textCanvasRef.current) return;

    // Clear existing particles
    if (particlesRef.current) {
      sceneRef.current.remove(particlesRef.current);
    }

    // Setup text rendering if text is provided
    if (particleText) {
      const ctx = textContextRef.current;
      const canvas = textCanvasRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Calculate font size based on canvas width and text length
      const fontSize = Math.min(canvas.width / (particleText.length * 1.5), canvas.height / 2);
      ctx.font = `bold ${fontSize}px Arial`;
      
      // Position text in center with vertical offset
      ctx.fillText(particleText, canvas.width / 2, canvas.height / 2);
    }

    // Create particle geometry
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array(smokeDensity * 3);
    const colors = new Float32Array(smokeDensity * 3);

    for (let i = 0; i < smokeDensity; i++) {
      let x, y, z;
      if (particleText && textContextRef.current) {
        // Position particles based on text
        const pos = getRandomTextPosition();
        x = (pos.x - textCanvasRef.current!.width / 2) * 0.01;
        y = (pos.y - textCanvasRef.current!.height / 2) * 0.01;
        z = 0;
      } else {
        // Random distribution
        x = (Math.random() - 0.5) * smokeSpread;
        y = Math.random() * smokeSpread;
        z = (Math.random() - 0.5) * smokeSpread;
      }

      vertices[i * 3] = x;
      vertices[i * 3 + 1] = y;
      vertices[i * 3 + 2] = z;

      // Color interpolation
      const color = new THREE.Color(smokeBaseColor);
      const accentColor = new THREE.Color(smokeAccentColor);
      color.lerp(accentColor, Math.random());

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Material setup
    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: smokeOpacity,
      blending: THREE.AdditiveBlending,
    });

    // Create particle system
    const particles = new THREE.Points(geometry, material);
    sceneRef.current.add(particles);
    particlesRef.current = particles;
  }, [particleText, smokeDensity, smokeSpread, smokeBaseColor, smokeAccentColor, smokeOpacity]);

  const getRandomTextPosition = useCallback(() => {
    if (!textContextRef.current || !textCanvasRef.current) {
      return { x: 0, y: 0 };
    }

    const canvas = textCanvasRef.current;
    const ctx = textContextRef.current;
    let x, y;

    // Keep trying until we find a white pixel
    do {
      x = Math.floor(Math.random() * canvas.width);
      y = Math.floor(Math.random() * canvas.height);
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      if (pixel[0] > 0) break; // Found a white pixel
    } while (true);

    return { x, y };
  }, []);

  const animate = useCallback(() => {
    if (!isPlaying) return;

    if (particlesRef.current && !persistTextShape) {
      const positions = particlesRef.current.geometry.attributes.position;
      const vertices = positions.array as Float32Array;

      for (let i = 0; i < vertices.length; i += 3) {
        if (!particleText || !persistTextShape) {
          // Update particle positions
          vertices[i] += (Math.random() - 0.5) * smokeTurbulence * 0.01 + windDirectionX * windStrength;
          vertices[i + 1] += smokeSpeed + Math.random() * smokeBuoyancy;
          vertices[i + 2] += (Math.random() - 0.5) * smokeTurbulence * 0.01;

          // Reset particles that go too high
          if (vertices[i + 1] > smokeSpread) {
            if (particleText) {
              const pos = getRandomTextPosition();
              vertices[i] = (pos.x - textCanvasRef.current!.width / 2) * 0.01;
              vertices[i + 1] = (pos.y - textCanvasRef.current!.height / 2) * 0.01;
              vertices[i + 2] = 0;
            } else {
              vertices[i] = (Math.random() - 0.5) * smokeSpread;
              vertices[i + 1] = -smokeSpread / 2;
              vertices[i + 2] = (Math.random() - 0.5) * smokeSpread;
            }
          }
        }
      }

      positions.needsUpdate = true;
    }

    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [
    isPlaying,
    particleText,
    persistTextShape,
    smokeTurbulence,
    windDirectionX,
    windStrength,
    smokeSpeed,
    smokeBuoyancy,
    smokeSpread,
    getRandomTextPosition,
  ]);

  // Initialize scene
  useEffect(() => {
    const cleanup = initScene();
    return cleanup;
  }, [initScene]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update particles when text or persistence changes
  useEffect(() => {
    createParticles();
  }, [createParticles, particleText, persistTextShape]);

  // Handle play/pause
  useEffect(() => {
    if (isPlaying) {
      animate();
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [isPlaying, animate]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default SmokeCanvas;