// Night race: a pop-up-headlight coupe at speed. Depth comes from parallax:
// far skyline (slowest), elevated highway with distant traffic, near
// skyline, guardrail and streetlights, then lane dashes (fastest).
// All art original.

import { type Frame, type Gfx } from "../dots/gfx.ts";
import type { Scene } from "./types.ts";

// Facing right. "*" = accent (pop-up headlights, tail light).
const CAR: Frame = [
  "...........###########.........",
  ".........##.....#......##......",
  "..*#####################****##.",
  ".#############################*",
  "###############################",
  "##.....############.......####.",
];
const WHEEL: Frame[] = [
  [".###.", "#..##", "#.#.#", "##..#", ".###."],
  [".###.", "##..#", "#.#.#", "#..##", ".###."],
];
const PUFF: Frame[] = [["#"], [".#.", "#.#", ".#."]];
const MOON: Frame = ["..###.", ".##...", "##....", "##....", "##....", ".##...", "..###."];

// Skylines as data: [x, width, height]. Tiled every 192 dots.
const FAR_CITY: [number, number, number][] = [
  [0, 6, 6],
  [7, 4, 9],
  [12, 8, 5],
  [21, 5, 11],
  [27, 7, 7],
  [35, 4, 13],
  [40, 9, 6],
  [50, 5, 10],
  [56, 7, 8],
  [64, 4, 14],
  [69, 10, 6],
  [80, 6, 9],
  [87, 5, 12],
  [93, 8, 7],
  [102, 4, 10],
  [107, 9, 5],
  [117, 6, 13],
  [124, 5, 8],
  [130, 8, 11],
  [139, 4, 6],
  [144, 7, 9],
  [152, 5, 15],
  [158, 9, 7],
  [168, 6, 10],
  [175, 5, 8],
  [181, 10, 12],
];
const NEAR_CITY: [number, number, number][] = [
  [0, 18, 9],
  [20, 12, 15],
  [34, 22, 7],
  [58, 14, 17],
  [74, 10, 11],
  [86, 20, 8],
  [108, 12, 16],
  [122, 24, 10],
  [148, 14, 13],
  [164, 10, 7],
  [176, 16, 14],
];

const FAR_BASE = 18; // far skyline sits on the elevated highway
const HIGHWAY = 19;
const NEAR_BASE = 30;
const RAIL = 31;
const GROUND = 44; // wheels rest here
const CAR_X = 56;

// Deterministic "random" so windows don't flicker every frame.
const hash = (n: number) => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};

const scroll = (x: number, offset: number, period = 192) =>
  ((((x - offset) % period) + period) % period) - (period - 192);

export function racer(): Scene {
  let f = 0;
  let puffs: { x: number; y: number; age: number }[] = [];

  const city = (
    g: Gfx,
    blocks: [number, number, number][],
    base: number,
    offset: number,
    windowChance: number,
    outline: boolean,
  ) => {
    for (const [bx, bw, bh] of blocks) {
      for (let rep = -1; rep <= 1; rep++) {
        const x = bx - (offset % 192) + rep * 192;
        if (x > g.w || x + bw < 0) continue;
        const top = base - bh;
        g.fill(x, top, bw, bh, 0); // occlude whatever is behind
        g.line(x, top, x + bw - 1, top);
        if (outline) {
          g.line(x, top, x, base);
          g.line(x + bw - 1, top, x + bw - 1, base);
        }
        for (let wy = top + 2; wy < base - 1; wy += 2)
          for (let wx = x + 2; wx < x + bw - 2; wx += 2)
            if (hash(bx * 31 + wx - x + wy * 7) > windowChance) g.set(wx, wy, 2);
      }
    }
  };

  return {
    step() {
      f++;
      if (f % 3 === 0) puffs.push({ x: CAR_X - 2, y: GROUND - 3, age: 0 });
      puffs = puffs.map((p) => ({ ...p, x: p.x - 3, age: p.age + 1 })).filter((p) => p.x > -4);
    },

    draw(g: Gfx) {
      g.clear();

      // Sky.
      for (let i = 0; i < 26; i++) {
        if ((f + i * 5) % 29 === 0) continue;
        g.set(Math.floor(hash(i) * g.w), Math.floor(hash(i + 50) * 9));
      }
      g.blit(MOON, 168, 1);

      // Far skyline: tops and windows only, crawls 1 dot / 6 ticks.
      city(g, FAR_CITY, FAR_BASE, Math.floor(f / 6), 0.78, false);

      // Elevated highway with distant traffic (tail lights left, headlights right).
      g.line(0, HIGHWAY, g.w - 1, HIGHWAY);
      for (let i = 0; i < 6; i++) {
        const x = scroll(i * 37, -Math.floor(f / 2), 222);
        g.set(x, HIGHWAY - 1, 2);
        g.set(x + 1, HIGHWAY - 1, 2);
        const y = scroll(i * 41 + 20, Math.floor(f * 0.7), 246);
        g.set(y, HIGHWAY + 1, 1);
      }
      for (let x = ((-Math.floor(f / 3) % 24) + 24) % 24; x < g.w; x += 24)
        g.line(x, HIGHWAY, x, HIGHWAY + 3);

      // Near skyline: outlined, 1 dot / 2 ticks.
      city(g, NEAR_CITY, NEAR_BASE, Math.floor(f / 2), 0.6, true);

      // Guardrail on the far side of the road: posts rush by.
      g.line(0, RAIL, g.w - 1, RAIL);
      for (let x = -((f * 4) % 8); x < g.w; x += 8) g.line(x, RAIL, x, RAIL + 2);

      // Streetlights: poles, lamp heads, and a pool of light on the road.
      for (let k = 0; k < 2; k++) {
        const x = scroll(k * 96, f * 5, 192);
        g.fill(x - 1, 6, 3, RAIL - 6, 0);
        g.line(x, 6, x, RAIL + 2);
        g.line(x, 6, x + 6, 6);
        g.fill(x + 6, 7, 3, 1, 2);
        for (let i = -6; i <= 14; i += 2)
          g.set(x + 3 + i, RAIL + 4 + (Math.abs(i - 4) > 8 ? 1 : 0), 2);
      }

      // Exhaust.
      for (const p of puffs) g.blit(PUFF[p.age > 1 ? 1 : 0], p.x, p.y - (p.age > 1 ? 1 : 0));

      // Car, with a little suspension bounce; wheels stay planted.
      const cy = GROUND - 8 + (f % 8 === 0 ? -1 : 0);
      g.blit(CAR, CAR_X, cy, undefined, true);
      const wf = WHEEL[f % 2];
      g.blit(wf, CAR_X + 2, GROUND - 5, undefined, true);
      g.blit(wf, CAR_X + 21, GROUND - 5, undefined, true);

      // Headlight beam: dotted fan ahead of the car.
      for (let i = 0; i < 44; i += 2) {
        const bx = CAR_X + 33 + i + (f % 2);
        g.set(bx, cy + 2 + Math.floor(i / 14), 2);
        if (i > 4) g.set(bx, cy + 3 + Math.floor(i / 6), 2);
      }

      // Road edge and lane dashes (fastest layer).
      g.line(0, GROUND, g.w - 1, GROUND);
      const dash = (f * 7) % 20;
      for (let x = -dash; x < g.w; x += 20) g.line(x, 46, x + 9, 46);
    },
  };
}
