
"use client";

import type { Dispatch, SetStateAction } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  CircleDot,
  StopCircle,
  Download,
  Cloud, // Layers changed to Cloud for smoke density
  Palette,
  Zap,
  MoveHorizontal,
  Play,
  Pause,
  Flame, // Icon for fire
  Settings2, // Icon for general settings
  Video // Icon for recording
} from "lucide-react";

interface ControlsPanelProps {
  particleCount: number;
  setParticleCount: Dispatch<SetStateAction<number>>;
  particleColor: string;
  setParticleColor: Dispatch<SetStateAction<string>>;
  particleSpeed: number;
  setParticleSpeed: Dispatch<SetStateAction<number>>;
  particleSpread: number;
  setParticleSpread: Dispatch<SetStateAction<number>>;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onDownloadRecording: () => void;
  recordedVideoUrl: string | null;
  isPlaying: boolean;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
  isFireEnabled: boolean;
  setIsFireEnabled: Dispatch<SetStateAction<boolean>>;
}

const ControlsPanel: React.FC<ControlsPanelProps> = ({
  particleCount, setParticleCount,
  particleColor, setParticleColor,
  particleSpeed, setParticleSpeed,
  particleSpread, setParticleSpread,
  isRecording, onStartRecording, onStopRecording, onDownloadRecording, recordedVideoUrl,
  isPlaying, setIsPlaying,
  isFireEnabled, setIsFireEnabled
}) => {
  return (
    <Card className="fixed bottom-0 left-0 right-0 m-2 md:m-4 shadow-2xl border-border bg-card/95 backdrop-blur-sm z-50 max-w-3xl mx-auto">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-lg flex items-center"><Settings2 className="mr-2 h-5 w-5 text-primary" /> Simulation Controls</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
          
          {/* Column 1: Core Particle Settings */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Cloud className="w-5 h-5 text-accent" />
                <Label htmlFor="particleCount" className="font-semibold text-sm">Smoke Density</Label>
              </div>
              <Slider
                id="particleCount"
                min={100} max={8000} step={100}
                value={[particleCount]}
                onValueChange={(value) => setParticleCount(value[0])}
                aria-label="Smoke particle density"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-5 h-5 text-accent" />
                <Label htmlFor="particleSpeed" className="font-semibold text-sm">Smoke Speed</Label>
              </div>
              <Slider
                id="particleSpeed"
                min={0.005} max={0.1} step={0.005}
                value={[particleSpeed]}
                onValueChange={(value) => setParticleSpeed(value[0])}
                aria-label="Smoke particle speed"
              />
            </div>
          </div>

          {/* Column 2: Appearance & Toggles */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                  <Palette className="w-5 h-5 text-accent" />
                  <Label htmlFor="particleColor" className="font-semibold text-sm">Smoke Color</Label>
              </div>
              <Input
                  id="particleColor"
                  type="color"
                  value={particleColor}
                  onChange={(e) => setParticleColor(e.target.value)}
                  className="w-full h-10 p-1"
                  aria-label="Smoke particle color"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MoveHorizontal className="w-5 h-5 text-accent" />
                <Label htmlFor="particleSpread" className="font-semibold text-sm">Smoke Spread</Label>
              </div>
              <Slider
                id="particleSpread"
                min={0.5} max={5} step={0.1}
                value={[particleSpread]}
                onValueChange={(value) => setParticleSpread(value[0])}
                aria-label="Smoke particle spread"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-accent" />
                <Label htmlFor="fireToggle" className="font-semibold text-sm">Enable Fire</Label>
              </div>
              <Switch
                id="fireToggle"
                checked={isFireEnabled}
                onCheckedChange={setIsFireEnabled}
                aria-label="Toggle fire simulation"
              />
            </div>
          </div>
          
          {/* Column 3: Playback & Recording */}
          <div className="space-y-3 flex flex-col">
            <Button onClick={() => setIsPlaying(!isPlaying)} variant="outline" className="w-full">
              {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
              {isPlaying ? 'Pause Simulation' : 'Play Simulation'}
            </Button>
            <Separator className="my-1" />
             <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-1">
                <Video className="w-5 h-5 text-primary" /> Recording
            </div>
            {!isRecording ? (
              <Button onClick={onStartRecording} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                <CircleDot className="mr-2 h-4 w-4" /> Start Recording
              </Button>
            ) : (
              <Button onClick={onStopRecording} variant="destructive" className="w-full">
                <StopCircle className="mr-2 h-4 w-4" /> Stop Recording
              </Button>
            )}
            {recordedVideoUrl && (
              <Button 
                onClick={onDownloadRecording} 
                variant="outline" 
                className="w-full"
                disabled={!mediaRecorderRef.current} // Ensure mediaRecorderRef is available
              >
                <Download className="mr-2 h-4 w-4" /> 
                Download {mediaRecorderRef.current?.mimeType.includes('mp4') ? 'MP4' : 'WebM'}
              </Button>
            )}
          </div>
        </div>
        {isFireEnabled && (
             <p className="mt-3 text-center text-xs text-muted-foreground">
                Fire simulation intensity and behavior adapt to smoke settings.
            </p>
        )}
      </CardContent>
    </Card>
  );
};

// Making mediaRecorderRef accessible for the download button text
// This is a bit of a hack, typically you wouldn't expose refs like this directly.
// For this specific case (displaying mime type in button), it's okay.
const mediaRecorderRef = { current: null as MediaRecorder | null };


export default ControlsPanel;
