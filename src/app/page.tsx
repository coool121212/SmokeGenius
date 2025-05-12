"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import SmokeCanvas from '@/components/smoke-genius/SmokeCanvas';
import ControlsPanel from '@/components/smoke-genius/ControlsPanel';
import type { SimulationPreset, BlendMode, ParticleSource } from '@/components/smoke-genius/types';
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

const presets: SimulationPreset[] = [
  {
    name: "Default Realistic Smoke",
    description: "Realistic, billowing white smoke against a dark background.",
    isSmokeEnabled: true,
    smokeDensity: 6500,
    smokeBaseColor: "#FFFFFF",
    smokeAccentColor: "#E0E0E0",
    smokeSpeed: 0.015,
    smokeSpread: 1.0,
    smokeBlendMode: "Normal",
    smokeSource: "Bottom",
    smokeOpacity: 0.6,
    smokeTurbulence: 1.2,
    smokeDissipation: 0.2, 
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
  },
  {
    name: "Gentle Campfire",
    description: "A calm campfire with light, greyish smoke.",
    isSmokeEnabled: true,
    smokeDensity: 1500,
    smokeBaseColor: "#A9A9A9",
    smokeAccentColor: "#808080",
    smokeSpeed: 0.015,
    smokeSpread: 2.2,
    smokeBlendMode: "Normal",
    smokeSource: "Center",
    smokeOpacity: 0.6,
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
  },
  {
    name: "Volcanic Eruption",
    description: "Intense, dark smoke and fiery lava-like effects.",
    isSmokeEnabled: true,
    smokeDensity: 7000,
    smokeBaseColor: "#333333",
    smokeAccentColor: "#1A1A1A",
    smokeSpeed: 0.05,
    smokeSpread: 4.5,
    smokeBlendMode: "Normal",
    smokeSource: "Bottom",
    smokeOpacity: 0.9,
    smokeTurbulence: 2.5,
    smokeDissipation: 0.1,
    smokeBuoyancy: 0.01,
    isFireEnabled: true,
    fireBaseColor: "#FF4500",
    fireAccentColor: "#FF6347",
    fireDensity: 4500,
    fireSpeed: 0.06,
    fireSpread: 3.5,
    fireParticleSource: "Bottom",
    fireBlendMode: "Additive",
    fireOpacity: 0.95,
    fireTurbulence: 3,
    backgroundColor: "#201008",
    windDirectionX: 0.1,
    windStrength: 0.01,
  },
  {
    name: "Mystic Fog",
    description: "Dense, ethereal light grey fog, no fire.",
    isSmokeEnabled: true,
    smokeDensity: 5000,
    smokeBaseColor: "#E0E0E0",
    smokeAccentColor: "#B0B0B0",
    smokeSpeed: 0.01,
    smokeSpread: 4.0,
    smokeBlendMode: "Normal",
    smokeSource: "Bottom",
    smokeOpacity: 0.5,
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
  },
    {
    name: "Cyberpunk Smog",
    description: "Dense, neon-accented smoke in a dark city.",
    isSmokeEnabled: true,
    smokeDensity: 6000,
    smokeBaseColor: "#8A2BE2",
    smokeAccentColor: "#4B0082",
    smokeSpeed: 0.025,
    smokeSpread: 3.5,
    smokeBlendMode: "Additive",
    smokeSource: "Center",
    smokeOpacity: 0.8,
    smokeTurbulence: 1.5,
    smokeDissipation: 0.25,
    smokeBuoyancy: 0.003,
    isFireEnabled: true,
    fireBaseColor: "#FF00FF",
    fireAccentColor: "#DA70D6",
    fireDensity: 500,
    fireSpeed: 0.04,
    fireSpread: 1.2,
    fireParticleSource: "Center",
    fireBlendMode: "Additive",
    fireOpacity: 0.6,
    fireTurbulence: 0.8,
    backgroundColor: "#0A0A1E",
    windDirectionX: 0,
    windStrength: 0,
  },
];


export default function SmokeGeniusPage() {
  // Smoke States
  const [isSmokeEnabled, setIsSmokeEnabled] = useState(presets[0].isSmokeEnabled);
  const [smokeDensity, setSmokeDensity] = useState(presets[0].smokeDensity);
  const [smokeBaseColor, setSmokeBaseColor] = useState(presets[0].smokeBaseColor);
  const [smokeAccentColor, setSmokeAccentColor] = useState(presets[0].smokeAccentColor);
  const [smokeSpeed, setSmokeSpeed] = useState(presets[0].smokeSpeed);
  const [smokeSpread, setSmokeSpread] = useState(presets[0].smokeSpread);
  const [smokeBlendMode, setSmokeBlendMode] = useState<BlendMode>(presets[0].smokeBlendMode);
  const [smokeSource, setSmokeSource] = useState<ParticleSource>(presets[0].smokeSource);
  const [smokeOpacity, setSmokeOpacity] = useState(presets[0].smokeOpacity);
  const [smokeTurbulence, setSmokeTurbulence] = useState(presets[0].smokeTurbulence);
  const [smokeDissipation, setSmokeDissipation] = useState(presets[0].smokeDissipation);
  const [smokeBuoyancy, setSmokeBuoyancy] = useState(presets[0].smokeBuoyancy);


  // Fire States
  const [isFireEnabled, setIsFireEnabled] = useState(presets[0].isFireEnabled);
  const [fireBaseColor, setFireBaseColor] = useState(presets[0].fireBaseColor);
  const [fireAccentColor, setFireAccentColor] = useState(presets[0].fireAccentColor);
  const [fireDensity, setFireDensity] = useState(presets[0].fireDensity);
  const [fireSpeed, setFireSpeed] = useState(presets[0].fireSpeed);
  const [fireSpread, setFireSpread] = useState(presets[0].fireSpread);
  const [fireParticleSource, setFireParticleSource] = useState<ParticleSource>(presets[0].fireParticleSource);
  const [fireBlendMode, setFireBlendMode] = useState<BlendMode>(presets[0].fireBlendMode);
  const [fireOpacity, setFireOpacity] = useState(presets[0].fireOpacity);
  const [fireTurbulence, setFireTurbulence] = useState(presets[0].fireTurbulence);


  // Scene State
  const [backgroundColor, setBackgroundColor] = useState(presets[0].backgroundColor);
  const [windDirectionX, setWindDirectionX] = useState(presets[0].windDirectionX);
  const [windStrength, setWindStrength] = useState(presets[0].windStrength);


  // Playback & Recording States
  const [isPlaying, setIsPlaying] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { toast } = useToast();

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
      const stream = canvasRef.current.captureStream(30);
      const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm;codecs=h264', 'video/mp4'];
      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      if (!selectedMimeType) {
        toast({ title: "Error", description: "No supported video codec found for recording.", variant: "destructive" });
        return;
      }

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: selectedMimeType });

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
        toast({ title: "Recording Complete", description: `Video (${selectedMimeType.split('/')[1].split(';')[0]}) is ready.` });
      };

      mediaRecorderRef.current.onerror = (event) => {
          let message = "An unknown recording error occurred.";
          if (event instanceof Event && (event as any).error instanceof DOMException) {
            message = `Recording error: ${(event as any).error.name} - ${(event as any).error.message}`;
          } else if (event instanceof ErrorEvent) {
              message = `Recording error: ${event.message}`;
          }
          toast({ title: "Recording Error", description: message, variant: "destructive" });
          setIsRecording(false);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordedVideoUrl(null);
      toast({ title: "Recording Started", description: "Capturing smoke simulation..." });

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
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const handleDownloadRecording = useCallback(() => {
    if (recordedVideoUrl && mediaRecorderRef.current) {
      const a = document.createElement('a');
      a.href = recordedVideoUrl;
      const mimeType = mediaRecorderRef.current.mimeType;
      const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
      a.download = `smoke_simulation.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast({ title: "Download Started", description: `smoke_simulation.${extension}` });
    } else {
      toast({ title: "No Recording", description: "No video available to download.", variant: "destructive" });
    }
  }, [recordedVideoUrl, toast]);

  const applyPreset = useCallback((preset: SimulationPreset) => {
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

    setBackgroundColor(preset.backgroundColor);
    setWindDirectionX(preset.windDirectionX);
    setWindStrength(preset.windStrength);

    toast({ title: "Preset Applied", description: `"${preset.name}" preset loaded.` });
  }, [toast]);

  useEffect(() => {
    document.body.style.backgroundColor = backgroundColor;
    let currentUrl = recordedVideoUrl;
    return () => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [recordedVideoUrl, backgroundColor]);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden text-foreground bg-background">
        <ControlsPanel
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

          backgroundColor={backgroundColor}
          setBackgroundColor={setBackgroundColor}
          windDirectionX={windDirectionX}
          setWindDirectionX={setWindDirectionX}
          windStrength={windStrength}
          setWindStrength={setWindStrength}

          isRecording={isRecording}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          onDownloadRecording={handleDownloadRecording}
          recordedVideoUrl={recordedVideoUrl}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          mediaRecorderRef={mediaRecorderRef}
          presets={presets}
          onApplyPreset={applyPreset}
        />
        <SidebarInset>
          <main className="flex-grow relative h-full w-full">
            <SmokeCanvas
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

              backgroundColor={backgroundColor}
              windDirectionX={windDirectionX}
              windStrength={windStrength}

              isPlaying={isPlaying}
              onCanvasReady={handleCanvasReady}
            />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

