
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
  CircleDot, // Record
  StopCircle, // Stop Record
  Download, // Download
  Play, // Play Sim
  Pause, // Pause Sim
  Settings2, // Main Panel Icon
  Video, // Media Tab Icon
  Cloud, // Smoke Tab Icon
  Flame, // Fire Tab Icon
  PaintBucket, // Scene Tab Icon / Background Color
  ArrowDownToLine,
  MousePointer2, 
  Target,
} from "lucide-react";

interface ControlsPanelProps {
  isSmokeEnabled: boolean;
  setIsSmokeEnabled: Dispatch<SetStateAction<boolean>>;
  smokeDensity: number;
  setSmokeDensity: Dispatch<SetStateAction<number>>;
  smokeBaseColor: string;
  setSmokeBaseColor: Dispatch<SetStateAction<string>>;
  smokeAccentColor: string;
  setSmokeAccentColor: Dispatch<SetStateAction<string>>;
  smokeSpeed: number;
  setSmokeSpeed: Dispatch<SetStateAction<number>>;
  smokeSpread: number; // Represents Particle Size in UI
  setSmokeSpread: Dispatch<SetStateAction<number>>;
  smokeBlendMode: BlendMode;
  setSmokeBlendMode: Dispatch<SetStateAction<BlendMode>>;
  smokeSource: ParticleSource;
  setSmokeSource: Dispatch<SetStateAction<ParticleSource>>;
  smokeOpacity: number;
  setSmokeOpacity: Dispatch<SetStateAction<number>>;
  smokeTurbulence: number;
  setSmokeTurbulence: Dispatch<SetStateAction<number>>;

  isFireEnabled: boolean;
  setIsFireEnabled: Dispatch<SetStateAction<boolean>>;
  fireBaseColor: string;
  setFireBaseColor: Dispatch<SetStateAction<string>>;
  fireAccentColor: string;
  setFireAccentColor: Dispatch<SetStateAction<string>>;
  fireDensity: number;
  setFireDensity: Dispatch<SetStateAction<number>>;
  fireSpeed: number;
  setFireSpeed: Dispatch<SetStateAction<number>>;
  fireSpread: number; // Represents Particle Size in UI
  setFireSpread: Dispatch<SetStateAction<number>>;
  fireParticleSource: ParticleSource;
  setFireParticleSource: Dispatch<SetStateAction<ParticleSource>>;
  fireBlendMode: BlendMode;
  setFireBlendMode: Dispatch<SetStateAction<BlendMode>>;
  fireOpacity: number;
  setFireOpacity: Dispatch<SetStateAction<number>>;
  fireTurbulence: number;
  setFireTurbulence: Dispatch<SetStateAction<number>>;

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
  smokeBaseColor, setSmokeBaseColor,
  smokeAccentColor, setSmokeAccentColor,
  smokeSpeed, setSmokeSpeed,
  smokeSpread, setSmokeSpread,
  smokeBlendMode, setSmokeBlendMode,
  smokeSource, setSmokeSource,
  smokeOpacity, setSmokeOpacity,
  smokeTurbulence, setSmokeTurbulence,

  isFireEnabled, setIsFireEnabled,
  fireBaseColor, setFireBaseColor,
  fireAccentColor, setFireAccentColor,
  fireDensity, setFireDensity,
  fireSpeed, setFireSpeed,
  fireSpread, setFireSpread,
  fireParticleSource, setFireParticleSource,
  fireBlendMode, setFireBlendMode,
  fireOpacity, setFireOpacity,
  fireTurbulence, setFireTurbulence,

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
    <Card className="fixed bottom-0 left-0 right-0 m-2 md:m-4 shadow-2xl border-border bg-card/95 backdrop-blur-sm z-50 max-w-5xl mx-auto">
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
            <div className="text-center text-sm text-muted-foreground mb-4">
              Adjust parameters or select a preset to begin.
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-6">
              <div>
                <Label className="font-semibold text-sm mb-1 block">Simulation Preset</Label>
                <Select onValueChange={(value) => {
                  const selectedPreset = presets.find(p => p.name === value);
                  if (selectedPreset) onApplyPreset(selectedPreset);
                }}>
                  <SelectTrigger aria-label="Simulation preset">
                    <SelectValue placeholder="Select a preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {presets.map(preset => (
                      <SelectItem key={preset.name} value={preset.name}>
                        <div className="flex items-center gap-2">
                          {preset.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="backgroundColor" className="font-semibold text-sm mb-1 block">Background Color</Label>
                 <div className="flex items-center gap-2">
                    <Input 
                        id="backgroundColor" 
                        type="color" 
                        value={backgroundColor} 
                        onChange={(e) => setBackgroundColor(e.target.value)} 
                        className="w-10 h-10 p-1 cursor-pointer rounded-md border-2 border-input focus:border-primary focus:ring-primary"
                        aria-label="Scene background color" 
                    />
                    <span className="text-sm text-muted-foreground">{backgroundColor.toUpperCase()}</span>
                </div>
              </div>
            </div>

            <Tabs defaultValue="smoke" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4"> {/* Changed grid-cols-4 to grid-cols-3 */}
                <TabsTrigger value="smoke"><Cloud className="mr-1.5 h-4 w-4" />Smoke</TabsTrigger>
                <TabsTrigger value="fire"><Flame className="mr-1.5 h-4 w-4" />Fire</TabsTrigger>
                <TabsTrigger value="media"><Video className="mr-1.5 h-4 w-4" />Media</TabsTrigger>
              </TabsList>

              {/* Smoke Tab Content */}
              <TabsContent value="smoke">
                <div className="flex items-center justify-between mb-4">
                  <Label htmlFor="smokeToggle" className="font-semibold text-base">Enable Smoke</Label>
                  <Switch id="smokeToggle" checked={isSmokeEnabled} onCheckedChange={setIsSmokeEnabled} aria-label="Toggle smoke simulation" />
                </div>
                {isSmokeEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                    {/* Colors in first row */}
                    <div className="lg:col-span-2">
                      <Label htmlFor="smokeBaseColor" className="font-semibold text-sm mb-1 block">Particle Base Color</Label>
                       <div className="flex items-center gap-2">
                        <Input 
                            id="smokeBaseColor" 
                            type="color" 
                            value={smokeBaseColor} 
                            onChange={(e) => setSmokeBaseColor(e.target.value)} 
                            className="w-10 h-10 p-1 cursor-pointer rounded-md border-2 border-input focus:border-primary focus:ring-primary"
                            aria-label="Smoke particle base color" 
                        />
                        <span className="text-sm text-muted-foreground">{smokeBaseColor.toUpperCase()}</span>
                       </div>
                    </div>
                    <div className="lg:col-span-2">
                      <Label htmlFor="smokeAccentColor" className="font-semibold text-sm mb-1 block">Particle Accent Color</Label>
                       <div className="flex items-center gap-2">
                        <Input 
                            id="smokeAccentColor" 
                            type="color" 
                            value={smokeAccentColor} 
                            onChange={(e) => setSmokeAccentColor(e.target.value)} 
                            className="w-10 h-10 p-1 cursor-pointer rounded-md border-2 border-input focus:border-primary focus:ring-primary"
                            aria-label="Smoke particle accent color" 
                        />
                         <span className="text-sm text-muted-foreground">{smokeAccentColor.toUpperCase()}</span>
                       </div>
                    </div>

                    {/* Sliders and Selects */}
                    <div>
                      <Label htmlFor="smokeOpacity" className="font-semibold text-sm mb-1 block">Particle Opacity</Label>
                      <Slider id="smokeOpacity" min={0} max={1} step={0.01} value={[smokeOpacity]} onValueChange={(v) => setSmokeOpacity(v[0])} aria-label="Smoke particle opacity"/>
                    </div>
                    <div>
                      <Label htmlFor="smokeSpeed" className="font-semibold text-sm mb-1 block">Particle Speed</Label>
                      <Slider id="smokeSpeed" min={0.005} max={0.1} step={0.005} value={[smokeSpeed]} onValueChange={(v) => setSmokeSpeed(v[0])} aria-label="Smoke particle speed" />
                    </div>
                     <div>
                      <Label htmlFor="smokeParticleSize" className="font-semibold text-sm mb-1 block">Particle Size</Label>
                      <Slider id="smokeParticleSize" min={0.5} max={5} step={0.1} value={[smokeSpread]} onValueChange={(v) => setSmokeSpread(v[0])} aria-label="Smoke particle size (spread)" />
                    </div>
                    <div>
                      <Label htmlFor="smokeParticleCount" className="font-semibold text-sm mb-1 block">Particle Count</Label>
                      <Slider id="smokeParticleCount" min={100} max={8000} step={100} value={[smokeDensity]} onValueChange={(v) => setSmokeDensity(v[0])} aria-label="Smoke particle count (density)"/>
                    </div>
                    <div>
                      <Label htmlFor="smokeTurbulence" className="font-semibold text-sm mb-1 block">Turbulence</Label>
                      <Slider id="smokeTurbulence" min={0} max={5} step={0.1} value={[smokeTurbulence]} onValueChange={(v) => setSmokeTurbulence(v[0])} aria-label="Smoke turbulence"/>
                    </div>
                    <div>
                      <Label className="font-semibold text-sm mb-1 block">Blend Mode</Label>
                      <Select value={smokeBlendMode} onValueChange={(value: BlendMode) => setSmokeBlendMode(value)}>
                        <SelectTrigger aria-label="Smoke blend mode"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {blendModeOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="font-semibold text-sm mb-1 block">Particle Source</Label>
                      <Select value={smokeSource} onValueChange={(value: ParticleSource) => setSmokeSource(value)}>
                        <SelectTrigger aria-label="Smoke particle source"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {particleSourceOptions.map(option => <SelectItem key={option.value} value={option.value}><div className="flex items-center gap-2"><option.icon className="w-4 h-4" />{option.label}</div></SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Fire Tab Content */}
              <TabsContent value="fire">
                <div className="flex items-center justify-between mb-4">
                  <Label htmlFor="fireToggle" className="font-semibold text-base">Enable Fire</Label>
                  <Switch id="fireToggle" checked={isFireEnabled} onCheckedChange={setIsFireEnabled} aria-label="Toggle fire simulation" />
                </div>
                {isFireEnabled && (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                    {/* Colors in first row */}
                    <div className="lg:col-span-2">
                      <Label htmlFor="fireBaseColor" className="font-semibold text-sm mb-1 block">Particle Base Color</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                            id="fireBaseColor" 
                            type="color" 
                            value={fireBaseColor} 
                            onChange={(e) => setFireBaseColor(e.target.value)} 
                            className="w-10 h-10 p-1 cursor-pointer rounded-md border-2 border-input focus:border-primary focus:ring-primary"
                            aria-label="Fire particle base color" 
                        />
                        <span className="text-sm text-muted-foreground">{fireBaseColor.toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="lg:col-span-2">
                      <Label htmlFor="fireAccentColor" className="font-semibold text-sm mb-1 block">Particle Accent Color</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                            id="fireAccentColor" 
                            type="color" 
                            value={fireAccentColor} 
                            onChange={(e) => setFireAccentColor(e.target.value)} 
                            className="w-10 h-10 p-1 cursor-pointer rounded-md border-2 border-input focus:border-primary focus:ring-primary"
                            aria-label="Fire particle accent color" 
                        />
                        <span className="text-sm text-muted-foreground">{fireAccentColor.toUpperCase()}</span>
                      </div>
                    </div>

                    {/* Sliders and Selects */}
                    <div>
                      <Label htmlFor="fireOpacity" className="font-semibold text-sm mb-1 block">Particle Opacity</Label>
                      <Slider id="fireOpacity" min={0} max={1} step={0.01} value={[fireOpacity]} onValueChange={(v) => setFireOpacity(v[0])} aria-label="Fire particle opacity"/>
                    </div>
                    <div>
                      <Label htmlFor="fireSpeed" className="font-semibold text-sm mb-1 block">Particle Speed</Label>
                      <Slider id="fireSpeed" min={0.01} max={0.2} step={0.005} value={[fireSpeed]} onValueChange={(v) => setFireSpeed(v[0])} aria-label="Fire particle speed" />
                    </div>
                     <div>
                      <Label htmlFor="fireParticleSize" className="font-semibold text-sm mb-1 block">Particle Size</Label>
                      <Slider id="fireParticleSize" min={0.2} max={3} step={0.1} value={[fireSpread]} onValueChange={(v) => setFireSpread(v[0])} aria-label="Fire particle size (spread)" />
                    </div>
                    <div>
                      <Label htmlFor="fireParticleCount" className="font-semibold text-sm mb-1 block">Particle Count</Label>
                      <Slider id="fireParticleCount" min={100} max={5000} step={50} value={[fireDensity]} onValueChange={(v) => setFireDensity(v[0])} aria-label="Fire particle count (intensity)"/>
                    </div>
                    <div>
                      <Label htmlFor="fireTurbulence" className="font-semibold text-sm mb-1 block">Turbulence</Label>
                      <Slider id="fireTurbulence" min={0} max={5} step={0.1} value={[fireTurbulence]} onValueChange={(v) => setFireTurbulence(v[0])} aria-label="Fire turbulence"/>
                    </div>
                    <div>
                      <Label className="font-semibold text-sm mb-1 block">Blend Mode</Label>
                      <Select value={fireBlendMode} onValueChange={(value: BlendMode) => setFireBlendMode(value)}>
                        <SelectTrigger aria-label="Fire blend mode"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {blendModeOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="font-semibold text-sm mb-1 block">Particle Source</Label>
                      <Select value={fireParticleSource} onValueChange={(value: ParticleSource) => setFireParticleSource(value)}>
                        <SelectTrigger aria-label="Fire particle source"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {particleSourceOptions.map(option => <SelectItem key={option.value} value={option.value}><div className="flex items-center gap-2"><option.icon className="w-4 h-4" />{option.label}</div></SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
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
              
            </Tabs>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
};

export default ControlsPanel;
