"use client";

import React from 'react';
import type { Dispatch, SetStateAction, MutableRefObject } from 'react';
import type { SimulationPreset, BlendMode, ParticleSource } from './types';
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card"; 
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
} from "@/components/ui/sidebar";
import {
  CircleDot, 
  StopCircle, 
  Download, 
  Play, 
  Pause, 
  Settings2, 
  Video, 
  Cloud, 
  Flame, 
  Palette,
  Wind,
  ChevronsUp, // Buoyancy
  LocateFixed, // Center source
  MousePointer2, // Mouse source
  ArrowDownToLine, // Bottom source
  Layers // Dissipation
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
  smokeSpread: number; 
  setSmokeSpread: Dispatch<SetStateAction<number>>;
  smokeBlendMode: BlendMode;
  setSmokeBlendMode: Dispatch<SetStateAction<BlendMode>>;
  smokeSource: ParticleSource;
  setSmokeSource: Dispatch<SetStateAction<ParticleSource>>;
  smokeOpacity: number;
  setSmokeOpacity: Dispatch<SetStateAction<number>>;
  smokeTurbulence: number;
  setSmokeTurbulence: Dispatch<SetStateAction<number>>;
  smokeDissipation: number;
  setSmokeDissipation: Dispatch<SetStateAction<number>>;
  smokeBuoyancy: number;
  setSmokeBuoyancy: Dispatch<SetStateAction<number>>;

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
  fireSpread: number; 
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
  windDirectionX: number;
  setWindDirectionX: Dispatch<SetStateAction<number>>;
  windStrength: number;
  setWindStrength: Dispatch<SetStateAction<number>>;
  
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
  smokeDissipation, setSmokeDissipation,
  smokeBuoyancy, setSmokeBuoyancy,

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
  windDirectionX, setWindDirectionX,
  windStrength, setWindStrength,

  isRecording, onStartRecording, onStopRecording, onDownloadRecording, recordedVideoUrl,
  isPlaying, setIsPlaying,
  mediaRecorderRef,
  presets, onApplyPreset
}) => {
  const particleSourceOptions: { value: ParticleSource; label: string; icon: React.ElementType }[] = [
    { value: "Center", label: "Center", icon: LocateFixed },
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
    <Sidebar side="left" variant="sidebar" collapsible="icon" className="border-r bg-card text-card-foreground">
      <SidebarHeader className="p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <CardTitle className="text-lg flex items-center m-0">
            <Settings2 className="mr-2 h-5 w-5 text-primary" /> Simulation Controls
          </CardTitle>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-3 space-y-4 overflow-y-auto">
          <div>
            <Label htmlFor="presetSelect" className="text-sm font-medium mb-1 block">Preset</Label>
            <Select onValueChange={(value) => {
              const selectedPreset = presets.find(p => p.name === value);
              if (selectedPreset) onApplyPreset(selectedPreset);
            }}>
              <SelectTrigger id="presetSelect" aria-label="Select preset">
                <SelectValue placeholder="Select a preset" />
              </SelectTrigger>
              <SelectContent>
                {presets.map(preset => (
                  <SelectItem key={preset.name} value={preset.name}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 pt-2 border-t border-border">
              <Label className="text-base font-semibold flex items-center"><Palette className="mr-2 h-4 w-4 text-primary" />Scene</Label>
            <div>
                <Label htmlFor="backgroundColor" className="text-sm font-medium">Background Color</Label>
                <div className="flex items-center gap-2 mt-1">
                <Input 
                    id="backgroundColor" 
                    type="color" 
                    value={backgroundColor} 
                    onChange={(e) => setBackgroundColor(e.target.value)} 
                    className="p-1 h-10 w-12 rounded-md border-input"
                    aria-label="Background color picker"
                />
                <span className="text-xs text-muted-foreground">{backgroundColor.toUpperCase()}</span>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div>
                    <Label htmlFor="windDirectionX" className="text-sm font-medium">Wind Dir. X</Label>
                    <Slider id="windDirectionX" min={-1} max={1} step={0.01} value={[windDirectionX]} onValueChange={(v) => setWindDirectionX(v[0])} />
                    <span className="text-xs text-muted-foreground text-center block mt-1">{windDirectionX.toFixed(2)}</span>
                </div>
                <div>
                    <Label htmlFor="windStrength" className="text-sm font-medium">Wind Strength</Label>
                    <Slider id="windStrength" min={0} max={0.05} step={0.001} value={[windStrength]} onValueChange={(v) => setWindStrength(v[0])} />
                    <span className="text-xs text-muted-foreground text-center block mt-1">{windStrength.toFixed(3)}</span>
                </div>
            </div>
          </div>

        <Tabs defaultValue="smoke" className="w-full pt-2 border-t border-border">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="smoke"><Cloud className="mr-1.5 h-4 w-4" />Smoke</TabsTrigger>
            <TabsTrigger value="fire"><Flame className="mr-1.5 h-4 w-4" />Fire</TabsTrigger>
            <TabsTrigger value="media"><Video className="mr-1.5 h-4 w-4" />Media</TabsTrigger>
          </TabsList>

          <TabsContent value="smoke" className="mt-4">
            <div className="flex items-center justify-between mb-4">
                <Label htmlFor="smokeToggle" className="text-base font-semibold">Enable Smoke</Label>
                <Switch id="smokeToggle" checked={isSmokeEnabled} onCheckedChange={setIsSmokeEnabled} />
            </div>
            {isSmokeEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                    <Label htmlFor="smokeBaseColor" className="text-sm font-medium">Base Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                    <Input id="smokeBaseColor" type="color" value={smokeBaseColor} onChange={(e) => setSmokeBaseColor(e.target.value)} className="p-1 h-10 w-12 rounded-md border-input" />
                    <span className="text-sm text-muted-foreground">{smokeBaseColor.toUpperCase()}</span>
                    </div>
                </div>
                <div>
                    <Label htmlFor="smokeAccentColor" className="text-sm font-medium">Accent Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                    <Input id="smokeAccentColor" type="color" value={smokeAccentColor} onChange={(e) => setSmokeAccentColor(e.target.value)} className="p-1 h-10 w-12 rounded-md border-input" />
                    <span className="text-sm text-muted-foreground">{smokeAccentColor.toUpperCase()}</span>
                    </div>
                </div>
                <div>
                    <Label htmlFor="smokeOpacity" className="text-sm font-medium">Opacity</Label>
                    <Slider id="smokeOpacity" min={0} max={1} step={0.01} value={[smokeOpacity]} onValueChange={(v) => setSmokeOpacity(v[0])} />
                    <span className="text-xs text-muted-foreground text-center block mt-1">{smokeOpacity.toFixed(2)}</span>
                </div>
                <div>
                    <Label htmlFor="smokeSpread" className="text-sm font-medium">Size (Spread)</Label>
                    <Slider id="smokeSpread" min={0.1} max={5} step={0.1} value={[smokeSpread]} onValueChange={(v) => setSmokeSpread(v[0])} />
                    <span className="text-xs text-muted-foreground text-center block mt-1">{smokeSpread.toFixed(1)}</span>
                </div>
                <div>
                    <Label htmlFor="smokeSpeed" className="text-sm font-medium">Speed</Label>
                    <Slider id="smokeSpeed" min={0.001} max={0.1} step={0.001} value={[smokeSpeed]} onValueChange={(v) => setSmokeSpeed(v[0])} />
                    <span className="text-xs text-muted-foreground text-center block mt-1">{smokeSpeed.toFixed(3)}</span>
                </div>
                <div>
                    <Label htmlFor="smokeDensity" className="text-sm font-medium">Count (Density)</Label>
                    <Slider id="smokeDensity" min={100} max={8000} step={100} value={[smokeDensity]} onValueChange={(v) => setSmokeDensity(v[0])} />
                    <span className="text-xs text-muted-foreground text-center block mt-1">{smokeDensity}</span>
                </div>
                <div>
                    <Label htmlFor="smokeTurbulence" className="text-sm font-medium">Turbulence</Label>
                    <Slider id="smokeTurbulence" min={0} max={5} step={0.1} value={[smokeTurbulence]} onValueChange={(v) => setSmokeTurbulence(v[0])} />
                    <span className="text-xs text-muted-foreground text-center block mt-1">{smokeTurbulence.toFixed(1)}</span>
                </div>
                 <div>
                    <Label htmlFor="smokeDissipation" className="text-sm font-medium flex items-center"><Layers className="mr-1.5 h-3 w-3" />Dissipation</Label>
                    <Slider id="smokeDissipation" min={0} max={1} step={0.01} value={[smokeDissipation]} onValueChange={(v) => setSmokeDissipation(v[0])} />
                    <span className="text-xs text-muted-foreground text-center block mt-1">{smokeDissipation.toFixed(2)}</span>
                </div>
                <div>
                    <Label htmlFor="smokeBuoyancy" className="text-sm font-medium flex items-center"><ChevronsUp className="mr-1.5 h-3 w-3" />Buoyancy</Label>
                    <Slider id="smokeBuoyancy" min={0} max={0.05} step={0.001} value={[smokeBuoyancy]} onValueChange={(v) => setSmokeBuoyancy(v[0])} />
                    <span className="text-xs text-muted-foreground text-center block mt-1">{smokeBuoyancy.toFixed(3)}</span>
                </div>
                <div>
                    <Label htmlFor="smokeBlendMode" className="text-sm font-medium">Blend Mode</Label>
                    <Select value={smokeBlendMode} onValueChange={(value: BlendMode) => setSmokeBlendMode(value)}>
                    <SelectTrigger id="smokeBlendMode"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {blendModeOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                    </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="smokeSource" className="text-sm font-medium">Particle Source</Label>
                    <Select value={smokeSource} onValueChange={(value: ParticleSource) => setSmokeSource(value)}>
                    <SelectTrigger id="smokeSource"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {particleSourceOptions.map(option => 
                            <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center"><option.icon className="mr-2 h-4 w-4"/>{option.label}</div>
                            </SelectItem>
                        )}
                    </SelectContent>
                    </Select>
                </div>
                </div>
            )}
          </TabsContent>

          <TabsContent value="fire" className="mt-4">
             <div className="flex items-center justify-between mb-4">
                <Label htmlFor="fireToggle" className="text-base font-semibold">Enable Fire</Label>
                <Switch id="fireToggle" checked={isFireEnabled} onCheckedChange={setIsFireEnabled} />
            </div>
            {isFireEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                    <Label htmlFor="fireBaseColor" className="text-sm font-medium">Base Color</Label>
                     <div className="flex items-center gap-2 mt-1">
                        <Input id="fireBaseColor" type="color" value={fireBaseColor} onChange={(e) => setFireBaseColor(e.target.value)} className="p-1 h-10 w-12 rounded-md border-input" />
                        <span className="text-sm text-muted-foreground">{fireBaseColor.toUpperCase()}</span>
                    </div>
                </div>
                <div>
                    <Label htmlFor="fireAccentColor" className="text-sm font-medium">Accent Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                        <Input id="fireAccentColor" type="color" value={fireAccentColor} onChange={(e) => setFireAccentColor(e.target.value)} className="p-1 h-10 w-12 rounded-md border-input" />
                        <span className="text-sm text-muted-foreground">{fireAccentColor.toUpperCase()}</span>
                    </div>
                </div>
                <div>
                    <Label htmlFor="fireOpacity" className="text-sm font-medium">Opacity</Label>
                    <Slider id="fireOpacity" min={0} max={1} step={0.01} value={[fireOpacity]} onValueChange={(v) => setFireOpacity(v[0])} />
                     <span className="text-xs text-muted-foreground text-center block mt-1">{fireOpacity.toFixed(2)}</span>
                </div>
                <div>
                    <Label htmlFor="fireSpread" className="text-sm font-medium">Size (Spread)</Label>
                    <Slider id="fireSpread" min={0.1} max={3} step={0.1} value={[fireSpread]} onValueChange={(v) => setFireSpread(v[0])} />
                    <span className="text-xs text-muted-foreground text-center block mt-1">{fireSpread.toFixed(1)}</span>
                </div>
                <div>
                    <Label htmlFor="fireSpeed" className="text-sm font-medium">Speed</Label>
                    <Slider id="fireSpeed" min={0.005} max={0.2} step={0.005} value={[fireSpeed]} onValueChange={(v) => setFireSpeed(v[0])} />
                    <span className="text-xs text-muted-foreground text-center block mt-1">{fireSpeed.toFixed(3)}</span>
                </div>
                <div>
                    <Label htmlFor="fireDensity" className="text-sm font-medium">Count (Intensity)</Label>
                    <Slider id="fireDensity" min={100} max={5000} step={50} value={[fireDensity]} onValueChange={(v) => setFireDensity(v[0])} />
                    <span className="text-xs text-muted-foreground text-center block mt-1">{fireDensity}</span>
                </div>
                <div>
                    <Label htmlFor="fireTurbulence" className="text-sm font-medium">Turbulence</Label>
                    <Slider id="fireTurbulence" min={0} max={5} step={0.1} value={[fireTurbulence]} onValueChange={(v) => setFireTurbulence(v[0])} />
                    <span className="text-xs text-muted-foreground text-center block mt-1">{fireTurbulence.toFixed(1)}</span>
                </div>
                <div>
                    <Label htmlFor="fireBlendMode" className="text-sm font-medium">Blend Mode</Label>
                     <Select value={fireBlendMode} onValueChange={(value: BlendMode) => setFireBlendMode(value)}>
                        <SelectTrigger id="fireBlendMode"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {blendModeOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div>
                    <Label htmlFor="fireSource" className="text-sm font-medium">Particle Source</Label>
                    <Select value={fireParticleSource} onValueChange={(value: ParticleSource) => setFireParticleSource(value)}>
                        <SelectTrigger id="fireSource"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {particleSourceOptions.map(option => 
                                <SelectItem key={option.value} value={option.value}>
                                    <div className="flex items-center"><option.icon className="mr-2 h-4 w-4"/>{option.label}</div>
                                </SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                </div>
                </div>
            )}
          </TabsContent>

          <TabsContent value="media" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button onClick={() => setIsPlaying(!isPlaying)} variant="outline" className="w-full">
                  {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                {!isRecording ? (
                    <Button onClick={onStartRecording} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                    <CircleDot className="mr-2 h-4 w-4" /> Record
                    </Button>
                ) : (
                    <Button onClick={onStopRecording} variant="destructive" className="w-full">
                    <StopCircle className="mr-2 h-4 w-4" /> Stop
                    </Button>
                )}
                <Button 
                    onClick={onDownloadRecording} 
                    variant="outline" 
                    className="w-full"
                    disabled={!recordedVideoUrl || !mediaRecorderRef.current}
                >
                    <Download className="mr-2 h-4 w-4" /> 
                    Save
                </Button>
            </div>
             {recordedVideoUrl && (
                <div className="mt-4">
                    <Label className="text-sm font-medium">Preview:</Label>
                    <video src={recordedVideoUrl} controls className="w-full rounded-md mt-1 max-h-60 aspect-video bg-muted"></video>
                </div>
            )}
          </TabsContent>
        </Tabs>
      </SidebarContent>
    </Sidebar>
  );
};

export default ControlsPanel;