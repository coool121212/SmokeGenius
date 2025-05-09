
"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import SmokeCanvas from '@/components/smoke-genius/SmokeCanvas';
import ControlsPanel from '@/components/smoke-genius/ControlsPanel';
import type { SimulationPreset, BlendMode, ParticleSource } from '@/components/smoke-genius/types';
import { useToast } from "@/hooks/use-toast";

const presets: SimulationPreset[] = [
  {
    name: "Default",
    description: "The standard starting simulation settings.",
    isSmokeEnabled: true,
    smokeDensity: 2000,
    smokeColor: "#F5F5F5",
    smokeSpeed: 0.02,
    smokeSpread: 2.5,
    smokeBlendMode: "Normal",
    smokeSource: "Center",
    isFireEnabled: true,
    fireColor: "#FFA500",
    fireDensity: 1000,
    fireSpeed: 0.03,
    fireSpread: 1.5,
    backgroundColor: "#000000",
  },
  {
    name: "Gentle Campfire",
    description: "A calm campfire with light, greyish smoke.",
    isSmokeEnabled: true,
    smokeDensity: 1500,
    smokeColor: "#A9A9A9",
    smokeSpeed: 0.015,
    smokeSpread: 1.8,
    smokeBlendMode: "Normal",
    smokeSource: "Center",
    isFireEnabled: true,
    fireColor: "#FF8C00",
    fireDensity: 800,
    fireSpeed: 0.02,
    fireSpread: 1.2,
    backgroundColor: "#101010",
  },
  {
    name: "Volcanic Eruption",
    description: "Intense, dark smoke and fiery lava-like effects.",
    isSmokeEnabled: true,
    smokeDensity: 7000,
    smokeColor: "#333333",
    smokeSpeed: 0.05,
    smokeSpread: 4.0,
    smokeBlendMode: "Normal",
    smokeSource: "Bottom",
    isFireEnabled: true,
    fireColor: "#FF4500",
    fireDensity: 4500,
    fireSpeed: 0.06,
    fireSpread: 3.0,
    backgroundColor: "#201008",
  },
  {
    name: "Mystic Fog",
    description: "Dense, ethereal light grey fog, no fire.",
    isSmokeEnabled: true,
    smokeDensity: 5000,
    smokeColor: "#E0E0E0",
    smokeSpeed: 0.01,
    smokeSpread: 3.5,
    smokeBlendMode: "Additive",
    smokeSource: "Bottom",
    isFireEnabled: false,
    fireColor: "#FFA500", 
    fireDensity: 0,
    fireSpeed: 0.01,
    fireSpread: 1.0,
    backgroundColor: "#2C3E50",
  },
    {
    name: "Cyberpunk Smog",
    description: "Dense, neon-accented smoke in a dark city.",
    isSmokeEnabled: true,
    smokeDensity: 6000,
    smokeColor: "#8A2BE2", 
    smokeSpeed: 0.025,
    smokeSpread: 3.0,
    smokeBlendMode: "Additive",
    smokeSource: "Center",
    isFireEnabled: true,
    fireColor: "#FF00FF", 
    fireDensity: 500,
    fireSpeed: 0.04,
    fireSpread: 1.0,
    backgroundColor: "#0A0A1E", 
  },
];


export default function SmokeGeniusPage() {
  // Smoke States
  const [isSmokeEnabled, setIsSmokeEnabled] = useState(true);
  const [smokeDensity, setSmokeDensity] = useState(2000);
  const [smokeColor, setSmokeColor] = useState("#F5F5F5");
  const [smokeSpeed, setSmokeSpeed] = useState(0.02);
  const [smokeSpread, setSmokeSpread] = useState(2.5);
  const [smokeBlendMode, setSmokeBlendMode] = useState<BlendMode>("Normal");
  const [smokeSource, setSmokeSource] = useState<ParticleSource>("Center");

  // Fire States
  const [isFireEnabled, setIsFireEnabled] = useState(true);
  const [fireColor, setFireColor] = useState("#FFA500");
  const [fireDensity, setFireDensity] = useState(1000);
  const [fireSpeed, setFireSpeed] = useState(0.03);
  const [fireSpread, setFireSpread] = useState(1.5);

  // Scene State
  const [backgroundColor, setBackgroundColor] = useState("#000000");

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
    setSmokeColor(preset.smokeColor);
    setSmokeSpeed(preset.smokeSpeed);
    setSmokeSpread(preset.smokeSpread);
    setSmokeBlendMode(preset.smokeBlendMode);
    setSmokeSource(preset.smokeSource);

    setIsFireEnabled(preset.isFireEnabled);
    setFireColor(preset.fireColor);
    setFireDensity(preset.fireDensity);
    setFireSpeed(preset.fireSpeed);
    setFireSpread(preset.fireSpread);

    setBackgroundColor(preset.backgroundColor);
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
    <div className="flex flex-col h-screen w-screen overflow-hidden text-foreground">
      <main className="flex-grow relative">
        <SmokeCanvas
          isSmokeEnabled={isSmokeEnabled}
          smokeDensity={smokeDensity}
          smokeColor={smokeColor}
          smokeSpeed={smokeSpeed}
          smokeSpread={smokeSpread}
          smokeBlendMode={smokeBlendMode}
          smokeSource={smokeSource}
          isFireEnabled={isFireEnabled}
          fireColor={fireColor}
          fireDensity={fireDensity}
          fireSpeed={fireSpeed}
          fireSpread={fireSpread}
          backgroundColor={backgroundColor}
          isPlaying={isPlaying}
          onCanvasReady={handleCanvasReady}
        />
      </main>
      <ControlsPanel
        isSmokeEnabled={isSmokeEnabled}
        setIsSmokeEnabled={setIsSmokeEnabled}
        smokeDensity={smokeDensity}
        setSmokeDensity={setSmokeDensity}
        smokeColor={smokeColor}
        setSmokeColor={setSmokeColor}
        smokeSpeed={smokeSpeed}
        setSmokeSpeed={setSmokeSpeed}
        smokeSpread={smokeSpread}
        setSmokeSpread={setSmokeSpread}
        smokeBlendMode={smokeBlendMode}
        setSmokeBlendMode={setSmokeBlendMode}
        smokeSource={smokeSource}
        setSmokeSource={setSmokeSource}
        
        isFireEnabled={isFireEnabled}
        setIsFireEnabled={setIsFireEnabled}
        fireColor={fireColor}
        setFireColor={setFireColor}
        fireDensity={fireDensity}
        setFireDensity={setFireDensity}
        fireSpeed={fireSpeed}
        setFireSpeed={setFireSpeed}
        fireSpread={fireSpread}
        setFireSpread={setFireSpread}

        backgroundColor={backgroundColor}
        setBackgroundColor={setBackgroundColor}

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
    </div>
  );
}

