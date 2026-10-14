// Aquarium. Depth comes from layers: light rays and drifting specks at the
// back, a slow far school, mid-water angelfish and jellyfish, big fish up
// front, and a busy floor (weed, rocks, chest, a crab).

import { mirror, type Frame, type Gfx } from "../dots/gfx.ts";
import type { Scene } from "./types.ts";

const FISH: Frame[] = [
  [
    "......####...",
    "#...########.",
    "##.#######.##",
    "#############",
    "##.##########",
    "#...########.",
    "......####...",
  ],
  [
    "......####...",
    "....########.",
    "#.########.##",
    "#############",
    "#.###########",
    "....########.",
    "......####...",
  ],
];
const MINNOW: Frame[] = [
  ["#.###.", "######", "#.###."],
  [".####.", "######", ".####."],
];
const ANGEL: Frame[] = [
  ["....*..", "...***.", "*.*****", "*******", "*.*****", "...***.", "....*.."],
  ["....*..", "...***.", ".******", "*******", ".******", "...***.", "....*.."],
];
const JELLY: Frame[] = [
  [
    "..#####..",
    ".#######.",
    "#########",
    "#.#.#.#.#",
    "..#.#.#..",
    ".#..#..#.",
    "..#.#.#..",
    ".#..#..#.",
    "..#...#..",
  ],
  [
    "..#####..",
    ".#######.",
    "#########",
    ".#.#.#.#.",
    ".#.#.#.#.",
    "..#.#.#..",
    ".#.#.#.#.",
    "..#...#..",
    ".........",
  ],
];
const CRAB: Frame[] = [
  ["*.......*", ".*.***.*.", "..*****..", ".*.*.*.*.", "*.......*"],
  [".*.....*.", "**.***.**", "..*****..", "*.*.*.*.*", "........."],
];
const WEED: Frame[] = [
  [".#.", "#..", ".#.", "..#", ".#.", "#..", ".#.", "..#"],
  ["..#", ".#.", "#..", ".#.", "..#", ".#.", "#..", ".#."],
];
const CHEST: Frame = [
  ".*********.",
  "*.........*",
  "***********",
  "*....*....*",
  "*...***...*",
  "*.........*",
  "***********",
];
const BUBBLE: Frame[] = [["#"], [".#.", "#.#", ".#."]];

const FLOOR = 43;

type Swimmer = { x: number; y: number; dir: 1 | -1; every: number };
type Bubble = { x: number; y: number; age: number };

export function aqua(): Scene {
  let f = 0;
  const big: Swimmer[] = [
    { x: -14, y: 22, dir: 1, every: 1 },
    { x: 150, y: 31, dir: -1, every: 2 },
  ];
  const angel: Swimmer = { x: 200, y: 12, dir: -1, every: 2 };
  const jelly = { x: 128, y: 14 };
  const crab = { x: 20, dir: 1 as 1 | -1 };
  let bubbles: Bubble[] = [];

  const move = (s: Swimmer, min: number, max: number) => {
    if (f % s.every) return;
    s.x += s.dir;
    if (s.x > max) s.dir = -1;
    if (s.x < min) s.dir = 1;
  };

  return {
    step() {
      f++;
      big.forEach((b) => move(b, -16, 196));
      move(angel, -10, 200);
      // Jelly: pulses up, sinks slowly.
      const pulse = Math.floor(f / 4) % 4 === 0;
      jelly.y = pulse ? jelly.y - 1 : f % 3 === 0 ? jelly.y + 1 : jelly.y;
      if (jelly.y < 2) jelly.y = 2;
      if (jelly.y > 26) jelly.y = 26;
      jelly.x += f % 7 === 0 ? -1 : 0;
      if (jelly.x < -10) jelly.x = 196;
      // Crab scuttles back and forth along the sand.
      if (f % 2 === 0) {
        crab.x += crab.dir;
        if (crab.x > 70 || crab.x < 4) crab.dir = crab.dir === 1 ? -1 : 1;
      }
      // Chest burps a stream of bubbles every few seconds.
      if (f % 40 < 10 && f % 2 === 0) bubbles.push({ x: 106 + (f % 3), y: FLOOR - 6, age: 0 });
      for (const b of big)
        if (f % 18 === 0 && b.x > 0 && b.x < 179)
          bubbles.push({ x: b.dir > 0 ? b.x + 13 : b.x - 1, y: b.y + 2, age: 0 });
      bubbles = bubbles
        .map((b) => ({
          ...b,
          age: b.age + 1,
          y: b.y - 1,
          x: b.x + (b.age % 6 < 3 ? 0 : 1) - (b.age % 6 === 5 ? 1 : 0),
        }))
        .filter((b) => b.y > 0);
    },

    draw(g: Gfx) {
      g.clear();

      // Surface shimmer.
      for (let x = 0; x < g.w; x += 2) g.set(x, (x + f) % 12 < 6 ? 0 : 1);

      // Light rays slanting down from the surface, drifting slowly.
      for (let k = 0; k < 4; k++) {
        const x0 = 20 + k * 48 + Math.round(Math.sin(f / 30 + k) * 6);
        for (let y = 3; y < FLOOR; y += 3) g.set(x0 + Math.round(y * 0.45), y);
        for (let y = 5; y < FLOOR - 10; y += 4) g.set(x0 + 3 + Math.round(y * 0.45), y);
      }

      // Back layer: drifting specks.
      for (let i = 0; i < 18; i++) {
        const x = (i * 53 + Math.floor(f / 4)) % g.w;
        const y = 4 + ((i * 29 + Math.floor(f / 9)) % 36);
        g.set(x, y);
      }

      // Far school: small, slow, in a loose V heading left.
      const sx = g.w - (Math.floor(f / 2) % (g.w + 60));
      [
        [0, 0],
        [9, -3],
        [9, 3],
        [18, -6],
        [18, 6],
        [27, -9],
        [27, 9],
      ].forEach(([dx, dy], i) =>
        g.blit(
          mirror(MINNOW[(Math.floor(f / 3) + i) % 2]),
          sx + dx,
          15 + dy + ((f + i * 3) % 8 < 4 ? 0 : 1),
        ),
      );

      // Floor: rocks, weed, chest, sand.
      g.blit(["....##....", "..######..", ".########.", "##########"], 140, FLOOR - 4);
      g.blit(["..###..", ".#####.", "#######"], 152, FLOOR - 3);
      g.blit(["...##...", ".######.", "########"], 24, FLOOR - 3);
      [8, 13, 44, 88, 93, 120, 170, 176, 182].forEach((x, i) => {
        const tall = i % 3 === 0 ? 3 : 2;
        for (let s = 0; s < tall; s++)
          g.blit(WEED[(Math.floor(f / 4) + i + s) % 2], x + (s % 2), FLOOR - 8 * (s + 1));
      });
      g.blit(CHEST, 101, FLOOR - 7, undefined, true);
      for (let x = 0; x < g.w; x++) {
        g.set(x, FLOOR);
        if ((x * 7) % 5 === 0) g.set(x, FLOOR + 1);
        if ((x * 3) % 7 === 0) g.set(x, FLOOR + 3);
        if ((x * 11) % 13 === 0) g.set(x, FLOOR + 4);
      }
      g.blit(CRAB[Math.floor(f / 2) % 2], crab.x, FLOOR - 5);

      // Mid water: angelfish and jellyfish.
      const af = ANGEL[Math.floor(f / 3) % 2];
      g.blit(angel.dir < 0 ? af : mirror(af), angel.x, angel.y + (Math.floor(f / 8) % 2));
      g.blit(JELLY[Math.floor(f / 4) % 4 === 0 ? 1 : 0], jelly.x, jelly.y, undefined, true);

      // Near: big fish, opaque so they pass in front of everything.
      for (const b of big) {
        const ff = FISH[Math.floor(f / 3) % 2];
        g.blit(b.dir > 0 ? ff : mirror(ff), b.x, b.y + (Math.floor(f / 6) % 2), undefined, true);
      }

      for (const b of bubbles) g.blit(BUBBLE[b.age > 12 ? 1 : 0], b.x - (b.age > 12 ? 1 : 0), b.y);
    },
  };
}
