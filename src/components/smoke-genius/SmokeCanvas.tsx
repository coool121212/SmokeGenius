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
  const smokeParticlesRef = useRef<THREE.Points | null>(null);
  const fireParticlesRef = useRef<THREE.Points | null>(null);
  const animationFrameRef = useRef<number>();
  const mousePositionRef = useRef({ x: 0, y: 0 });

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

    // Text canvas setup for particle positioning - increased dimensions
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 2048; // Doubled for better resolution
    textCanvas.height = 1024; // Doubled to prevent vertical cutoff
    textCanvasRef.current = textCanvas;
    textContextRef.current = textCanvas.getContext('2d');

    // Mouse tracking
    const handleMouseMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mousePositionRef.current = {
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
      };
    };

    renderer.domElement.addEventListener('mousemove', handleMouseMove);

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
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.dispose();
    };
  }, [backgroundColor, onCanvasReady]);

  const createParticles = useCallback(() => {
    if (!sceneRef.current || !textContextRef.current || !textCanvasRef.current) return;

    // Clear existing particles
    if (smokeParticlesRef.current) {
      sceneRef.current.remove(smokeParticlesRef.current);
    }
    if (fireParticlesRef.current) {
      sceneRef.current.remove(fireParticlesRef.current);
    }

    // Setup text rendering if text is provided
    if (particleText) {
      const ctx = textContextRef.current;
      const canvas = textCanvasRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Calculate font size with better scaling and padding
      const maxFontSize = Math.min(
        canvas.width / (particleText.length * 0.8), // More generous width scaling
        canvas.height * 0.4 // Use 40% of canvas height for font size
      );
      const fontSize = Math.max(maxFontSize, 60); // Minimum font size of 60px
      ctx.font = `bold ${fontSize}px Arial`;
      
      // Center text with proper vertical positioning
      const x = canvas.width / 2;
      const y = canvas.height / 2;
      ctx.fillText(particleText, x, y);
    }

    // Create smoke particles
    if (isSmokeEnabled) {
      const smokeGeometry = new THREE.BufferGeometry();
      const smokeVertices = new Float32Array(smokeDensity * 3);
      const smokeColors = new Float32Array(smokeDensity * 3);

      for (let i = 0; i < smokeDensity; i++) {
        let x, y, z;
        if (particleText && textContextRef.current) {
          // Position particles based on text
          const pos = getRandomTextPosition();
          // Better scaling for text positioning
          x = (pos.x - textCanvasRef.current!.width / 2) * 0.005; // Reduced scaling
          y = (pos.y - textCanvasRef.current!.height / 2) * 0.005; // Reduced scaling
          z = (Math.random() - 0.5) * 0.1;
        } else {
          // Use source-based positioning
          const sourcePos = getSourcePosition(smokeSource);
          x = sourcePos.x + (Math.random() - 0.5) * smokeSpread * 0.5;
          y = sourcePos.y + Math.random() * smokeSpread * 0.2;
          z = sourcePos.z + (Math.random() - 0.5) * smokeSpread * 0.5;
        }

        smokeVertices[i * 3] = x;
        smokeVertices[i * 3 + 1] = y;
        smokeVertices[i * 3 + 2] = z;

        // Color interpolation
        const color = new THREE.Color(smokeBaseColor);
        const accentColor = new THREE.Color(smokeAccentColor);
        color.lerp(accentColor, Math.random());

        smokeColors[i * 3] = color.r;
        smokeColors[i * 3 + 1] = color.g;
        smokeColors[i * 3 + 2] = color.b;
      }

      smokeGeometry.setAttribute('position', new THREE.BufferAttribute(smokeVertices, 3));
      smokeGeometry.setAttribute('color', new THREE.BufferAttribute(smokeColors, 3));

      // Material setup with proper blending
      const smokeMaterial = new THREE.PointsMaterial({
        size: 0.05 * smokeSpread,
        vertexColors: true,
        transparent: true,
        opacity: smokeOpacity,
        blending: getBlendingMode(smokeBlendMode),
      });

      // Create particle system
      const smokeParticles = new THREE.Points(smokeGeometry, smokeMaterial);
      sceneRef.current.add(smokeParticles);
      smokeParticlesRef.current = smokeParticles;
    }

    // Create fire particles
    if (isFireEnabled) {
      const fireGeometry = new THREE.BufferGeometry();
      const fireVertices = new Float32Array(fireDensity * 3);
      const fireColors = new Float32Array(fireDensity * 3);

      for (let i = 0; i < fireDensity; i++) {
        let x, y, z;
        if (particleText && textContextRef.current) {
          // Position particles based on text
          const pos = getRandomTextPosition();
          x = (pos.x - textCanvasRef.current!.width / 2) * 0.005;
          y = (pos.y - textCanvasRef.current!.height / 2) * 0.005;
          z = (Math.random() - 0.5) * 0.1;
        } else {
          // Use source-based positioning
          const sourcePos = getSourcePosition(fireParticleSource);
          x = sourcePos.x + (Math.random() - 0.5) * fireSpread * 0.5;
          y = sourcePos.y + Math.random() * fireSpread * 0.2;
          z = sourcePos.z + (Math.random() - 0.5) * fireSpread * 0.5;
        }

        fireVertices[i * 3] = x;
        fireVertices[i * 3 + 1] = y;
        fireVertices[i * 3 + 2] = z;

        // Color interpolation
        const color = new THREE.Color(fireBaseColor);
        const accentColor = new THREE.Color(fireAccentColor);
        color.lerp(accentColor, Math.random());

        fireColors[i * 3] = color.r;
        fireColors[i * 3 + 1] = color.g;
        fireColors[i * 3 + 2] = color.b;
      }

      fireGeometry.setAttribute('position', new THREE.BufferAttribute(fireVertices, 3));
      fireGeometry.setAttribute('color', new THREE.BufferAttribute(fireColors, 3));

      // Material setup
      const fireMaterial = new THREE.PointsMaterial({
        size: 0.03 * fireSpread,
        vertexColors: true,
        transparent: true,
        opacity: fireOpacity,
        blending: getBlendingMode(fireBlendMode),
      });

      // Create particle system
      const fireParticles = new THREE.Points(fireGeometry, fireMaterial);
      sceneRef.current.add(fireParticles);
      fireParticlesRef.current = fireParticles;
    }
  }, [
    particleText, isSmokeEnabled, smokeDensity, smokeSpread, smokeBaseColor, smokeAccentColor, 
    smokeOpacity, smokeBlendMode, smokeSource, isFireEnabled, fireDensity, fireSpread, 
    fireBaseColor, fireAccentColor, fireOpacity, fireBlendMode, fireParticleSource
  ]);

  const getRandomTextPosition = useCallback(() => {
    if (!textContextRef.current || !textCanvasRef.current) {
      return { x: 0, y: 0 };
    }

    const canvas = textCanvasRef.current;
    const ctx = textContextRef.current;
    let x, y;
    let attempts = 0;
    const maxAttempts = 100;

    // Keep trying until we find a white pixel or reach max attempts
    do {
      x = Math.floor(Math.random() * canvas.width);
      y = Math.floor(Math.random() * canvas.height);
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      if (pixel[0] > 128) break; // Found a white-ish pixel
      attempts++;
    } while (attempts < maxAttempts);

    return { x, y };
  }, []);

  const getSourcePosition = useCallback((source: ParticleSource) => {
    switch (source) {
      case 'Center':
        return { x: 0, y: 0, z: 0 };
      case 'Bottom':
        return { x: 0, y: -2, z: 0 };
      case 'Mouse':
        return { 
          x: mousePositionRef.current.x * 2, 
          y: mousePositionRef.current.y * 2, 
          z: 0 
        };
      default:
        return { x: 0, y: -2, z: 0 };
    }
  }, []);

  const getBlendingMode = useCallback((mode: BlendMode) => {
    switch (mode) {
      case 'Additive':
        return THREE.AdditiveBlending;
      case 'Subtractive':
        return THREE.SubtractiveBlending;
      case 'Multiply':
        return THREE.MultiplyBlending;
      default:
        return THREE.NormalBlending;
    }
  }, []);

  const animate = useCallback(() => {
    if (!isPlaying) return;

    // Update smoke particles
    if (smokeParticlesRef.current && !persistTextShape) {
      const positions = smokeParticlesRef.current.geometry.attributes.position;
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
              vertices[i] = (pos.x - textCanvasRef.current!.width / 2) * 0.005;
              vertices[i + 1] = (pos.y - textCanvasRef.current!.height / 2) * 0.005;
              vertices[i + 2] = (Math.random() - 0.5) * 0.1;
            } else {
              const sourcePos = getSourcePosition(smokeSource);
              vertices[i] = sourcePos.x + (Math.random() - 0.5) * smokeSpread * 0.5;
              vertices[i + 1] = sourcePos.y;
              vertices[i + 2] = sourcePos.z + (Math.random() - 0.5) * smokeSpread * 0.5;
            }
          }
        }
      }

      positions.needsUpdate = true;
    }

    // Update fire particles
    if (fireParticlesRef.current && !persistTextShape) {
      const positions = fireParticlesRef.current.geometry.attributes.position;
      const vertices = positions.array as Float32Array;

      for (let i = 0; i < vertices.length; i += 3) {
        if (!particleText || !persistTextShape) {
          // Update particle positions
          vertices[i] += (Math.random() - 0.5) * fireTurbulence * 0.01 + windDirectionX * windStrength;
          vertices[i + 1] += fireSpeed + Math.random() * 0.01;
          vertices[i + 2] += (Math.random() - 0.5) * fireTurbulence * 0.01;

          // Reset particles that go too high
          if (vertices[i + 1] > fireSpread) {
            if (particleText) {
              const pos = getRandomTextPosition();
              vertices[i] = (pos.x - textCanvasRef.current!.width / 2) * 0.005;
              vertices[i + 1] = (pos.y - textCanvasRef.current!.height / 2) * 0.005;
              vertices[i + 2] = (Math.random() - 0.5) * 0.1;
            } else {
              const sourcePos = getSourcePosition(fireParticleSource);
              vertices[i] = sourcePos.x + (Math.random() - 0.5) * fireSpread * 0.5;
              vertices[i + 1] = sourcePos.y;
              vertices[i + 2] = sourcePos.z + (Math.random() - 0.5) * fireSpread * 0.5;
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
    smokeSource,
    fireTurbulence,
    fireSpeed,
    fireSpread,
    fireParticleSource,
    getRandomTextPosition,
    getSourcePosition,
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

  // Update background color
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setClearColor(backgroundColor);
    }
  }, [backgroundColor]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default SmokeCanvas;