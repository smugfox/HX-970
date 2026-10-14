// Scene registry. Add a scene by writing a factory in this folder and
// listing it here; the head unit's MODE cycle and DEMO pick it up.

import { aqua } from "./aqua.ts";
import { dolphin } from "./dolphin.ts";
import { opening } from "./opening.ts";
import { racer } from "./racer.ts";
import { slots } from "./slots.ts";
import { eq3d, spectrum } from "./spectrum.ts";
import { staticNoise } from "./static.ts";
import type { SceneFactory } from "./types.ts";
import { warp } from "./warp.ts";

export const SCENES = {
  spectrum: { label: "SPECTRUM", create: spectrum, fps: 12 },
  eq3d: { label: "3D EQ", create: eq3d, fps: 12 },
  dolphin: { label: "DOLPHIN", create: dolphin },
  racer: { label: "RACER", create: racer },
  slots: { label: "SLOTS", create: slots, interactive: true },
  aqua: { label: "AQUA", create: aqua },
  warp: { label: "WARP", create: warp },
  opening: { label: "HELLO", create: opening },
  static: { label: "TUNING", create: staticNoise },
} satisfies Record<
  string,
  { label: string; create: SceneFactory; interactive?: boolean; fps?: number }
>;

export type SceneName = keyof typeof SCENES;
