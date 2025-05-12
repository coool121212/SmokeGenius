
export type BlendMode = "Normal" | "Additive" | "Subtractive" | "Multiply";
export type ParticleSource = "Center" | "Mouse" | "Bottom";

export interface SimulationPreset {
  name: string;
  description?: string;
  isSmokeEnabled: boolean;
  smokeDensity: number; 
  smokeBaseColor: string;
  smokeAccentColor: string;
  smokeSpeed: number;
  smokeSpread: number; 
  smokeBlendMode: BlendMode;
  smokeSource: ParticleSource;
  smokeOpacity: number;
  smokeTurbulence: number;
  smokeDissipation: number; // New: 0 (slow) to 1 (fast)
  smokeBuoyancy: number; // New: 0 (none) to ~0.05 (strong)

  isFireEnabled: boolean;
  fireBaseColor: string;
  fireAccentColor: string;
  fireDensity: number; 
  fireSpeed: number;
  fireSpread: number; 
  fireParticleSource: ParticleSource;
  fireBlendMode: BlendMode;
  fireOpacity: number;
  fireTurbulence: number;

  backgroundColor: string;
  windDirectionX: number; 
  windStrength: number; 
}

