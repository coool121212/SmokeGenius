"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { SimulationPreset, BlendMode, ParticleSource } from '@/components/smoke-genius/types';
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

// Dynamically import components to avoid SSR issues
const SmokeCanvas = dynamic(() => import('@/components/smoke-genius/SmokeCanvas'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-background animate-pulse" />
});

const ControlsPanel = dynamic(() => import('@/components/smoke-genius/ControlsPanel'), {
  ssr: false,
  loading: () => <div className="w-80 bg-card animate-pulse" />
});

const presets: SimulationPreset[] = [
  {
    name: "Default Realistic Smoke",
    description: "Realistic, billowing white smoke against a dark background.",
    isSmokeEnabled: true,
    smokeDensity: 6500, // Increased default density
    smokeBaseColor: "#FFFFFF",
    smokeAccentColor: "#E0E0E0",
    smokeSpeed: 0.015,
    smokeSpread: 1.5, // Increased default spread for softer look
    smokeBlendMode: "Normal",
    smokeSource: "Bottom",
    smokeOpacity: 0.5, // Slightly reduced opacity for softness
    smokeTurbulence: 1.2,
    smokeDissipation: 0.15, // Slightly slower dissipation
    smokeBuoyancy: 0.005,
    isFireEnabled: false,
    fireBaseColor: "#FFA500",
    fireAccentColor: "#FFD700",
    fireDensity: 0,
    fireSpeed: 0.03,
    fireSpread: 1.5,
    fireParticleSource: "Bottom",
    fireBlendMode: "Additive",
    fireOpacity: 0,
    fireTurbulence: 1.2,
    backgroundColor: "#000000",
    windDirectionX: 0,
    windStrength: 0,
    particleText: "",
    persistTextShape: false, // Add persistTextShape to presets
  },
  {
    name: "Gentle Campfire",
    description: "A calm campfire with light, greyish smoke.",
    isSmokeEnabled: true,
    smokeDensity: 1500,
    smokeBaseColor: "#A9A9A9",
    smokeAccentColor: "#808080",
    smokeSpeed: 0.015,
    smokeSpread: 2.5, // Increased spread
    smokeBlendMode: "Normal",
    smokeSource: "Center",
    smokeOpacity: 0.55,
    smokeTurbulence: 0.8,
    smokeDissipation: 0.15,
    smokeBuoyancy: 0.008,
    isFireEnabled: true,
    fireBaseColor: "#FF8C00",
    fireAccentColor: "#FFB347",
    fireDensity: 800,
    fireSpeed: 0.02,
    fireSpread: 1.5,
    fireParticleSource: "Bottom",
    fireBlendMode: "Additive",
    fireOpacity: 0.7,
    fireTurbulence: 1,
    backgroundColor: "#101010",
    windDirectionX: 0.05,
    windStrength: 0.005,
     particleText: "",
     persistTextShape: false,
  },
  {
    name: "Volcanic Eruption",
    description: "Intense, dark smoke and fiery lava-like effects.",
    isSmokeEnabled: true,
    smokeDensity: 7500, // Increased density
    smokeBaseColor: "#333333",
    smokeAccentColor: "#1A1A1A",
    smokeSpeed: 0.05,
    smokeSpread: 4.5,
    smokeBlendMode: "Normal",
    smokeSource: "Bottom",
    smokeOpacity: 0.8, // Slightly reduced opacity
    smokeTurbulence: 2.5,
    smokeDissipation: 0.1,
    smokeBuoyancy: 0.01,
    isFireEnabled: true,
    fireBaseColor: "#FF4500",
    fireAccentColor: "#FF6347",
    fireDensity: 3000,
    fireSpeed: 0.06,
    fireSpread: 3.5,
    fireParticleSource: "Bottom",
    fireBlendMode: "Additive",
    fireOpacity: 0.95,
    fireTurbulence: 3,
    backgroundColor: "#201008",
    windDirectionX: 0.1,
    windStrength: 0.01,
     particleText: "",
     persistTextShape: false,
  },
  {
    name: "Mystic Fog",
    description: "Dense, ethereal light grey fog, no fire.",
    isSmokeEnabled: true,
    smokeDensity: 6000, // Increased density
    smokeBaseColor: "#E0E0E0",
    smokeAccentColor: "#B0B0B0",
    smokeSpeed: 0.01,
    smokeSpread: 4.0,
    smokeBlendMode: "Normal",
    smokeSource: "Bottom",
    smokeOpacity: 0.4, // Reduced opacity for fog
    smokeTurbulence: 0.5,
    smokeDissipation: 0.05,
    smokeBuoyancy: 0.002,
    isFireEnabled: false,
    fireBaseColor: "#FFA500",
    fireAccentColor: "#FFD700",
    fireDensity: 0,
    fireSpeed: 0.01,
    fireSpread: 1.0,
    fireParticleSource: "Bottom",
    fireBlendMode: "Additive",
    fireOpacity: 0,
    fireTurbulence: 0,
    backgroundColor: "#2C3E50",
    windDirectionX: -0.02,
    windStrength: 0.003,
     particleText: "",
     persistTextShape: false,
  },
  {
    name: "Cyberpunk Smog",
    description: "Dense, neon-accented smoke in a dark city.",
    isSmokeEnabled: true,
    smokeDensity: 7000, // Increased density
    smokeBaseColor: "#8A2BE2", // Purple
    smokeAccentColor: "#00FFFF", // Cyan accent
    smokeSpeed: 0.025,
    smokeSpread: 3.5,
    smokeBlendMode: "Additive", // Neon glow
    smokeSource: "Center",
    smokeOpacity: 0.7, // Adjusted opacity
    smokeTurbulence: 1.5,
    smokeDissipation: 0.25,
    smokeBuoyancy: 0.003,
    isFireEnabled: true,
    fireBaseColor: "#FF00FF", // Magenta fire
    fireAccentColor: "#DA70D6", // Orchid accent
    fireDensity: 500,
    fireSpeed: 0.04,
    fireSpread: 1.2,
    fireParticleSource: "Center",
    fireBlendMode: "Additive",
    fireOpacity: 0.6,
    fireTurbulence: 0.8,
    backgroundColor: "#0A0A1E", // Very dark blue
    windDirectionX: 0,
    windStrength: 0,
     particleText: "",
     persistTextShape: false,
  },
   {
    name: "Text Shape Demo",
    description: "Particles forming the word 'SMOKE'.",
    particleText: "SMOKE", // Add text here
    isSmokeEnabled: true,
    smokeDensity: 4000, // Keep lower for text visibility
    smokeBaseColor: "#FFFFFF",
    smokeAccentColor: "#CCCCCC",
    smokeSpeed: 0.005,
    smokeSpread: 0.5,
    smokeBlendMode: "Normal",
    smokeSource: "Bottom", // Overridden by text
    smokeOpacity: 0.7,
    smokeTurbulence: 0.3,
    smokeDissipation: 0.1,
    smokeBuoyancy: 0.001,
    isFireEnabled: false,
    fireBaseColor: "#FFA500",
    fireAccentColor: "#FFD700",
    fireDensity: 0,
    fireSpeed: 0.01,
    fireSpread: 1.0,
    fireParticleSource: "Bottom",
    fireBlendMode: "Additive",
    fireOpacity: 0,
    fireTurbulence: 0,
    backgroundColor: "#111111",
    windDirectionX: 0,
    windStrength: 0,
    persistTextShape: true, // Example: Persist the text shape
  },
];

export default function SmokeGeniusPage() {
  // --- State Initialization ---
  const [currentPreset, setCurrentPreset] = useState<SimulationPreset>(presets[0]);
  const [isClient, setIsClient] = useState(false);

  // Smoke States (Initialize from the first preset)
  const [isSmokeEnabled, setIsSmokeEnabled] = useState(currentPreset.isSmokeEnabled);
  const [smokeDensity, setSmokeDensity] = useState(currentPreset.smokeDensity);
  const [smokeBaseColor, setSmokeBaseColor] = useState(currentPreset.smokeBaseColor);
  const [smokeAccentColor, setSmokeAccentColor] = useState(currentPreset.smokeAccentColor);
  const [smokeSpeed, setSmokeSpeed] = useState(currentPreset.smokeSpeed);
  const [smokeSpread, setSmokeSpread] = useState(currentPreset.smokeSpread);
  const [smokeBlendMode, setSmokeBlendMode] = useState<BlendMode>(currentPreset.smokeBlendMode);
  const [smokeSource, setSmokeSource] = useState<ParticleSource>(currentPreset.smokeSource);
  const [smokeOpacity, setSmokeOpacity] = useState(currentPreset.smokeOpacity);
  const [smokeTurbulence, setSmokeTurbulence] = useState(currentPreset.smokeTurbulence);
  const [smokeDissipation, setSmokeDissipation] = useState(currentPreset.smokeDissipation);
  const [smokeBuoyancy, setSmokeBuoyancy] = useState(currentPreset.smokeBuoyancy);
  const [particleText, setParticleText] = useState(currentPreset.particleText || ""); // New state for text
  const [persistTextShape, setPersistTextShape] = useState(currentPreset.persistTextShape ?? false); // New state for persisting text

  // Fire States
  const [isFireEnabled, setIsFireEnabled] = useState(currentPreset.isFireEnabled);
  const [fireBaseColor, setFireBaseColor] = useState(currentPreset.fireBaseColor);
  const [fireAccentColor, setFireAccentColor] = useState(currentPreset.fireAccentColor);
  const [fireDensity, setFireDensity] = useState(currentPreset.fireDensity);
  const [fireSpeed, setFireSpeed] = useState(currentPreset.fireSpeed);
  const [fireSpread, setFireSpread] = useState(currentPreset.fireSpread);
  const [fireParticleSource, setFireParticleSource] = useState<ParticleSource>(currentPreset.fireParticleSource);
  const [fireBlendMode, setFireBlendMode] = useState<BlendMode>(currentPreset.fireBlendMode);
  const [fireOpacity, setFireOpacity] = useState(currentPreset.fireOpacity);
  const [fireTurbulence, setFireTurbulence] = useState(currentPreset.fireTurbulence);

  // Scene State
  const [backgroundColor, setBackgroundColor] = useState(currentPreset.backgroundColor);
  const [windDirectionX, setWindDirectionX] = useState(currentPreset.windDirectionX);
  const [windStrength, setWindStrength] = useState(currentPreset.windStrength);

  // Playback & Recording States
  const [isPlaying, setIsPlaying] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { toast } = useToast();

  // Client-side only rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // --- Callbacks ---
  const handleCanvasReady = useCallback((canvasElement: HTMLCanvasElement) => {
    canvasRef.current = canvasElement;
  }, []);

  const handleStartRecording = useCallback(() => {
    if (!canvasRef.current) {
      toast({ title: "Error", description: "Canvas not ready for recording.", variant: "destructive" });
      return;
    }
    if (!('MediaRecorder' in window)) {
      toast({ title: "Error", description: "MediaRecorder API not supported in this browser.", variant: "destructive" });
      return;
    }

    try {
      const stream = canvasRef.current.captureStream(30); // 30 FPS
      const mimeTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=h264,opus', 'video/mp4', 'video/webm'];
      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      if (!selectedMimeType) {
        toast({ title: "Error", description: "No supported video codec found for recording.", variant: "destructive" });
        console.error("Supported MIME types:", mimeTypes.filter(mt => MediaRecorder.isTypeSupported(mt)));
        return;
      }
      console.log("Using MIME type:", selectedMimeType);

      const videoBitsPerSecond = 2500000; // 2.5 Mbps

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: videoBitsPerSecond
      });

      recordedChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: selectedMimeType });
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
        console.log(`Recording stopped. Blob size: ${blob.size}, URL: ${url}`);
        toast({ title: "Recording Complete", description: `Video (${selectedMimeType.split(';')[0]}) is ready.` });
      };

      mediaRecorderRef.current.onerror = (event: Event) => {
        let message = "An unknown recording error occurred.";
        if (event instanceof (window as any).MediaRecorderErrorEvent) {
           message = `Recording error: ${event.error.name} - ${event.error.message}`;
        } else if (event instanceof ErrorEvent) { // Generic ErrorEvent
           message = `Recording error: ${event.message}`;
        }
        console.error("MediaRecorder error:", event);
        toast({ title: "Recording Error", description: message, variant: "destructive" });
        setIsRecording(false);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordedVideoUrl(null);
      toast({ title: "Recording Started", description: "Capturing simulation..." });

    } catch (error) {
      console.error("Error starting recording:", error);
      let message = "Failed to start recording.";
      if (error instanceof Error) {
        message = `Failed to start recording: ${error.message}`;
      }
      toast({ title: "Recording Error", description: message, variant: "destructive" });
      setIsRecording(false);
    }
  }, [toast]);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
       try {
           mediaRecorderRef.current.stop();
       } catch (error) {
           console.error("Error stopping recording:", error);
           toast({ title: "Error", description: "Failed to stop recording.", variant: "destructive" });
       }
    } else {
        console.warn("Stop recording called but recorder is not active.");
    }
    setIsRecording(false);
  }, [toast]);

  const handleDownloadRecording = useCallback(() => {
    if (recordedVideoUrl && mediaRecorderRef.current) {
      const a = document.createElement('a');
      a.href = recordedVideoUrl;
      const mimeType = mediaRecorderRef.current.mimeType || 'video/webm';
      let extension = 'webm';
      if (mimeType.includes('mp4')) {
        extension = 'mp4';
      } else if (mimeType.includes('webm')) {
        extension = 'webm';
      }

      a.download = `smoke_simulation_${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast({ title: "Download Started", description: `Downloading ${a.download}` });
    } else {
      toast({ title: "No Recording", description: "No video available to download.", variant: "destructive" });
    }
  }, [recordedVideoUrl, toast]);

  const applyPreset = useCallback((preset: SimulationPreset) => {
    setCurrentPreset(preset);

    // Apply Smoke settings
    setIsSmokeEnabled(preset.isSmokeEnabled);
    setSmokeDensity(preset.smokeDensity);
    setSmokeBaseColor(preset.smokeBaseColor);
    setSmokeAccentColor(preset.smokeAccentColor);
    setSmokeSpeed(preset.smokeSpeed);
    setSmokeSpread(preset.smokeSpread);
    setSmokeBlendMode(preset.smokeBlendMode);
    setSmokeSource(preset.smokeSource);
    setSmokeOpacity(preset.smokeOpacity);
    setSmokeTurbulence(preset.smokeTurbulence);
    setSmokeDissipation(preset.smokeDissipation);
    setSmokeBuoyancy(preset.smokeBuoyancy);
    setParticleText(preset.particleText || "");
    setPersistTextShape(preset.persistTextShape ?? false); // Apply persist setting

    // Apply Fire settings
    setIsFireEnabled(preset.isFireEnabled);
    setFireBaseColor(preset.fireBaseColor);
    setFireAccentColor(preset.fireAccentColor);
    setFireDensity(preset.fireDensity);
    setFireSpeed(preset.fireSpeed);
    setFireSpread(preset.fireSpread);
    setFireParticleSource(preset.fireParticleSource);
    setFireBlendMode(preset.fireBlendMode);
    setFireOpacity(preset.fireOpacity);
    setFireTurbulence(preset.fireTurbulence);

    // Apply Scene settings
    setBackgroundColor(preset.backgroundColor);
    setWindDirectionX(preset.windDirectionX);
    setWindStrength(preset.windStrength);

    toast({ title: "Preset Applied", description: `"${preset.name}" preset loaded.` });
  }, [toast]);

  // --- Effects ---
  useEffect(() => {
    // Apply the default preset when the component mounts
     applyPreset(presets[0]);
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once on mount

  useEffect(() => {
    document.body.style.backgroundColor = backgroundColor;
  }, [backgroundColor]);

   useEffect(() => {
    // Cleanup recorded video URL when component unmounts or URL changes
    let currentUrl = recordedVideoUrl;
    return () => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [recordedVideoUrl]);

  // Don't render until client-side
  if (!isClient) {
    return (
      <div className="flex h-screen w-screen bg-background">
        <div className="w-80 bg-card animate-pulse" />
        <div className="flex-1 bg-background animate-pulse" />
      </div>
    );
  }

  // --- Render ---
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden text-foreground bg-background">
        <ControlsPanel
          // Smoke Props
          isSmokeEnabled={isSmokeEnabled}
          setIsSmokeEnabled={setIsSmokeEnabled}
          smokeDensity={smokeDensity}
          setSmokeDensity={setSmokeDensity}
          smokeBaseColor={smokeBaseColor}
          setSmokeBaseColor={setSmokeBaseColor}
          smokeAccentColor={smokeAccentColor}
          setSmokeAccentColor={setSmokeAccentColor}
          smokeSpeed={smokeSpeed}
          setSmokeSpeed={setSmokeSpeed}
          smokeSpread={smokeSpread}
          setSmokeSpread={setSmokeSpread}
          smokeBlendMode={smokeBlendMode}
          setSmokeBlendMode={setSmokeBlendMode}
          smokeSource={smokeSource}
          setSmokeSource={setSmokeSource}
          smokeOpacity={smokeOpacity}
          setSmokeOpacity={setSmokeOpacity}
          smokeTurbulence={smokeTurbulence}
          setSmokeTurbulence={setSmokeTurbulence}
          smokeDissipation={smokeDissipation}
          setSmokeDissipation={setSmokeDissipation}
          smokeBuoyancy={smokeBuoyancy}
          setSmokeBuoyancy={setSmokeBuoyancy}
          particleText={particleText}
          setParticleText={setParticleText}
          persistTextShape={persistTextShape} // Pass state
          setPersistTextShape={setPersistTextShape} // Pass setter

          // Fire Props
          isFireEnabled={isFireEnabled}
          setIsFireEnabled={setIsFireEnabled}
          fireBaseColor={fireBaseColor}
          setFireBaseColor={setFireBaseColor}
          fireAccentColor={fireAccentColor}
          setFireAccentColor={setFireAccentColor}
          fireDensity={fireDensity}
          setFireDensity={setFireDensity}
          fireSpeed={fireSpeed}
          setFireSpeed={setFireSpeed}
          fireSpread={fireSpread}
          setFireSpread={setFireSpread}
          fireParticleSource={fireParticleSource}
          setFireParticleSource={setFireParticleSource}
          fireBlendMode={fireBlendMode}
          setFireBlendMode={setFireBlendMode}
          fireOpacity={fireOpacity}
          setFireOpacity={setFireOpacity}
          fireTurbulence={fireTurbulence}
          setFireTurbulence={setFireTurbulence}

          // Scene Props
          backgroundColor={backgroundColor}
          setBackgroundColor={setBackgroundColor}
          windDirectionX={windDirectionX}
          setWindDirectionX={setWindDirectionX}
          windStrength={windStrength}
          setWindStrength={setWindStrength}

          // Media Props
          isRecording={isRecording}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          onDownloadRecording={handleDownloadRecording}
          recordedVideoUrl={recordedVideoUrl}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          mediaRecorderRef={mediaRecorderRef}

          // Presets
          presets={presets}
          onApplyPreset={applyPreset}
        />
        <SidebarInset>
          <main className="flex-grow relative h-full w-full">
            <SmokeCanvas
              // Smoke Props
              isSmokeEnabled={isSmokeEnabled}
              smokeDensity={smokeDensity}
              smokeBaseColor={smokeBaseColor}
              smokeAccentColor={smokeAccentColor}
              smokeSpeed={smokeSpeed}
              smokeSpread={smokeSpread}
              smokeBlendMode={smokeBlendMode}
              smokeSource={smokeSource}
              smokeOpacity={smokeOpacity}
              smokeTurbulence={smokeTurbulence}
              smokeDissipation={smokeDissipation}
              smokeBuoyancy={smokeBuoyancy}
              particleText={particleText}
              persistTextShape={persistTextShape} // Pass state

              // Fire Props
              isFireEnabled={isFireEnabled}
              fireBaseColor={fireBaseColor}
              fireAccentColor={fireAccentColor}
              fireDensity={fireDensity}
              fireSpeed={fireSpeed}
              fireSpread={fireSpread}
              fireParticleSource={fireParticleSource}
              fireBlendMode={fireBlendMode}
              fireOpacity={fireOpacity}
              fireTurbulence={fireTurbulence}

              // Scene Props
              backgroundColor={backgroundColor}
              windDirectionX={windDirectionX}
              windStrength={windStrength}

              // Playback & Canvas Ready
              isPlaying={isPlaying}
              onCanvasReady={handleCanvasReady}
            />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}