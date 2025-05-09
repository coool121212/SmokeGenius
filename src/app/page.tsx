
"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import SmokeCanvas from '@/components/smoke-genius/SmokeCanvas';
import ControlsPanel from '@/components/smoke-genius/ControlsPanel';
import { useToast } from "@/hooks/use-toast";

export default function SmokeGeniusPage() {
  const [particleCount, setParticleCount] = useState(1000);
  const [particleColor, setParticleColor] = useState("#CCCCCC");
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
      // Try common codecs, vp9 might not be supported everywhere
      const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
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
        toast({ title: "Recording Complete", description: "Video is ready for download." });
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
  }, [toast]); // canvasRef, mediaRecorderRef, recordedChunksRef are stable refs. setIsRecording, setRecordedVideoUrl are stable.

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false); // Ensure isRecording is set to false
  }, []); // mediaRecorderRef is stable. setIsRecording is stable.

  const handleDownloadRecording = useCallback(() => {
    if (recordedVideoUrl) {
      const a = document.createElement('a');
      a.href = recordedVideoUrl;
      a.download = 'smoke_simulation.webm';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast({ title: "Download Started", description: "smoke_simulation.webm" });
    } else {
      toast({ title: "No Recording", description: "No video available to download.", variant: "destructive" });
    }
  }, [recordedVideoUrl, toast]);
  
  // Clean up object URL when component unmounts or URL changes
  useEffect(() => {
    let currentUrl = recordedVideoUrl;
    return () => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [recordedVideoUrl]);

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
