
export type BlendMode = "Normal" | "Additive" | "Subtractive" | "Multiply";
export type ParticleSource = "Center" | "Mouse" | "Bottom";

export interface SimulationPreset {
  name: string;
  description?: string;
  isSmokeEnabled: boolean;
  smokeDensity: number; // Renamed to Particle Count in UI
  smokeBaseColor: string;
  smokeAccentColor: string;
  smokeSpeed: number;
  smokeSpread: number; // Renamed to Particle Size in UI
  smokeBlendMode: BlendMode;
  smokeSource: ParticleSource;
  smokeOpacity: number;
  smokeTurbulence: number;

  isFireEnabled: boolean;
  fireBaseColor: string;
  fireAccentColor: string;
  fireDensity: number; // Renamed to Particle Count in UI
  fireSpeed: number;
  fireSpread: number; // Renamed to Particle Size in UI
  fireParticleSource: ParticleSource;
  fireBlendMode: BlendMode;
  fireOpacity: number;
  fireTurbulence: number;

  backgroundColor: string;
  windDirectionX: number; // Horizontal wind direction (-1 to 1)
  windStrength: number; // Wind strength (e.g., 0 to 0.1)
}

