// Slot machine, after the "AMUSE" game modes some late-90s units shipped.
// Reels spin, stop one by one with a bounce, and pay out on three of a kind.
// Click / tap the display to pull. All art original.

import { mirror, type Frame, type Gfx } from "../dots/gfx.ts";
import type { Scene } from "./types.ts";

const SEVEN: Frame = [
  "************",
  "************",
  "........***.",
  ".......***..",
  "......***...",
  ".....***....",
  ".....***....",
  "....***.....",
  "....***.....",
  "...****.....",
  "...****.....",
  "...****.....",
];
const CHERRY: Frame = [
  ".......##...",
  "......#.#...",
  ".....#..#...",
  "....#....#..",
  "...#.....#..",
  "..#......#..",
  ".***....***.",
  "*****..*****",
  "*****..*****",
  "*****..*****",
  ".***....***.",
  "............",
];
const BAR: Frame = [
  "............",
  "############",
  "............",
  ".##...#..##.",
  ".#.#.#.#.#.#",
  ".##..###.##.",
  ".#.#.#.#.#.#",
  ".##..#.#.#.#",
  "............",
  "############",
  "............",
  "............",
];
const BELL: Frame = [
  ".....##.....",
  "....####....",
  "...######...",
  "..########..",
  "..########..",
  "..########..",
  ".##########.",
  "############",
  "############",
  "............",
  ".....**.....",
  "............",
];
const STAR: Frame = [
  ".....##.....",
  ".....##.....",
  "....####....",
  "############",
  ".##########.",
  "..########..",
  "...######...",
  "..###..###..",
  ".##......##.",
  "#..........#",
  "............",
  "............",
];
const ARROW: Frame = ["*..", "**.", "***", "**.", "*.."];

const STRIP = [SEVEN, CHERRY, BAR, BELL, STAR, CHERRY, BAR, BELL];
const S = 2; // symbols are drawn at 2x so the reels fill the window height
const PITCH = 14 * S; // rows per symbol on the strip
const LOOP = STRIP.length * PITCH;
const REEL_X = [12, 44, 76];
const REEL_W = 30;
const REEL_Y = 2;
const REEL_H = 44;
const SPIN_SPEED = 10;
const STOP_AT = [12, 18, 25]; // ticks after pulling
const IDLE_AUTO = 36; // auto-pull after this many idle ticks

type Reel = { offset: number; target: number; settle: number };

export function slots(): Scene {
  let f = 0;
  let credits = 59;
  let spinning = -1; // ticks since pull, -1 when idle
  let idle = 0;
  let win = 0; // ticks left in win flash
  let payout = 0;
  const reels: Reel[] = REEL_X.map((_, i) => ({ offset: i * 3 * PITCH, target: 0, settle: 0 }));

  const pull = () => {
    if (spinning >= 0 || win > 0) return;
    spinning = 0;
    idle = 0;
    credits = Math.max(0, credits - 3);
    // One pull in three is a guaranteed three-of-a-kind (usually 7s), for show.
    const jackpot = Math.random() < 0.34;
    const pick = jackpot ? (Math.random() < 0.6 ? 0 : 1 + Math.floor(Math.random() * 4)) : -1;
    for (const r of reels) r.target = pick >= 0 ? pick : Math.floor(Math.random() * STRIP.length);
  };

  const drawReel = (g: Gfx, x: number, r: Reel) => {
    g.rect(x, REEL_Y, REEL_W, REEL_H);
    g.clip = { x0: x + 1, y0: REEL_Y + 1, x1: x + REEL_W - 1, y1: REEL_Y + REEL_H - 1 };
    const centre = REEL_Y + (REEL_H - 12 * S) / 2;
    for (let k = 0; k < STRIP.length; k++) {
      let dy = (((k * PITCH - r.offset) % LOOP) + LOOP) % LOOP;
      if (dy > LOOP / 2) dy -= LOOP;
      const y = centre + dy;
      if (y > -PITCH && y < g.h) g.blitScaled(STRIP[k], x + 3, y, S);
    }
    g.clip = null;
  };

  // Chasing marquee lights around the cabinet; all flash together on a win.
  const drawLights = (g: Gfx) => {
    const x0 = 4;
    const x1 = 113;
    const pts: [number, number][] = [];
    for (let x = x0; x <= x1; x += 3) pts.push([x, 0]);
    for (let y = 3; y <= 45; y += 3) pts.push([x1, y]);
    for (let x = x1; x >= x0; x -= 3) pts.push([x, 47]);
    for (let y = 45; y >= 3; y -= 3) pts.push([x0, y]);
    pts.forEach(([x, y], i) => {
      const on = win > 0 ? f % 2 === 0 : (i + f) % 4 === 0;
      if (on) g.set(x, y, 2);
    });
  };

  return {
    poke: pull,

    step() {
      f++;
      if (win > 0) {
        win--;
        if (payout > 0) {
          credits++;
          payout--;
        }
      }
      if (spinning < 0) {
        if (win === 0 && ++idle > IDLE_AUTO) pull();
        return;
      }
      spinning++;
      reels.forEach((r, i) => {
        const stopTick = STOP_AT[i];
        const home = r.target * PITCH;
        if (spinning < stopTick) r.offset = (r.offset + SPIN_SPEED) % LOOP;
        else if (spinning === stopTick)
          r.offset = (home + 8) % LOOP; // overshoot
        else if (spinning === stopTick + 1)
          r.offset = (home - 4 + LOOP) % LOOP; // bounce
        else r.offset = home;
      });
      if (spinning > STOP_AT[2] + 2) {
        spinning = -1;
        const t = reels[0].target;
        if (reels.every((r) => STRIP[r.target] === STRIP[t])) {
          win = 30;
          payout = STRIP[t] === SEVEN ? 30 : 12;
        }
      }
    },

    draw(g) {
      g.clear();
      drawLights(g);
      REEL_X.forEach((x, i) => drawReel(g, x, reels[i]));
      // Payline arrows.
      g.blit(ARROW, 7, 21);
      g.blit(mirror(ARROW), 107, 21);

      // Right panel.
      const px = 122;
      if (win > 0) {
        if (Math.floor(f / 2) % 2 === 0) g.text("WIN!!", px, 4, 2, 2);
      } else if (spinning >= 0) {
        g.text("GOOD", px + 6, 4, 1, 2);
      } else if (Math.floor(f / 4) % 2 === 0) {
        g.text("START", px, 4, 1, 2);
      }
      g.text("CREDIT", px, 24);
      g.text(String(credits).padStart(5, "0"), px, 34, 2);
      g.text("BET 3", px + 36, 34);
      // Lever: knob drops while spinning.
      const knob = spinning >= 0 && spinning < 6 ? 30 : 4;
      g.line(186, knob + 3, 186, 42);
      g.fill(184, knob, 5, 4, 2);
      g.line(181, 42, 191, 42);
      g.line(181, 43, 191, 43);
    },
  };
}
