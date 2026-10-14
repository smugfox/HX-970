// Warp-speed starfield, the 90s screensaver classic.

import { DOT_H, DOT_W } from "../dots/gfx.ts";
import type { Scene } from "./types.ts";

type Star = { x: number; y: number; z: number };

const CX = DOT_W / 2;
const CY = DOT_H / 2;
const COUNT = 90;

const spawn = (z = 1): Star => ({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z });

const project = (s: Star) => ({
  x: CX + (s.x / s.z) * (DOT_W * 0.3),
  y: CY + (s.y / s.z) * (DOT_H * 0.38),
});

export function warp(): Scene {
  let stars: Star[] = [];
  let f = 0;

  return {
    step() {
      f++;
      if (stars.length === 0)
        stars = Array.from({ length: COUNT }, () => spawn(0.1 + Math.random() * 0.9));
      // Speed surges and eases off.
      const speed = 0.05 + 0.04 * (0.5 + 0.5 * Math.sin(f / 18));
      stars = stars.map((s) => {
        const next = { ...s, z: s.z - speed };
        const p = project(next);
        return next.z < 0.05 || p.x < 0 || p.x >= DOT_W || p.y < 0 || p.y >= DOT_H ? spawn() : next;
      });
    },

    draw(g) {
      g.clear();
      if (stars.length === 0)
        stars = Array.from({ length: COUNT }, () => spawn(0.1 + Math.random() * 0.9));
      for (const s of stars) {
        const a = project(s);
        const b = project({ ...s, z: s.z + 0.12 });
        const near = s.z < 0.3;
        g.line(b.x, b.y, a.x, a.y, near ? 2 : 1);
      }
    },
  };
}
