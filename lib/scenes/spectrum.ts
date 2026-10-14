// The spectrum analyzer, drawn on the dot matrix so it shares the same dot
// pitch as the animations. Two looks:
//   spectrum - 32 flat bars, 16 segments, accent peak caps
//   eq3d     - bars in perspective, converging to a vanishing point, with a
//              compressed top zone in the accent ink and a printed Hz legend

import { textWidth, type Gfx, type Ink } from "../dots/gfx.ts";
import { Meter } from "../meter.ts";
import type { Scene, SceneInput } from "./types.ts";

const BANDS = 32;
const PITCH = 6; // dots per band column (4 lit + 2 gap) -> 192 wide
const BAR_W = 4;

const idle = (n: number) => new Array<number>(n).fill(0);

/** Flat bars: 16 segments of 2 rows + 1 gap. */
export function spectrum(input: SceneInput): Scene {
  const SEGS = 16;
  const meter = new Meter(BANDS, SEGS);
  return {
    step() {
      meter.update((input.sample ?? idle)(BANDS));
    },
    draw(g: Gfx) {
      g.clear();
      for (let i = 0; i < BANDS; i++) {
        const x = i * PITCH + 1;
        const seg = (k: number, ink: Ink) => g.fill(x, g.h - 2 - k * 3, BAR_W, 2, ink);
        for (let k = 0; k < meter.levels[i]; k++) seg(k, 1);
        const p = meter.peaks[i];
        if (p > meter.levels[i] && p > 0) seg(p - 1, 2);
      }
    },
  };
}

const LABEL_ROW = 43;
const FLOOR = 40;
const SEGS_3D = 14;
const HOT = 4; // top segments lit in the accent ink
const CONVERGE = 0.38; // how much bars narrow toward the top

/** Band centre frequency (matches AudioEngine's log spacing). */
const hz = (b: number) => 40 * Math.pow(16000 / 40, (b + 0.5) / BANDS);
const hzLabel = (b: number) => {
  const f = hz(b);
  return f >= 900 ? `${Math.round(f / 1000)}K` : String(Math.round(f / 10) * 10);
};

/** Perspective bars. */
export function eq3d(input: SceneInput): Scene {
  const meter = new Meter(BANDS, SEGS_3D);
  // Row for height fraction t (0 floor .. 1 top): segments compress as they rise.
  const rowOf = (t: number) => Math.round(FLOOR - FLOOR * ((t * (1 - 0.3 * t)) / 0.7));
  return {
    step() {
      meter.update((input.sample ?? idle)(BANDS));
    },
    draw(g: Gfx) {
      g.clear();
      const cx = g.w / 2;
      // Each band column, measured at the floor.
      const span = (i: number, t: number) => {
        const k = 1 - CONVERGE * t;
        const left = cx + (i * PITCH + 1 - cx) * k;
        return [Math.round(left), Math.max(1, Math.round(BAR_W * k))] as const;
      };
      for (let i = 0; i < BANDS; i++) {
        const lit = meter.levels[i];
        const peak = meter.peaks[i];
        for (let k = 0; k < SEGS_3D; k++) {
          const on = k < lit;
          const cap = !on && k === peak - 1 && peak > 0;
          if (!on && !cap) continue;
          const t0 = k / SEGS_3D;
          const t1 = (k + 1) / SEGS_3D;
          const yBottom = rowOf(t0);
          const yTop = Math.min(yBottom, rowOf(t1) + 2); // the row above stays dark as a gap
          for (let y = yTop; y <= yBottom; y++) {
            const t = t0 + ((yBottom - y) / Math.max(1, yBottom - yTop)) * (t1 - t0);
            const [x, w] = span(i, t);
            g.fill(x, y, w, 1, cap || k >= SEGS_3D - HOT ? 2 : 1);
          }
        }
      }
      // Floor line and Hz legend.
      for (let x = 0; x < g.w; x += 2) g.set(x, FLOOR + 1);
      for (let b = 1; b < BANDS; b += 4) {
        const label = hzLabel(b);
        const x = b * PITCH + 3 - Math.floor(textWidth(label, true) / 2);
        g.small(label, x, LABEL_ROW, 2);
      }
    },
  };
}
