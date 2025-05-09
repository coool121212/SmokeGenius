
"use client";

import type { Dispatch, SetStateAction, MutableRefObject } from 'react';
import type { SimulationPreset, BlendMode, ParticleSource } from './types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CircleDot,
  StopCircle,
  Download,
  Cloud, 
  Palette,
  Zap, 
  MoveHorizontal, 
  Play,
  Pause,
  Flame, 
  Settings2, 
  Video,
  PaintBucket, 
  BarChartBig, 
  FastForward, 
  Expand, 
  Wand2,
  Blend, 
  Target, 
  MousePointer2, 
  ArrowDownToLine, 
  LocateFixed, 
} from "lucide-react";

interface ControlsPanelProps {
  isSmokeEnabled: boolean;
  setIsSmokeEnabled: Dispatch<SetStateAction<boolean>>;
  smokeDensity: number;
  setSmokeDensity: Dispatch<SetStateAction<number>>;
  smokeColor: string;
  setSmokeColor: Dispatch<SetStateAction<string>>;
  smokeSpeed: number;
  setSmokeSpeed: Dispatch<SetStateAction<number>>;
  smokeSpread: number;
  setSmokeSpread: Dispatch<SetStateAction<number>>;
  smokeBlendMode: BlendMode;
  setSmokeBlendMode: Dispatch<SetStateAction<BlendMode>>;
  smokeSource: ParticleSource;
  setSmokeSource: Dispatch<SetStateAction<ParticleSource>>;

  isFireEnabled: boolean;
  setIsFireEnabled: Dispatch<SetStateAction<boolean>>;
  fireColor: string;
  setFireColor: Dispatch<SetStateAction<string>>;
  fireDensity: number;
  setFireDensity: Dispatch<SetStateAction<number>>;
  fireSpeed: number;
  setFireSpeed: Dispatch<SetStateAction<number>>;
  fireSpread: number;
  setFireSpread: Dispatch<SetStateAction<number>>;
  fireParticleSource: ParticleSource;
  setFireParticleSource: Dispatch<SetStateAction<ParticleSource>>;
  fireBlendMode: BlendMode;
  setFireBlendMode: Dispatch<SetStateAction<BlendMode>>;


  backgroundColor: string;
  setBackgroundColor: Dispatch<SetStateAction<string>>;
  
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onDownloadRecording: () => void;
  recordedVideoUrl: string | null;
  isPlaying: boolean;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
  mediaRecorderRef: MutableRefObject<MediaRecorder | null>;
  presets: SimulationPreset[];
  onApplyPreset: (preset: SimulationPreset) => void;
}

const ControlsPanel: React.FC<ControlsPanelProps> = ({
  isSmokeEnabled, setIsSmokeEnabled,
  smokeDensity, setSmokeDensity,
  smokeColor, setSmokeColor,
  smokeSpeed, setSmokeSpeed,
  smokeSpread, setSmokeSpread,
  smokeBlendMode, setSmokeBlendMode,
  smokeSource, setSmokeSource,

  isFireEnabled, setIsFireEnabled,
  fireColor, setFireColor,
  fireDensity, setFireDensity,
  fireSpeed, setFireSpeed,
  fireSpread, setFireSpread,
  fireParticleSource, setFireParticleSource,
  fireBlendMode, setFireBlendMode,

  backgroundColor, setBackgroundColor,

  isRecording, onStartRecording, onStopRecording, onDownloadRecording, recordedVideoUrl,
  isPlaying, setIsPlaying,
  mediaRecorderRef,
  presets, onApplyPreset
}) => {
  const particleSourceOptions: { value: ParticleSource; label: string; icon: React.ElementType }[] = [
    { value: "Center", label: "Center", icon: Target },
    { value: "Mouse", label: "Mouse", icon: MousePointer2 },
    { value: "Bottom", label: "Bottom", icon: ArrowDownToLine },
  ];
  
  const blendModeOptions: {value: BlendMode, label: string}[] = [
    { value: "Normal", label: "Normal"},
    { value: "Additive", label: "Additive (Brighter/Ethereal)"},
    { value: "Subtractive", label: "Subtractive (Darker)"},
    { value: "Multiply", label: "Multiply (Intense/Shadow)"},
  ];


  return (
    <Card className="fixed bottom-0 left-0 right-0 m-2 md:m-4 shadow-2xl border-border bg-card/95 backdrop-blur-sm z-50 max-w-4xl mx-auto">
      <Accordion type="single" collapsible className="w-full" defaultValue="controls-panel">
        <AccordionItem value="controls-panel" className="border-b-0">
          <AccordionTrigger className="hover:no-underline p-0 w-full">
            <CardHeader className="w-full pb-2 pt-4 px-4 flex justify-between items-center">
              <CardTitle className="text-lg flex items-center">
                <Settings2 className="mr-2 h-5 w-5 text-primary" /> Simulation Controls
              </CardTitle>
            </CardHeader>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-0">
            <Tabs defaultValue="smoke" className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-4"> 
                <TabsTrigger value="smoke">Smoke</TabsTrigger>
                <TabsTrigger value="fire">Fire</TabsTrigger>
                <TabsTrigger value="scene">Scene</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>
                <TabsTrigger value="presets">Presets</TabsTrigger> 
              </TabsList>

              <TabsContent value="smoke">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="flex items-center justify-between col-span-1 md:col-span-2">
                    <div className="flex items-center gap-2">
                      <Cloud className="w-5 h-5 text-accent" />
                      <Label htmlFor="smokeToggle" className="font-semibold text-sm">Enable Smoke</Label>
                    </div>
                    <Switch id="smokeToggle" checked={isSmokeEnabled} onCheckedChange={setIsSmokeEnabled} aria-label="Toggle smoke simulation" />
                  </div>
                  {isSmokeEnabled && (
                    <>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <BarChartBig className="w-5 h-5 text-accent" />
                          <Label htmlFor="smokeDensity" className="font-semibold text-sm">Density</Label>
                        </div>
                        <Slider id="smokeDensity" min={100} max={8000} step={100} value={[smokeDensity]} onValueChange={(v) => setSmokeDensity(v[0])} aria-label="Smoke particle density"/>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Palette className="w-5 h-5 text-accent" />
                          <Label htmlFor="smokeColor" className="font-semibold text-sm">Color</Label>
                        </div>
                        <Input id="smokeColor" type="color" value={smokeColor} onChange={(e) => setSmokeColor(e.target.value)} className="w-full h-10 p-1" aria-label="Smoke particle color" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Zap className="w-5 h-5 text-accent" />
                          <Label htmlFor="smokeSpeed" className="font-semibold text-sm">Speed</Label>
                        </div>
                        <Slider id="smokeSpeed" min={0.005} max={0.1} step={0.005} value={[smokeSpeed]} onValueChange={(v) => setSmokeSpeed(v[0])} aria-label="Smoke particle speed" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <MoveHorizontal className="w-5 h-5 text-accent" />
                          <Label htmlFor="smokeSpread" className="font-semibold text-sm">Spread</Label>
                        </div>
                        <Slider id="smokeSpread" min={0.5} max={5} step={0.1} value={[smokeSpread]} onValueChange={(v) => setSmokeSpread(v[0])} aria-label="Smoke particle spread" />
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                           <Blend className="w-5 h-5 text-accent" />
                           <Label className="font-semibold text-sm">Blend Mode</Label>
                        </div>
                        <Select value={smokeBlendMode} onValueChange={(value: BlendMode) => setSmokeBlendMode(value)}>
                          <SelectTrigger aria-label="Smoke blend mode">
                            <SelectValue placeholder="Select blend mode" />
                          </SelectTrigger>
                          <SelectContent>
                            {blendModeOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                           <LocateFixed className="w-5 h-5 text-accent" /> 
                           <Label className="font-semibold text-sm">Particle Source</Label>
                        </div>
                        <Select
                          value={smokeSource}
                          onValueChange={(value: ParticleSource) => setSmokeSource(value)}
                          
                        >
                          <SelectTrigger aria-label="Smoke particle source">
                            <SelectValue placeholder="Select particle source" />
                          </SelectTrigger>
                          <SelectContent>
                            {particleSourceOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2">
                                  <option.icon className="w-4 h-4" />
                                  {option.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>
                {isSmokeEnabled && (
                 <p className="mt-3 text-center text-xs text-muted-foreground col-span-1 md:col-span-2">
                    Smoke simulation parameters affect visual appearance and performance.
                </p>
                )}
              </TabsContent>

              <TabsContent value="fire">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="flex items-center justify-between col-span-1 md:col-span-2">
                    <div className="flex items-center gap-2">
                      <Flame className="w-5 h-5 text-accent" />
                      <Label htmlFor="fireToggle" className="font-semibold text-sm">Enable Fire</Label>
                    </div>
                    <Switch id="fireToggle" checked={isFireEnabled} onCheckedChange={setIsFireEnabled} aria-label="Toggle fire simulation" />
                  </div>
                  {isFireEnabled && (
                    <>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Palette className="w-5 h-5 text-accent" />
                          <Label htmlFor="fireColor" className="font-semibold text-sm">Color</Label>
                        </div>
                        <Input id="fireColor" type="color" value={fireColor} onChange={(e) => setFireColor(e.target.value)} className="w-full h-10 p-1" aria-label="Fire particle color" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <BarChartBig className="w-5 h-5 text-accent" />
                          <Label htmlFor="fireDensity" className="font-semibold text-sm">Intensity</Label>
                        </div>
                        <Slider id="fireDensity" min={100} max={5000} step={50} value={[fireDensity]} onValueChange={(v) => setFireDensity(v[0])} aria-label="Fire particle intensity" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <FastForward className="w-5 h-5 text-accent" />
                          <Label htmlFor="fireSpeed" className="font-semibold text-sm">Speed</Label>
                        </div>
                        <Slider id="fireSpeed" min={0.01} max={0.2} step={0.005} value={[fireSpeed]} onValueChange={(v) => setFireSpeed(v[0])} aria-label="Fire particle speed" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Expand className="w-5 h-5 text-accent" />
                          <Label htmlFor="fireSpread" className="font-semibold text-sm">Spread</Label>
                        </div>
                        <Slider id="fireSpread" min={0.2} max={3} step={0.1} value={[fireSpread]} onValueChange={(v) => setFireSpread(v[0])} aria-label="Fire particle spread" />
                      </div>
                       <div>
                        <div className="flex items-center gap-2 mb-2">
                           <LocateFixed className="w-5 h-5 text-accent" /> 
                           <Label className="font-semibold text-sm">Particle Source</Label>
                        </div>
                        <Select
                          value={fireParticleSource}
                          onValueChange={(value: ParticleSource) => setFireParticleSource(value)}
                        >
                          <SelectTrigger aria-label="Fire particle source">
                            <SelectValue placeholder="Select particle source" />
                          </SelectTrigger>
                          <SelectContent>
                            {particleSourceOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2">
                                  <option.icon className="w-4 h-4" />
                                  {option.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                           <Blend className="w-5 h-5 text-accent" />
                           <Label className="font-semibold text-sm">Blend Mode</Label>
                        </div>
                        <Select value={fireBlendMode} onValueChange={(value: BlendMode) => setFireBlendMode(value)}>
                          <SelectTrigger aria-label="Fire blend mode">
                            <SelectValue placeholder="Select blend mode" />
                          </SelectTrigger>
                          <SelectContent>
                            {blendModeOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>
                {isFireEnabled && (
                 <p className="mt-3 text-center text-xs text-muted-foreground col-span-1 md:col-span-2">
                    Fire simulation intensity and behavior adapt to its settings.
                </p>
                )}
              </TabsContent>

              <TabsContent value="scene">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                   <div>
                    <div className="flex items-center gap-2 mb-1">
                        <PaintBucket className="w-5 h-5 text-accent" />
                        <Label htmlFor="backgroundColor" className="font-semibold text-sm">Background Color</Label>
                    </div>
                    <Input id="backgroundColor" type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="w-full h-10 p-1" aria-label="Scene background color" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="media">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 items-end">
                  <Button onClick={() => setIsPlaying(!isPlaying)} variant="outline" className="w-full">
                    {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                    {isPlaying ? 'Pause Simulation' : 'Play Simulation'}
                  </Button>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
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
                        disabled={!mediaRecorderRef.current}
                      >
                        <Download className="mr-2 h-4 w-4" /> 
                        Download {mediaRecorderRef.current?.mimeType.includes('mp4') ? 'MP4' : 'WebM'}
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="presets">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <Wand2 className="mr-2 h-5 w-5 text-primary" />
                      Simulation Presets
                    </CardTitle>
                    <CardDescription>
                      Select a preset to quickly configure the simulation.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {presets.map((preset) => (
                      <Button
                        key={preset.name}
                        variant="outline"
                        onClick={() => onApplyPreset(preset)}
                        className="flex flex-col items-start p-3 h-auto text-left shadow-sm hover:shadow-md transition-shadow"
                        aria-label={`Apply ${preset.name} preset`}
                      >
                        <span className="font-semibold text-sm">{preset.name}</span>
                        {preset.description && (
                          <span className="text-xs text-muted-foreground mt-1 leading-tight">
                            {preset.description}
                          </span>
                        )}
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
};

export default ControlsPanel;

