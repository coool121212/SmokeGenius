"use client";

import type { Dispatch, SetStateAction } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CircleDot,
  StopCircle,
  Download,
  Layers,
  Palette,
  Zap,
  MoveHorizontal,
  Play,
  Pause
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
}

const ControlsPanel: React.FC<ControlsPanelProps> = ({
  particleCount, setParticleCount,
  particleColor, setParticleColor,
  particleSpeed, setParticleSpeed,
  particleSpread, setParticleSpread,
  isRecording, onStartRecording, onStopRecording, onDownloadRecording, recordedVideoUrl,
  isPlaying, setIsPlaying
}) => {
  return (
    <Card className="fixed bottom-0 left-0 right-0 m-2 md:m-4 shadow-2xl border-border bg-card/90 backdrop-blur-sm z-50">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Column 1: Simulation Controls */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-accent" />
              <Label htmlFor="particleCount" className="font-semibold text-sm">Density</Label>
            </div>
            <Slider
              id="particleCount"
              min={100} max={5000} step={100}
              value={[particleCount]}
              onValueChange={(value) => setParticleCount(value[0])}
              aria-label="Smoke density"
            />
             <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent" />
              <Label htmlFor="particleSpeed" className="font-semibold text-sm">Speed</Label>
            </div>
            <Slider
              id="particleSpeed"
              min={0.005} max={0.1} step={0.005}
              value={[particleSpeed]}
              onValueChange={(value) => setParticleSpeed(value[0])}
              aria-label="Smoke speed"
            />
          </div>

          {/* Column 2: Appearance & Spread */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-accent" />
                <Label htmlFor="particleColor" className="font-semibold text-sm">Color</Label>
            </div>
            <Input
                id="particleColor"
                type="color"
                value={particleColor}
                onChange={(e) => setParticleColor(e.target.value)}
                className="w-full h-10 p-1"
                aria-label="Smoke color"
            />
            <div className="flex items-center gap-2">
              <MoveHorizontal className="w-5 h-5 text-accent" />
              <Label htmlFor="particleSpread" className="font-semibold text-sm">Spread</Label>
            </div>
            <Slider
              id="particleSpread"
              min={0.5} max={5} step={0.1}
              value={[particleSpread]}
              onValueChange={(value) => setParticleSpread(value[0])}
              aria-label="Smoke spread"
            />
          </div>
          
          {/* Column 3: Recording and Playback Controls */}
          <div className="space-y-3 flex flex-col items-center md:items-start">
             <Button onClick={() => setIsPlaying(!isPlaying)} variant="outline" className="w-full md:w-auto">
              {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
              {isPlaying ? 'Pause Sim' : 'Play Sim'}
            </Button>
            {!isRecording ? (
              <Button onClick={onStartRecording} className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                <CircleDot className="mr-2 h-4 w-4" /> Start Recording
              </Button>
            ) : (
              <Button onClick={onStopRecording} variant="destructive" className="w-full md:w-auto">
                <StopCircle className="mr-2 h-4 w-4" /> Stop Recording
              </Button>
            )}
            {recordedVideoUrl && (
              <Button onClick={onDownloadRecording} variant="outline" className="w-full md:w-auto">
                <Download className="mr-2 h-4 w-4" /> Download (WebM)
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ControlsPanel;