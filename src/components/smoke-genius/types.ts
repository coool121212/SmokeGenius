
export type BlendMode = "Normal" | "Additive" | "Subtractive" | "Multiply";
export type ParticleSource = "Center" | "Mouse" | "Bottom";

export interface SimulationPreset {
  name: string;
  description?: string;
  isSmokeEnabled: boolean;
  smokeDensity: number;
  smokeColor: string;
  smokeSpeed: number;
  smokeSpread: number;
  smokeBlendMode: BlendMode;
  smokeSource: ParticleSource;
  isFireEnabled: boolean;
  fireColor: string;
  fireDensity: number;
  fireSpeed: number;
  fireSpread: number;
  backgroundColor: string;
}
