
export type BlendMode = "Normal" | "Additive" | "Subtractive" | "Multiply";
export type ParticleSource = "Center" | "Mouse" | "Bottom";

export interface SimulationPreset {
  name: string;
  description?: string;
  particleText?: string; // New: Optional text for shaping

  // Smoke
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
  smokeDissipation: number;
  smokeBuoyancy: number;

  // Fire
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

  // Scene
  backgroundColor: string;
  windDirectionX: number;
  windStrength: number;
}
```