
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
  isFireEnabled: boolean;
  fireBaseColor: string;
  fireAccentColor: string;
  fireDensity: number;
  fireSpeed: number;
  fireSpread: number;
  fireParticleSource: ParticleSource;
  fireBlendMode: BlendMode;
  backgroundColor: string;
}

