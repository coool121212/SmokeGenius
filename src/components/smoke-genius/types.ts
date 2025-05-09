
export interface SimulationPreset {
  name: string;
  description?: string;
  isSmokeEnabled: boolean;
  smokeDensity: number;
  smokeColor: string;
  smokeSpeed: number;
  smokeSpread: number;
  isFireEnabled: boolean;
  fireColor: string;
  fireDensity: number;
  fireSpeed: number;
  fireSpread: number;
  backgroundColor: string;
}
