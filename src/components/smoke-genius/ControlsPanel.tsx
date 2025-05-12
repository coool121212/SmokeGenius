
"use client";

import React from 'react';
import type { Dispatch, SetStateAction, MutableRefObject } from 'react';
import type { SimulationPreset, BlendMode, ParticleSource } from './types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  ArrowDownToLine, 
  MousePointer2, 
  LocateFixed, 
  Wind,
  CloudOff, 
  ChevronsUp,
  Palette, 
  Paintbrush, 
  Layers, 
  Maximize, 
  Gauge, 
  Users, 
  Waves, 
  Blend, 
  Wand2, 
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

  const renderTooltip = (content: string, children: React.ReactNode) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent><p>{content}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

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
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 mb-6">
              <div>
                {renderTooltip("Load pre-configured settings for different visual effects.",
                  <Label className="font-semibold text-sm mb-1 block flex items-center"><Wand2 className="w-4 h-4 mr-1.5 text-primary/80"/>Simulation Preset</Label>
                )}
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
                {renderTooltip("Changes the background color of the simulation canvas.",
                  <Label htmlFor="backgroundColor" className="font-semibold text-sm mb-1 block flex items-center"><Palette className="w-4 h-4 mr-1.5 text-primary/80"/>Background Color</Label>
                )}
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
              <div className="lg:col-span-1 grid grid-cols-2 gap-x-4">
                <div>
                  {renderTooltip("Controls the horizontal direction of the wind. Negative values for left, positive for right.",
                    <Label htmlFor="windDirectionX" className="font-semibold text-sm mb-1 block flex items-center">
                      <Wind className="w-4 h-4 mr-1.5 text-primary/80"/> Wind Dir.
                    </Label>
                  )}
                  <Slider id="windDirectionX" min={-1} max={1} step={0.01} value={[windDirectionX]} onValueChange={(v) => setWindDirectionX(v[0])} aria-label="Wind Direction (Horizontal)"/>
                  <span className="text-xs text-muted-foreground text-center block mt-1">{windDirectionX.toFixed(2)}</span>
                </div>
                <div>
                  {renderTooltip("Controls the strength of the wind effect.",
                    <Label htmlFor="windStrength" className="font-semibold text-sm mb-1 block flex items-center">
                     <Wind className="w-4 h-4 mr-1.5 text-primary/80"/> Wind Str.
                    </Label>
                  )}
                  <Slider id="windStrength" min={0} max={0.05} step={0.001} value={[windStrength]} onValueChange={(v) => setWindStrength(v[0])} aria-label="Wind Strength"/>
                  <span className="text-xs text-muted-foreground text-center block mt-1">{windStrength.toFixed(3)}</span>
                </div>
              </div>
            </div>

            <Tabs defaultValue="smoke" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
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
                  <div className="space-y-6">
                    {/* Visuals Group */}
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Visual Properties</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                        <div className="lg:col-span-2">
                          {renderTooltip("Main color of smoke particles.",
                            <Label htmlFor="smokeBaseColor" className="font-semibold text-sm mb-1 block flex items-center"><Palette className="w-4 h-4 mr-1.5 text-primary/80"/>Base Color</Label>
                          )}
                          <div className="flex items-center gap-2">
                            <Input id="smokeBaseColor" type="color" value={smokeBaseColor} onChange={(e) => setSmokeBaseColor(e.target.value)} className="w-10 h-10 p-1 cursor-pointer" aria-label="Smoke particle base color" />
                            <span className="text-sm text-muted-foreground">{smokeBaseColor.toUpperCase()}</span>
                          </div>
                        </div>
                        <div className="lg:col-span-2">
                           {renderTooltip("Secondary color mixed into smoke for variation.",
                            <Label htmlFor="smokeAccentColor" className="font-semibold text-sm mb-1 block flex items-center"><Paintbrush className="w-4 h-4 mr-1.5 text-primary/80"/>Accent Color</Label>
                           )}
                          <div className="flex items-center gap-2">
                            <Input id="smokeAccentColor" type="color" value={smokeAccentColor} onChange={(e) => setSmokeAccentColor(e.target.value)} className="w-10 h-10 p-1 cursor-pointer" aria-label="Smoke particle accent color" />
                            <span className="text-sm text-muted-foreground">{smokeAccentColor.toUpperCase()}</span>
                          </div>
                        </div>
                        <div>
                          {renderTooltip("How transparent the smoke is. 0 is fully transparent, 1 is fully opaque.",
                            <Label htmlFor="smokeOpacity" className="font-semibold text-sm mb-1 block flex items-center"><Layers className="w-4 h-4 mr-1.5 text-primary/80"/>Opacity</Label>
                          )}
                          <Slider id="smokeOpacity" min={0} max={1} step={0.01} value={[smokeOpacity]} onValueChange={(v) => setSmokeOpacity(v[0])} aria-label="Smoke particle opacity"/>
                          <span className="text-xs text-muted-foreground text-center block mt-1">{smokeOpacity.toFixed(2)}</span>
                        </div>
                        <div>
                          {renderTooltip("Overall size and spread of smoke particles.",
                            <Label htmlFor="smokeParticleSize" className="font-semibold text-sm mb-1 block flex items-center"><Maximize className="w-4 h-4 mr-1.5 text-primary/80"/>Size</Label>
                          )}
                          <Slider id="smokeParticleSize" min={0.5} max={5} step={0.1} value={[smokeSpread]} onValueChange={(v) => setSmokeSpread(v[0])} aria-label="Smoke particle size (spread)" />
                          <span className="text-xs text-muted-foreground text-center block mt-1">{smokeSpread.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                    <Separator/>
                     {/* Behavior Group */}
                    <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Behavior Properties</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                            <div>
                                {renderTooltip("How fast smoke particles move, primarily upwards.",
                                  <Label htmlFor="smokeSpeed" className="font-semibold text-sm mb-1 block flex items-center"><Gauge className="w-4 h-4 mr-1.5 text-primary/80"/>Speed</Label>
                                )}
                                <Slider id="smokeSpeed" min={0.005} max={0.1} step={0.005} value={[smokeSpeed]} onValueChange={(v) => setSmokeSpeed(v[0])} aria-label="Smoke particle speed" />
                                <span className="text-xs text-muted-foreground text-center block mt-1">{smokeSpeed.toFixed(3)}</span>
                            </div>
                            <div>
                                {renderTooltip("Number of smoke particles generated. Higher values mean denser smoke.",
                                  <Label htmlFor="smokeParticleCount" className="font-semibold text-sm mb-1 block flex items-center"><Users className="w-4 h-4 mr-1.5 text-primary/80"/>Count</Label>
                                )}
                                <Slider id="smokeParticleCount" min={100} max={8000} step={100} value={[smokeDensity]} onValueChange={(v) => setSmokeDensity(v[0])} aria-label="Smoke particle count (density)"/>
                                <span className="text-xs text-muted-foreground text-center block mt-1">{smokeDensity}</span>
                            </div>
                            <div>
                                {renderTooltip("Amount of chaotic, swirling motion in the smoke.",
                                  <Label htmlFor="smokeTurbulence" className="font-semibold text-sm mb-1 block flex items-center"><Waves className="w-4 h-4 mr-1.5 text-primary/80"/>Turbulence</Label>
                                )}
                                <Slider id="smokeTurbulence" min={0} max={5} step={0.1} value={[smokeTurbulence]} onValueChange={(v) => setSmokeTurbulence(v[0])} aria-label="Smoke turbulence"/>
                                <span className="text-xs text-muted-foreground text-center block mt-1">{smokeTurbulence.toFixed(1)}</span>
                            </div>
                        </div>
                    </div>
                    <Separator/>
                    {/* Physics & Rendering Group */}
                    <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Physics & Rendering</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                            <div>
                                {renderTooltip("Rate at which smoke fades away over time.",
                                  <Label htmlFor="smokeDissipation" className="font-semibold text-sm mb-1 block flex items-center"><CloudOff className="w-4 h-4 mr-1.5 text-primary/80"/> Dissipation</Label>
                                )}
                                <Slider id="smokeDissipation" min={0} max={1} step={0.01} value={[smokeDissipation]} onValueChange={(v) => setSmokeDissipation(v[0])} aria-label="Smoke dissipation rate"/>
                                <span className="text-xs text-muted-foreground text-center block mt-1">{smokeDissipation.toFixed(2)}</span>
                            </div>
                            <div>
                                {renderTooltip("Upward force acting on smoke particles, simulating heat rise.",
                                  <Label htmlFor="smokeBuoyancy" className="font-semibold text-sm mb-1 block flex items-center"><ChevronsUp className="w-4 h-4 mr-1.5 text-primary/80"/> Buoyancy</Label>
                                )}
                                <Slider id="smokeBuoyancy" min={0} max={0.05} step={0.001} value={[smokeBuoyancy]} onValueChange={(v) => setSmokeBuoyancy(v[0])} aria-label="Smoke buoyancy force"/>
                                <span className="text-xs text-muted-foreground text-center block mt-1">{smokeBuoyancy.toFixed(3)}</span>
                            </div>
                            <div>
                                {renderTooltip("Determines how smoke color interacts with the colors behind it.",
                                  <Label className="font-semibold text-sm mb-1 block flex items-center"><Blend className="w-4 h-4 mr-1.5 text-primary/80"/>Blend Mode</Label>
                                )}
                                <Select value={smokeBlendMode} onValueChange={(value: BlendMode) => setSmokeBlendMode(value)}>
                                <SelectTrigger aria-label="Smoke blend mode"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {blendModeOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                                </SelectContent>
                                </Select>
                            </div>
                            <div>
                                {renderTooltip("Where new smoke particles originate from in the scene.",
                                  <Label className="font-semibold text-sm mb-1 block flex items-center"><particleSourceOptions.find(opt => opt.value === smokeSource)?.icon className="w-4 h-4 mr-1.5 text-primary/80" default={LocateFixed}/>Particle Source</Label>
                                )}
                                <Select value={smokeSource} onValueChange={(value: ParticleSource) => setSmokeSource(value)}>
                                <SelectTrigger aria-label="Smoke particle source"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {particleSourceOptions.map(option => <SelectItem key={option.value} value={option.value}><div className="flex items-center gap-2"><option.icon className="w-4 h-4" />{option.label}</div></SelectItem>)}
                                </SelectContent>
                                </Select>
                            </div>
                        </div>
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
                   <div className="space-y-6">
                     {/* Visuals Group */}
                    <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Visual Properties</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                            <div className="lg:col-span-2">
                                {renderTooltip("Main color of fire particles.",
                                  <Label htmlFor="fireBaseColor" className="font-semibold text-sm mb-1 block flex items-center"><Palette className="w-4 h-4 mr-1.5 text-primary/80"/>Base Color</Label>
                                )}
                                <div className="flex items-center gap-2">
                                    <Input id="fireBaseColor" type="color" value={fireBaseColor} onChange={(e) => setFireBaseColor(e.target.value)} className="w-10 h-10 p-1 cursor-pointer" aria-label="Fire particle base color" />
                                    <span className="text-sm text-muted-foreground">{fireBaseColor.toUpperCase()}</span>
                                </div>
                            </div>
                            <div className="lg:col-span-2">
                                {renderTooltip("Secondary color for fire variation (e.g., embers, hotter core).",
                                  <Label htmlFor="fireAccentColor" className="font-semibold text-sm mb-1 block flex items-center"><Paintbrush className="w-4 h-4 mr-1.5 text-primary/80"/>Accent Color</Label>
                                )}
                                <div className="flex items-center gap-2">
                                    <Input id="fireAccentColor" type="color" value={fireAccentColor} onChange={(e) => setFireAccentColor(e.target.value)} className="w-10 h-10 p-1 cursor-pointer" aria-label="Fire particle accent color" />
                                    <span className="text-sm text-muted-foreground">{fireAccentColor.toUpperCase()}</span>
                                </div>
                            </div>
                            <div>
                                {renderTooltip("How transparent the fire is. 0 is fully transparent, 1 is fully opaque.",
                                  <Label htmlFor="fireOpacity" className="font-semibold text-sm mb-1 block flex items-center"><Layers className="w-4 h-4 mr-1.5 text-primary/80"/>Opacity</Label>
                                )}
                                <Slider id="fireOpacity" min={0} max={1} step={0.01} value={[fireOpacity]} onValueChange={(v) => setFireOpacity(v[0])} aria-label="Fire particle opacity"/>
                                <span className="text-xs text-muted-foreground text-center block mt-1">{fireOpacity.toFixed(2)}</span>
                            </div>
                            <div>
                                {renderTooltip("Overall size and spread of fire particles.",
                                  <Label htmlFor="fireParticleSize" className="font-semibold text-sm mb-1 block flex items-center"><Maximize className="w-4 h-4 mr-1.5 text-primary/80"/>Size</Label>
                                )}
                                <Slider id="fireParticleSize" min={0.2} max={3} step={0.1} value={[fireSpread]} onValueChange={(v) => setFireSpread(v[0])} aria-label="Fire particle size (spread)" />
                                <span className="text-xs text-muted-foreground text-center block mt-1">{fireSpread.toFixed(1)}</span>
                            </div>
                        </div>
                    </div>
                    <Separator/>
                    {/* Behavior Group */}
                    <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Behavior Properties</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                            <div>
                                {renderTooltip("How fast fire particles move, primarily upwards.",
                                  <Label htmlFor="fireSpeed" className="font-semibold text-sm mb-1 block flex items-center"><Gauge className="w-4 h-4 mr-1.5 text-primary/80"/>Speed</Label>
                                )}
                                <Slider id="fireSpeed" min={0.01} max={0.2} step={0.005} value={[fireSpeed]} onValueChange={(v) => setFireSpeed(v[0])} aria-label="Fire particle speed" />
                                <span className="text-xs text-muted-foreground text-center block mt-1">{fireSpeed.toFixed(3)}</span>
                            </div>
                            <div>
                                {renderTooltip("Intensity/number of fire particles. Higher values mean more intense fire.",
                                  <Label htmlFor="fireParticleCount" className="font-semibold text-sm mb-1 block flex items-center"><Users className="w-4 h-4 mr-1.5 text-primary/80"/>Count</Label>
                                )}
                                <Slider id="fireParticleCount" min={100} max={5000} step={50} value={[fireDensity]} onValueChange={(v) => setFireDensity(v[0])} aria-label="Fire particle count (intensity)"/>
                                <span className="text-xs text-muted-foreground text-center block mt-1">{fireDensity}</span>
                            </div>
                            <div>
                                {renderTooltip("Amount of flickering and chaotic motion in the fire.",
                                  <Label htmlFor="fireTurbulence" className="font-semibold text-sm mb-1 block flex items-center"><Waves className="w-4 h-4 mr-1.5 text-primary/80"/>Turbulence</Label>
                                )}
                                <Slider id="fireTurbulence" min={0} max={5} step={0.1} value={[fireTurbulence]} onValueChange={(v) => setFireTurbulence(v[0])} aria-label="Fire turbulence"/>
                                <span className="text-xs text-muted-foreground text-center block mt-1">{fireTurbulence.toFixed(1)}</span>
                            </div>
                        </div>
                    </div>
                    <Separator/>
                    {/* Source & Rendering Group */}
                    <div>
                         <h4 className="text-sm font-medium text-muted-foreground mb-2">Source & Rendering</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                            <div>
                                {renderTooltip("Determines how fire color interacts with the colors behind it.",
                                  <Label className="font-semibold text-sm mb-1 block flex items-center"><Blend className="w-4 h-4 mr-1.5 text-primary/80"/>Blend Mode</Label>
                                )}
                                <Select value={fireBlendMode} onValueChange={(value: BlendMode) => setFireBlendMode(value)}>
                                <SelectTrigger aria-label="Fire blend mode"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {blendModeOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                                </SelectContent>
                                </Select>
                            </div>
                            <div>
                                {renderTooltip("Where new fire particles originate from in the scene.",
                                  <Label className="font-semibold text-sm mb-1 block flex items-center"><particleSourceOptions.find(opt => opt.value === fireParticleSource)?.icon className="w-4 h-4 mr-1.5 text-primary/80" default={LocateFixed}/>Particle Source</Label>
                                )}
                                <Select value={fireParticleSource} onValueChange={(value: ParticleSource) => setFireParticleSource(value)}>
                                <SelectTrigger aria-label="Fire particle source"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {particleSourceOptions.map(option => <SelectItem key={option.value} value={option.value}><div className="flex items-center gap-2"><option.icon className="w-4 h-4" />{option.label}</div></SelectItem>)}
                                </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="media">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 items-end">
                  {renderTooltip("Toggle simulation playback.",
                    <Button onClick={() => setIsPlaying(!isPlaying)} variant="outline" className="w-full">
                      {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                      {isPlaying ? 'Pause Simulation' : 'Play Simulation'}
                    </Button>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Video className="w-5 h-5 text-primary" /> Recording
                    </div>
                    {!isRecording ? (
                       renderTooltip("Start capturing the simulation as a video.",
                        <Button onClick={onStartRecording} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                          <CircleDot className="mr-2 h-4 w-4" /> Start Recording
                        </Button>
                       )
                    ) : (
                      renderTooltip("Stop the current video recording.",
                        <Button onClick={onStopRecording} variant="destructive" className="w-full">
                          <StopCircle className="mr-2 h-4 w-4" /> Stop Recording
                        </Button>
                      )
                    )}
                    {recordedVideoUrl && (
                      renderTooltip("Download the recorded video.",
                        <Button 
                          onClick={onDownloadRecording} 
                          variant="outline" 
                          className="w-full"
                          disabled={!mediaRecorderRef.current}
                        >
                          <Download className="mr-2 h-4 w-4" /> 
                          Download {mediaRecorderRef.current?.mimeType.includes('mp4') ? 'MP4' : 'WebM'}
                        </Button>
                      )
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

    