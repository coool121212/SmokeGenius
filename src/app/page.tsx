
"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import SmokeCanvas from '@/components/smoke-genius/SmokeCanvas';
import ControlsPanel from '@/components/smoke-genius/ControlsPanel';
import { useToast } from "@/hooks/use-toast";

export default function SmokeGeniusPage() {
  // Smoke States
  const [isSmokeEnabled, setIsSmokeEnabled] = useState(true);
  const [smokeDensity, setSmokeDensity] = useState(2000);
  const [smokeColor, setSmokeColor] = useState("#F5F5F5"); // Default to whitish smoke
  const [smokeSpeed, setSmokeSpeed] = useState(0.02);
  const [smokeSpread, setSmokeSpread] = useState(2.5);

  // Fire States
  const [isFireEnabled, setIsFireEnabled] = useState(true);
  const [fireColor, setFireColor] = useState("#FFA500"); // Default orange for fire
  const [fireDensity, setFireDensity] = useState(1000); // Default fire particle count
  const [fireSpeed, setFireSpeed] = useState(0.03); // Default fire speed
  const [fireSpread, setFireSpread] = useState(1.5); // Default fire spread

  // Scene State
  const [backgroundColor, setBackgroundColor] = useState("#000000"); // Default background to black

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
  
  useEffect(() => {
    // Apply background color to the body for full page effect
    document.body.style.backgroundColor = backgroundColor;
    // Cleanup
    let currentUrl = recordedVideoUrl;
    return () => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
      // Reset body style if component unmounts, or set to a default if needed
      // document.body.style.backgroundColor = ''; // Or your app's default
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
        mediaRecorderRef={mediaRecorderRef} // Pass ref for download button text
      />
    </div>
  );
}

