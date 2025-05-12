"use client";

import React from 'react';
import type { Dispatch, SetStateAction, MutableRefObject } from 'react';
import type { SimulationPreset, BlendMode, ParticleSource } from './types';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger as SidebarToggle,
} from "@/components/ui/sidebar";
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
  Palette, // Base Color / Scene
  Paintbrush, // Accent Color
  Wind, // Wind
  ChevronsUp, // Buoyancy
  LocateFixed, // Particle Source (Center)
  MousePointer2, // Correct icon for mouse source
  ArrowDownToLine, // Particle Source (Bottom)
  Layers2, // Dissipation / Opacity
  Gauge, // Speed
  Maximize2, // Size/Spread
  Users, // Count/Density
  Waves, // Turbulence
  Type, // Text input icon
  Pin, // Persist Text icon
  Info // Tooltip icon
} from "lucide-react";

// Helper component for sliders with tooltips and numeric display
interface ControlSliderProps {
  id: string;
  label: string;
  tooltip: string;
  icon?: React.ElementType;
  min: number;
  max: number;
  step: number;
  value: number;
  onValueChange: (value: number) => void;
  unit?: string;
  decimals?: number;
}

const ControlSlider: React.FC<ControlSliderProps> = ({ id, label, tooltip, icon: Icon, min, max, step, value, onValueChange, unit = '', decimals = 2 }) => (
  <TooltipProvider delayDuration={100}>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor={id} className="text-sm font-medium flex items-center">
              {Icon && <Icon className="mr-1.5 h-3.5 w-3.5" />}
              {label}
            </Label>
            <span className="text-xs text-muted-foreground">{value.toFixed(decimals)}{unit}</span>
          </div>
          <Slider
            id={id}
            min={min}
            max={max}
            step={step}
            value={[value]}
            onValueChange={(v) => onValueChange(v[0])}
            aria-label={`${label} slider`}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" align="center">
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

interface ControlsPanelProps {
  // Smoke Props
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
  particleText: string; // New prop for text shaping
  setParticleText: Dispatch<SetStateAction<string>>; // New prop setter
  persistTextShape: boolean; // New state for persisting text shape
  setPersistTextShape: Dispatch<SetStateAction<boolean>>; // Setter for persist state

  // Fire Props
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

  // Scene Props
  backgroundColor: string;
  setBackgroundColor: Dispatch<SetStateAction<string>>;
  windDirectionX: number;
  setWindDirectionX: Dispatch<SetStateAction<number>>;
  windStrength: number;
  setWindStrength: Dispatch<SetStateAction<number>>;

  // Media Props
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onDownloadRecording: () => void;
  recordedVideoUrl: string | null;
  isPlaying: boolean;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
  mediaRecorderRef: MutableRefObject<MediaRecorder | null>;

  // Presets
  presets: SimulationPreset[];
  onApplyPreset: (preset: SimulationPreset) => void;
}

const ControlsPanel: React.FC<ControlsPanelProps> = ({
  // Smoke Props
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
  particleText, setParticleText, // Destructure new props
  persistTextShape, setPersistTextShape, // Destructure persist props

  // Fire Props
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

  // Scene Props
  backgroundColor, setBackgroundColor,
  windDirectionX, setWindDirectionX,
  windStrength, setWindStrength,

  // Media Props
  isRecording, onStartRecording, onStopRecording, onDownloadRecording, recordedVideoUrl,
  isPlaying, setIsPlaying,
  mediaRecorderRef,

  // Presets
  presets, onApplyPreset
}) => {
  const particleSourceOptions: { value: ParticleSource; label: string; icon: React.ElementType; tooltip: string }[] = [
    { value: "Bottom", label: "Bottom", icon: ArrowDownToLine, tooltip: "Particles originate from the bottom edge." },
    { value: "Center", label: "Center", icon: LocateFixed, tooltip: "Particles originate from the center." },
    { value: "Mouse", label: "Mouse", icon: MousePointer2, tooltip: "Particles follow the mouse cursor." },
  ];

  const blendModeOptions: { value: BlendMode; label: string; tooltip: string }[] = [
    { value: "Normal", label: "Normal", tooltip: "Standard alpha blending." },
    { value: "Additive", label: "Additive", tooltip: "Brighter where particles overlap (good for fire, energy)." },
    { value: "Subtractive", label: "Subtractive", tooltip: "Darker where particles overlap (uncommon)." },
    { value: "Multiply", label: "Multiply", tooltip: "Darkens based on particle color (can create shadows)." },
  ];

  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon" className="border-r bg-card text-card-foreground">
      <SidebarHeader className="p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <CardTitle className="text-lg flex items-center m-0">
            <Settings2 className="mr-2 h-5 w-5 text-primary" /> Simulation Controls
          </CardTitle>
          <SidebarToggle />
        </div>
      </SidebarHeader>
      <SidebarContent className="p-3 space-y-4 overflow-y-auto">
        <TooltipProvider delayDuration={100}>
          <div>
            <Label htmlFor="presetSelect" className="text-sm font-medium mb-1 block">Preset</Label>
            <Select onValueChange={(value) => {
              const selectedPreset = presets.find(p => p.name === value);
              if (selectedPreset) {
                onApplyPreset(selectedPreset);
                // Apply preset text & persist setting
                setParticleText(selectedPreset.particleText || '');
                setPersistTextShape(selectedPreset.persistTextShape ?? false);
              }
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

          {/* --- Scene Controls --- */}
          <div className="space-y-3 pt-2 border-t border-border">
            <Label className="text-base font-semibold flex items-center"><Palette className="mr-2 h-4 w-4 text-primary" />Scene</Label>
            <div className="grid grid-cols-1 gap-y-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Label htmlFor="backgroundColor" className="text-sm font-medium">Background Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="backgroundColor"
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="p-1 h-8 w-8 rounded-md border-input cursor-pointer"
                        aria-label="Background color picker"
                      />
                      <span className="text-xs text-muted-foreground">{backgroundColor.toUpperCase()}</span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" align="center">
                  <p>Set the background color of the simulation canvas.</p>
                </TooltipContent>
              </Tooltip>
              <ControlSlider
                id="windDirectionX"
                label="Wind Direction X"
                tooltip="Horizontal wind direction (-1 left, 1 right)."
                icon={Wind}
                min={-1} max={1} step={0.01}
                value={windDirectionX} onValueChange={setWindDirectionX}
                decimals={2}
              />
              <ControlSlider
                id="windStrength"
                label="Wind Strength"
                tooltip="How strongly the wind affects particles."
                icon={Wind}
                min={0} max={0.05} step={0.001}
                value={windStrength} onValueChange={setWindStrength}
                decimals={3}
              />
            </div>
          </div>

          {/* --- Tabs --- */}
          <Tabs defaultValue="smoke" className="w-full pt-2 border-t border-border">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="smoke"><Cloud className="mr-1.5 h-4 w-4" />Smoke</TabsTrigger>
              <TabsTrigger value="fire"><Flame className="mr-1.5 h-4 w-4" />Fire</TabsTrigger>
              <TabsTrigger value="media"><Video className="mr-1.5 h-4 w-4" />Media</TabsTrigger>
            </TabsList>

            {/* --- Smoke Tab --- */}
            <TabsContent value="smoke" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="smokeToggle" className="text-base font-semibold">Enable Smoke</Label>
                <Switch id="smokeToggle" checked={isSmokeEnabled} onCheckedChange={setIsSmokeEnabled} />
              </div>
              {isSmokeEnabled && (
                <div className="grid grid-cols-1 gap-y-3">
                  {/* Color Pickers */}
                  <div className="grid grid-cols-2 gap-4">
                    <Tooltip>
                      <TooltipTrigger asChild>
                         <div>
                            <Label htmlFor="smokeBaseColor" className="text-sm font-medium flex items-center"><Palette className="mr-1.5 h-3.5 w-3.5"/>Base Color</Label>
                            <div className="flex items-center gap-2 mt-1">
                                <Input id="smokeBaseColor" type="color" value={smokeBaseColor} onChange={(e) => setSmokeBaseColor(e.target.value)} className="p-1 h-8 w-8 rounded-md border-input cursor-pointer" />
                                <span className="text-xs text-muted-foreground">{smokeBaseColor.toUpperCase()}</span>
                            </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="center"><p>The main color of the smoke particles.</p></TooltipContent>
                    </Tooltip>
                     <Tooltip>
                       <TooltipTrigger asChild>
                        <div>
                            <Label htmlFor="smokeAccentColor" className="text-sm font-medium flex items-center"><Paintbrush className="mr-1.5 h-3.5 w-3.5"/>Accent Color</Label>
                            <div className="flex items-center gap-2 mt-1">
                                <Input id="smokeAccentColor" type="color" value={smokeAccentColor} onChange={(e) => setSmokeAccentColor(e.target.value)} className="p-1 h-8 w-8 rounded-md border-input cursor-pointer" />
                                <span className="text-xs text-muted-foreground">{smokeAccentColor.toUpperCase()}</span>
                            </div>
                        </div>
                       </TooltipTrigger>
                       <TooltipContent side="top" align="center"><p>A secondary color blended randomly for variation.</p></TooltipContent>
                    </Tooltip>
                  </div>
                  {/* Sliders */}
                  <ControlSlider id="smokeOpacity" label="Opacity" tooltip="Overall transparency of smoke particles (0=invisible, 1=opaque)." icon={Layers2} min={0} max={1} step={0.01} value={smokeOpacity} onValueChange={setSmokeOpacity} decimals={2} />
                  <ControlSlider id="smokeSpread" label="Size (Spread)" tooltip="Average size and spread area of smoke particles." icon={Maximize2} min={0.1} max={5} step={0.1} value={smokeSpread} onValueChange={setSmokeSpread} decimals={1} />
                  <ControlSlider id="smokeSpeed" label="Speed" tooltip="Base upward speed of smoke particles." icon={Gauge} min={0.001} max={0.1} step={0.001} value={smokeSpeed} onValueChange={setSmokeSpeed} decimals={3} />
                  <ControlSlider id="smokeDensity" label="Count (Density)" tooltip="Number of smoke particles simulated (max 8000)." icon={Users} min={100} max={8000} step={100} value={smokeDensity} onValueChange={setSmokeDensity} decimals={0} />
                  <ControlSlider id="smokeTurbulence" label="Turbulence" tooltip="Amount of chaotic, swirling motion applied." icon={Waves} min={0} max={5} step={0.1} value={smokeTurbulence} onValueChange={setSmokeTurbulence} decimals={1} />
                  <ControlSlider id="smokeDissipation" label="Dissipation" tooltip="How quickly particles fade out (0=slow, 1=fast)." icon={Layers2} min={0} max={1} step={0.01} value={smokeDissipation} onValueChange={setSmokeDissipation} decimals={2} />
                  <ControlSlider id="smokeBuoyancy" label="Buoyancy" tooltip="How strongly particles rise (simulates heat)." icon={ChevronsUp} min={0} max={0.05} step={0.001} value={smokeBuoyancy} onValueChange={setSmokeBuoyancy} decimals={3} />

                  {/* Selects */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Label htmlFor="smokeBlendMode" className="text-sm font-medium">Blend Mode</Label>
                        <Select value={smokeBlendMode} onValueChange={(value: BlendMode) => setSmokeBlendMode(value)}>
                          <SelectTrigger id="smokeBlendMode"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {blendModeOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center">
                      <p>How particle colors mix when overlapping. Additive is often good for fire/light.</p>
                      <p>Current: {blendModeOptions.find(o => o.value === smokeBlendMode)?.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Label htmlFor="smokeSource" className="text-sm font-medium">Particle Source</Label>
                        <Select value={smokeSource} onValueChange={(value: ParticleSource) => setSmokeSource(value)} disabled={!!particleText}>
                          <SelectTrigger id="smokeSource"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {particleSourceOptions.map(option =>
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center"><option.icon className="mr-2 h-4 w-4" />{option.label}</div>
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {!!particleText && <p className="text-xs text-muted-foreground mt-1">Source overridden by text input.</p>}
                      </div>
                    </TooltipTrigger>
                     <TooltipContent side="top" align="center">
                       <p>Where new particles originate. Disabled if text shaping is active.</p>
                       <p>Current: {particleSourceOptions.find(o => o.value === smokeSource)?.tooltip}</p>
                     </TooltipContent>
                  </Tooltip>

                   {/* Text Shaping Input */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div>
                                <Label htmlFor="particleTextSmoke" className="text-sm font-medium flex items-center"><Type className="mr-1.5 h-3.5 w-3.5" />Particle Text</Label>
                                <Textarea
                                    id="particleTextSmoke"
                                    placeholder="Enter text..."
                                    value={particleText}
                                    onChange={(e) => setParticleText(e.target.value)}
                                    className="mt-1 text-sm"
                                    rows={2}
                                />
                                <p className="text-xs text-muted-foreground mt-1">If text is entered, particles will form this shape, overriding the 'Particle Source' setting.</p>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="center">
                            <p>Make particles form the shape of this text. Clears the 'Particle Source' setting.</p>
                        </TooltipContent>
                    </Tooltip>

                     {/* Persist Text Shape Switch */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center justify-between mt-2">
                                <Label htmlFor="persistTextShapeSmoke" className="text-sm font-medium flex items-center">
                                    <Pin className="mr-1.5 h-3.5 w-3.5" />
                                    Persist Text Shape
                                </Label>
                                <Switch
                                    id="persistTextShapeSmoke"
                                    checked={persistTextShape}
                                    onCheckedChange={setPersistTextShape}
                                    disabled={!particleText} // Disable if no text is entered
                                />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="center">
                            <p>Keep particles in the text shape indefinitely. Requires text to be entered.</p>
                        </TooltipContent>
                    </Tooltip>

                </div>
              )}
            </TabsContent>

            {/* --- Fire Tab --- */}
            <TabsContent value="fire" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="fireToggle" className="text-base font-semibold">Enable Fire</Label>
                <Switch id="fireToggle" checked={isFireEnabled} onCheckedChange={setIsFireEnabled} />
              </div>
              {isFireEnabled && (
                 <div className="grid grid-cols-1 gap-y-3">
                   {/* Color Pickers */}
                   <div className="grid grid-cols-2 gap-4">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                              <Label htmlFor="fireBaseColor" className="text-sm font-medium flex items-center"><Palette className="mr-1.5 h-3.5 w-3.5"/>Base Color</Label>
                              <div className="flex items-center gap-2 mt-1">
                                  <Input id="fireBaseColor" type="color" value={fireBaseColor} onChange={(e) => setFireBaseColor(e.target.value)} className="p-1 h-8 w-8 rounded-md border-input cursor-pointer" />
                                  <span className="text-xs text-muted-foreground">{fireBaseColor.toUpperCase()}</span>
                              </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="center"><p>The main color of the fire particles.</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                         <TooltipTrigger asChild>
                            <div>
                              <Label htmlFor="fireAccentColor" className="text-sm font-medium flex items-center"><Paintbrush className="mr-1.5 h-3.5 w-3.5"/>Accent Color</Label>
                              <div className="flex items-center gap-2 mt-1">
                                  <Input id="fireAccentColor" type="color" value={fireAccentColor} onChange={(e) => setFireAccentColor(e.target.value)} className="p-1 h-8 w-8 rounded-md border-input cursor-pointer" />
                                  <span className="text-xs text-muted-foreground">{fireAccentColor.toUpperCase()}</span>
                              </div>
                          </div>
                         </TooltipTrigger>
                         <TooltipContent side="top" align="center"><p>A secondary color blended randomly for variation.</p></TooltipContent>
                      </Tooltip>
                    </div>

                  {/* Sliders */}
                  <ControlSlider id="fireOpacity" label="Opacity" tooltip="Overall transparency of fire particles." icon={Layers2} min={0} max={1} step={0.01} value={fireOpacity} onValueChange={setFireOpacity} decimals={2} />
                  <ControlSlider id="fireSpread" label="Size (Spread)" tooltip="Average size and spread area of fire particles." icon={Maximize2} min={0.1} max={3} step={0.1} value={fireSpread} onValueChange={setFireSpread} decimals={1} />
                  <ControlSlider id="fireSpeed" label="Speed" tooltip="Base upward speed of fire particles." icon={Gauge} min={0.005} max={0.2} step={0.005} value={fireSpeed} onValueChange={setFireSpeed} decimals={3} />
                  <ControlSlider id="fireDensity" label="Count (Intensity)" tooltip="Number of fire particles (max 5000)." icon={Users} min={100} max={5000} step={50} value={fireDensity} onValueChange={setFireDensity} decimals={0} />
                  <ControlSlider id="fireTurbulence" label="Turbulence" tooltip="Amount of chaotic, flickering motion." icon={Waves} min={0} max={5} step={0.1} value={fireTurbulence} onValueChange={setFireTurbulence} decimals={1} />

                  {/* Selects */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Label htmlFor="fireBlendMode" className="text-sm font-medium">Blend Mode</Label>
                        <Select value={fireBlendMode} onValueChange={(value: BlendMode) => setFireBlendMode(value)}>
                          <SelectTrigger id="fireBlendMode"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {blendModeOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center">
                      <p>How particle colors mix. Additive is recommended for fire.</p>
                       <p>Current: {blendModeOptions.find(o => o.value === fireBlendMode)?.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                     <TooltipTrigger asChild>
                      <div>
                        <Label htmlFor="fireSource" className="text-sm font-medium">Particle Source</Label>
                        <Select value={fireParticleSource} onValueChange={(value: ParticleSource) => setFireParticleSource(value)} disabled={!!particleText}>
                          <SelectTrigger id="fireSource"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {particleSourceOptions.map(option =>
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center"><option.icon className="mr-2 h-4 w-4" />{option.label}</div>
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                         {!!particleText && <p className="text-xs text-muted-foreground mt-1">Source overridden by text input.</p>}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center">
                      <p>Where new particles originate. Disabled if text shaping is active.</p>
                      <p>Current: {particleSourceOptions.find(o => o.value === fireParticleSource)?.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>

                   {/* Text Shaping Input (Shared state with Smoke tab) */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div>
                                <Label htmlFor="particleTextFire" className="text-sm font-medium flex items-center"><Type className="mr-1.5 h-3.5 w-3.5" />Particle Text</Label>
                                <Textarea
                                    id="particleTextFire"
                                    placeholder="Enter text..."
                                    value={particleText}
                                    onChange={(e) => setParticleText(e.target.value)}
                                    className="mt-1 text-sm"
                                    rows={2}
                                />
                                <p className="text-xs text-muted-foreground mt-1">If text is entered, particles will form this shape, overriding the 'Particle Source' setting.</p>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="center">
                            <p>Make particles form the shape of this text. Clears the 'Particle Source' setting.</p>
                        </TooltipContent>
                    </Tooltip>

                     {/* Persist Text Shape Switch (Shared state) */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center justify-between mt-2">
                                <Label htmlFor="persistTextShapeFire" className="text-sm font-medium flex items-center">
                                    <Pin className="mr-1.5 h-3.5 w-3.5" />
                                    Persist Text Shape
                                </Label>
                                <Switch
                                    id="persistTextShapeFire"
                                    checked={persistTextShape}
                                    onCheckedChange={setPersistTextShape}
                                    disabled={!particleText}
                                />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="center">
                             <p>Keep particles in the text shape indefinitely. Requires text to be entered.</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
              )}
            </TabsContent>

            {/* --- Media Tab --- */}
            <TabsContent value="media" className="mt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Tooltip>
                     <TooltipTrigger asChild>
                        <Button onClick={() => setIsPlaying(!isPlaying)} variant="outline" className="w-full">
                          {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                          {isPlaying ? 'Pause' : 'Play'}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center"><p>{isPlaying ? 'Pause the simulation.' : 'Resume the simulation.'}</p></TooltipContent>
                  </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            { !isRecording ? (
                                <Button onClick={onStartRecording} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                                <CircleDot className="mr-2 h-4 w-4" /> Record
                                </Button>
                            ) : (
                                <Button onClick={onStopRecording} variant="destructive" className="w-full">
                                <StopCircle className="mr-2 h-4 w-4" /> Stop
                                </Button>
                            )}
                        </TooltipTrigger>
                         <TooltipContent side="top" align="center"><p>{isRecording ? 'Stop recording the simulation.' : 'Start recording the simulation to a video file.'}</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                         <TooltipTrigger asChild>
                            <Button
                                onClick={onDownloadRecording}
                                variant="outline"
                                className="w-full"
                                disabled={!recordedVideoUrl || !mediaRecorderRef.current}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Save
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="center"><p>Download the recorded simulation video (if available).</p></TooltipContent>
                    </Tooltip>
                </div>
                 {recordedVideoUrl && (
                    <div className="mt-4">
                        <Label className="text-sm font-medium">Preview:</Label>
                        <video src={recordedVideoUrl} controls className="w-full rounded-md mt-1 max-h-60 aspect-video bg-muted"></video>
                    </div>
                )}
            </TabsContent>
          </Tabs>
        </TooltipProvider>
      </SidebarContent>
    </Sidebar>
  );
};

export default ControlsPanel;
