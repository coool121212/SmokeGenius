"use client";

import React, { useState, useRef, useCallback } from 'react';
import SmokeCanvas from '@/components/smoke-genius/SmokeCanvas';
import ControlsPanel from '@/components/smoke-genius/ControlsPanel';
import { useToast } from "@/hooks/use-toast";

export default function SmokeGeniusPage() {
  const [particleCount, setParticleCount] = useState(1000);
  const [particleColor, setParticleColor] = useState("#CCCCCC"); // Default to a light gray smoke
  const [particleSpeed, setParticleSpeed] = useState(0.02);
  const [particleSpread, setParticleSpread] = useState(2);
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

  const handleStartRecording = () => {
    if (!canvasRef.current) {
      toast({ title: "Error", description: "Canvas not ready for recording.", variant: "destructive" });
      return;
    }
    if (!('MediaRecorder' in window)) {
       toast({ title: "Error", description: "MediaRecorder API not supported in this browser.", variant: "destructive" });
       return;
    }

    const stream = canvasRef.current.captureStream(30); // 30 FPS
    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    
    recordedChunksRef.current = [];

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedVideoUrl(url);
      toast({ title: "Recording Complete", description: "Video is ready for download." });
    };
    
    mediaRecorderRef.current.onerror = (event) => {
        let message = "Recording error.";
        if (event instanceof ErrorEvent) {
            message = `Recording error: ${event.message}`;
        } else if (typeof (event as any).error?.name === 'string') {
            message = `Recording error: ${(event as any).error.name}`;
        }
        toast({ title: "Recording Error", description: message, variant: "destructive" });
        setIsRecording(false);
    };


    mediaRecorderRef.current.start();
    setIsRecording(true);
    setRecordedVideoUrl(null); // Clear previous recording
    toast({ title: "Recording Started", description: "Capturing smoke simulation..." });
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleDownloadRecording = () => {
    if (recordedVideoUrl) {
      const a = document.createElement('a');
      a.href = recordedVideoUrl;
      a.download = 'smoke_simulation.webm';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // URL.revokeObjectURL(recordedVideoUrl); // Optionally revoke if not needed anymore
      toast({ title: "Download Started", description: "smoke_simulation.webm" });
    } else {
      toast({ title: "No Recording", description: "No video available to download.", variant: "destructive" });
    }
  };
  
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
      <main className="flex-grow relative">
        <SmokeCanvas
          particleCount={particleCount}
          particleColor={particleColor}
          particleSpeed={particleSpeed}
          particleSpread={particleSpread}
          isPlaying={isPlaying}
          onCanvasReady={handleCanvasReady}
        />
      </main>
      <ControlsPanel
        particleCount={particleCount}
        setParticleCount={setParticleCount}
        particleColor={particleColor}
        setParticleColor={setParticleColor}
        particleSpeed={particleSpeed}
        setParticleSpeed={setParticleSpeed}
        particleSpread={particleSpread}
        setParticleSpread={setParticleSpread}
        isRecording={isRecording}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onDownloadRecording={handleDownloadRecording}
        recordedVideoUrl={recordedVideoUrl}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
      />
    </div>
  );
}