import type { Gfx } from "../dots/gfx.ts";

/**
 * A dot-matrix scene. `step` advances one tick (called at the DotMatrix fps),
 * `draw` renders the current state into the framebuffer. Scenes own their
 * state, so create a fresh one per mount with the factory.
 */
export interface Scene {
  step(): void;
  draw(g: Gfx): void;
  /** Optional interaction (click / tap on the display). */
  poke?(): void;
}

/** Live data a scene can read (the analyzer scenes use `sample`). */
export type SceneInput = {
  /** `n` band levels in 0..1, log-spaced 40Hz-16kHz. */
  sample?: (n: number) => number[];
};

export type SceneFactory = (input: SceneInput) => Scene;
