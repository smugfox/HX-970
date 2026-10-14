// Display EQ presets. Each is a per-band gain curve applied to analyzer
// levels (band 0 = lowest). Legends follow the boxed preset labels printed
// on late-90s faceplates.

export type EqName = "S.BASS" | "PWRFL" | "NTRL" | "VOCAL" | "CUSTOM";

export const EQ_ORDER: EqName[] = ["S.BASS", "PWRFL", "NTRL", "VOCAL", "CUSTOM"];

export function eqGain(eq: EqName, band: number, bands: number) {
  const x = band / (bands - 1);
  switch (eq) {
    case "S.BASS":
      return 0.85 + 0.75 * Math.exp(-x * 5);
    case "PWRFL":
      return 0.9 + 0.45 * Math.exp(-x * 6) + 0.45 * Math.exp((x - 1) * 6);
    case "VOCAL":
      return 0.7 + 0.55 * Math.exp(-Math.pow((x - 0.5) / 0.18, 2));
    case "CUSTOM":
      return 0.8 + x * 0.45;
    default:
      return 1;
  }
}
