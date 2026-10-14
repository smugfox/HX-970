// Dolphins leaping over a rolling sea at sunset. Homage to late-90s
// Pioneer demo screens; all art original.
//
// Depth comes from layering: drifting cloud streaks, far gulls and far
// dolphins near the horizon, ripples that widen and speed up toward the
// viewer, and big near dolphins in front.

import { type Frame, type Gfx } from "../dots/gfx.ts";
import type { Scene } from "./types.ts";

// Near dolphin, hand-drawn poses facing right. Rising / diving tilt a row.
const LEVEL: Frame = [
  "...........#.............",
  "##........###............",
  ".#........########.......",
  "..#..#################...",
  "..################..#####",
  "..###################..##",
  "..#....#############.....",
  ".#.........#######.......",
  "##...........###.........",
  ".............#...........",
];
const RISE: Frame = [
  "...........#.............",
  "..........###...##.......",
  "##........############...",
  ".#......##########..#####",
  "..#..################..##",
  "..##################.....",
  "..#...############.......",
  ".#.......#######.........",
  "##..........###..........",
  ".............#...........",
];
const DIVE: Frame = [
  "##.........#.............",
  ".#........###............",
  "..#..###..#######........",
  "..################.......",
  "..####################...",
  "..#....###########..#####",
  ".#......#############..##",
  "##.........#########.....",
  ".............###.........",
  ".............#...........",
];

// Far dolphin: a few dots at the horizon.
const FAR: Frame = [".....#....", "#..######.", ".#########", "#...###..."];

const GULL_NEAR: Frame[] = [
  ["#...#", ".#.#.", "..#.."],
  [".....", "##.##", "..#.."],
];
const GULL_FAR: Frame[] = [
  ["#.#", ".#."],
  ["...", "###"],
];

const HORIZON = 22;
const SUN_X = 150;
const SUN_R = 16;

type Jumper = { x: number; offset: number; speed: number };
type Drop = { x: number; y: number; vx: number; vy: number; floor: number };

export function dolphin(): Scene {
  let f = 0;
  // Near pod (big, fast arcs) and far pod (tiny, slow, at the horizon).
  const near: Jumper[] = [
    { x: 10, offset: 0, speed: 1 },
    { x: 70, offset: 21, speed: 1 },
  ];
  const far: Jumper[] = [
    { x: 40, offset: 9, speed: 0.5 },
    { x: 120, offset: 30, speed: 0.5 },
  ];
  const nearGulls = [{ x: 60, y: 4 }];
  const farGulls = [
    { x: 30, y: 9 },
    { x: 100, y: 6 },
    { x: 118, y: 11 },
  ];
  const clouds = [
    { x: 10, y: 5, w: 34 },
    { x: 80, y: 9, w: 22 },
    { x: 130, y: 3, w: 40 },
    { x: 170, y: 12, w: 18 },
  ];
  let drops: Drop[] = [];

  const NEAR_WATER = 40;
  const FAR_WATER = HORIZON + 4;
  const NEAR_CYCLE = 44;
  const NEAR_JUMP = 26;
  const FAR_CYCLE = 50;
  const FAR_JUMP = 16;

  const splash = (x: number, floor: number, n: number, power: number) => {
    for (let i = 0; i < n; i++)
      drops.push({
        x,
        y: floor - 1,
        vx: (Math.random() - 0.5) * 2.6 * power,
        vy: (-1.2 - Math.random() * 1.6) * power,
        floor,
      });
  };

  const wrap = (x: number, w: number) => (x > w + 30 ? -30 : x);

  return {
    step() {
      f++;
      for (const p of near) {
        p.x = wrap(p.x + p.speed, 192);
        const t = (f + p.offset) % NEAR_CYCLE;
        if (t === 1) splash(p.x + 18, NEAR_WATER, 6, 1);
        if (t === NEAR_JUMP - 1) splash(p.x + 12, NEAR_WATER, 7, 1);
      }
      for (const p of far) {
        p.x = wrap(p.x + p.speed, 192);
        const t = (f + p.offset) % FAR_CYCLE;
        if (t === FAR_JUMP - 1) splash(p.x + 5, FAR_WATER, 2, 0.4);
      }
      if (f % 2 === 0) for (const g of nearGulls) g.x = g.x < -8 ? 196 : g.x - 1;
      if (f % 5 === 0) for (const g of farGulls) g.x = g.x < -4 ? 194 : g.x - 1;
      if (f % 6 === 0) for (const c of clouds) c.x = c.x < -c.w ? 192 : c.x - 1;
      drops = drops
        .map((d) => ({ ...d, x: d.x + d.vx, y: d.y + d.vy, vy: d.vy + 0.4 }))
        .filter((d) => d.y < d.floor);
    },

    draw(g: Gfx) {
      g.clear();

      // Cloud streaks: dotted, so they read as thin haze.
      for (const c of clouds) for (let i = 0; i < c.w; i += 2) g.set(c.x + i + (c.y % 2), c.y);

      // Setting sun with synthwave cut lines that thicken toward the horizon.
      for (let y = HORIZON - SUN_R; y < HORIZON; y++) {
        const d = HORIZON - y;
        if (d < 9 && d % 3 === (d < 5 ? 1 : 0)) continue;
        if (d < 4 && d % 2 === 0) continue;
        const half = Math.floor(Math.sqrt(SUN_R * SUN_R - d * d));
        for (let x = SUN_X - half; x <= SUN_X + half; x++) g.set(x, y, 2);
      }

      for (const gl of farGulls) g.blit(GULL_FAR[Math.floor(f / 4 + gl.x) % 2], gl.x, gl.y);
      for (const gl of nearGulls) g.blit(GULL_NEAR[Math.floor(f / 3) % 2], gl.x, gl.y);

      // Horizon.
      g.line(0, HORIZON, g.w - 1, HORIZON);

      // Sea: ripple rows get further apart, longer and faster toward the
      // viewer. Sun glitter widens the same way.
      for (let y = HORIZON + 2; y < g.h;) {
        const depth = (y - HORIZON) / (g.h - HORIZON); // 0 far .. 1 near
        const period = Math.round(16 + depth * 26);
        const len = 2 + Math.round(depth * 6);
        const drift = Math.round(f * (0.3 + depth * 2)) * (y % 2 ? 1 : -1);
        const seed = (y * y * 7) % period;
        const glitterHalf = 4 + depth * 22;
        for (let x = 0; x < g.w; x++) {
          const k = (x + seed + drift + 10000) % period;
          const glitter = Math.abs(x - SUN_X) < glitterHalf;
          if (glitter ? k % 4 < 2 && (x + y + f) % 3 !== 0 : k < len) g.set(x, y, glitter ? 2 : 1);
        }
        y += 1 + Math.round(depth * 4);
      }

      // Far dolphins jump just past the horizon; clipped at their waterline.
      for (const p of far) {
        const t = (f + p.offset) % FAR_CYCLE;
        if (t >= FAR_JUMP) continue;
        const q = t / (FAR_JUMP - 1);
        const y = FAR_WATER - 2 - Math.round(Math.sin(Math.PI * q) * 6);
        g.clip = { x0: 0, y0: 0, x1: g.w, y1: FAR_WATER };
        g.blit(FAR, p.x, y, undefined, true);
        g.clip = null;
      }

      // Near dolphins: big arcs, fin cutting the water between jumps.
      for (const p of near) {
        const t = (f + p.offset) % NEAR_CYCLE;
        let top = NEAR_WATER - 2;
        let pose = LEVEL;
        if (t < NEAR_JUMP) {
          const q = t / (NEAR_JUMP - 1);
          top = NEAR_WATER - 2 - Math.round(Math.sin(Math.PI * q) * 24);
          pose = q < 0.36 ? RISE : q > 0.64 ? DIVE : LEVEL;
        }
        g.clip = { x0: 0, y0: 0, x1: g.w, y1: NEAR_WATER };
        g.blit(pose, p.x, top, undefined, true);
        g.clip = null;
        // Wake where the body meets the water.
        if (t >= NEAR_JUMP || t < 3 || t > NEAR_JUMP - 4)
          for (let i = -2; i < 26; i += 3) g.set(p.x + i + (f % 3), NEAR_WATER);
      }

      for (const d of drops) g.set(d.x, d.y, 1);
    },
  };
}
