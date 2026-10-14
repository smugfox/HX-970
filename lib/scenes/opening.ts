// Power-on sequence: lamp test, then a typewriter WELCOME and model name.

import { DOT_W, textWidth } from "../dots/gfx.ts";
import type { Scene } from "./types.ts";

const LAMP_TICKS = 10;
const LINE1 = "WELCOME";
const LINE2 = "HX-970";

export function opening(): Scene {
  let f = 0;
  return {
    step() {
      f++;
    },
    draw(g) {
      if (f < LAMP_TICKS) {
        g.clear(1);
        return;
      }
      g.clear();
      const t = f - LAMP_TICKS;
      const shown = Math.min(LINE1.length, Math.floor(t / 2));
      const x1 = Math.floor((DOT_W - textWidth(LINE1, false, 2)) / 2);
      g.text(LINE1.slice(0, shown), x1, 4, 1, 2);
      // Blinking block cursor while typing.
      if (shown < LINE1.length && t % 2 === 0) g.fill(x1 + shown * 12, 4, 10, 14);

      if (t > LINE1.length * 2 + 2) {
        const x2 = Math.floor((DOT_W - textWidth(LINE2)) / 2);
        g.text(LINE2, x2, 30, 2);
      }
      // Accent rules sweep out from the centre.
      const half = Math.min(DOT_W / 2, Math.max(0, (t - 6) * 8));
      g.line(DOT_W / 2 - half, 23, DOT_W / 2 + half - 1, 23);
      if (t > LINE1.length * 2 + 2) g.line(DOT_W / 2 - half, 43, DOT_W / 2 + half - 1, 43);
    },
  };
}
