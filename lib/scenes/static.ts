// Between-stations static: dense random dots with rolling tear lines.

import type { Scene } from "./types.ts";

export function staticNoise(): Scene {
  let f = 0;
  return {
    step() {
      f++;
    },
    draw(g) {
      g.clear();
      const tear = (f * 5) % (g.h + 8);
      for (let y = 0; y < g.h; y++) {
        const torn = Math.abs(y - tear) < 2;
        for (let x = 0; x < g.w; x++) {
          const r = Math.random();
          if (torn ? r < 0.75 : r < 0.3) g.set(x, y, r < 0.015 ? 2 : 1);
        }
      }
    },
  };
}
