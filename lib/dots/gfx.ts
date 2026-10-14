// A tiny 1-bit (well, 2-ink) framebuffer for the dot-matrix window.
// Ink 0 = unlit, 1 = primary phosphor, 2 = accent phosphor.
//
// Sprites are arrays of strings: "#" draws primary, "*" draws accent,
// anything else is transparent.

import { FONT_3X5, FONT_5X7 } from "./font.ts";

export type Ink = 0 | 1 | 2;
export type Frame = readonly string[];
export type Sprite = readonly Frame[];

// Resolution of the dot-matrix window. Scenes read g.w / g.h, so this is the
// one place to change it (keep 4:1 to fill the display window).
export const DOT_W = 192;
export const DOT_H = 48;

export class Gfx {
  readonly w: number;
  readonly h: number;
  readonly buf: Uint8Array;
  /** Optional clip rectangle (inclusive x0/y0, exclusive x1/y1). */
  clip: { x0: number; y0: number; x1: number; y1: number } | null = null;

  constructor(w = DOT_W, h = DOT_H) {
    this.w = w;
    this.h = h;
    this.buf = new Uint8Array(w * h);
  }

  clear(ink: Ink = 0) {
    this.buf.fill(ink);
  }

  set(x: number, y: number, ink: Ink = 1) {
    x = Math.round(x);
    y = Math.round(y);
    const c = this.clip;
    if (c && (x < c.x0 || x >= c.x1 || y < c.y0 || y >= c.y1)) return;
    if (x >= 0 && x < this.w && y >= 0 && y < this.h) this.buf[y * this.w + x] = ink;
  }

  get(x: number, y: number): Ink {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return 0;
    return this.buf[y * this.w + x] as Ink;
  }

  /**
   * Draw a sprite frame. `ink` overrides the frame's own inks. `opaque`
   * clears the background between each row's first and last lit dot, so a
   * sprite with holes (windows, outlines) still hides what's behind it.
   */
  blit(frame: Frame, ox: number, oy: number, ink?: Ink, opaque = false) {
    ox = Math.round(ox);
    oy = Math.round(oy);
    for (let y = 0; y < frame.length; y++) {
      const row = frame[y];
      if (opaque) {
        const a = row.search(/[#*]/);
        const b = Math.max(row.lastIndexOf("#"), row.lastIndexOf("*"));
        for (let x = a; a >= 0 && x <= b; x++) this.set(ox + x, oy + y, 0);
      }
      for (let x = 0; x < row.length; x++) {
        const c = row[x];
        if (c === "#") this.set(ox + x, oy + y, ink ?? 1);
        else if (c === "*") this.set(ox + x, oy + y, ink ?? 2);
      }
    }
  }

  /** Blit at an integer scale (each source dot becomes scale×scale dots). */
  blitScaled(frame: Frame, ox: number, oy: number, scale: number, ink?: Ink) {
    ox = Math.round(ox);
    oy = Math.round(oy);
    for (let y = 0; y < frame.length; y++) {
      const row = frame[y];
      for (let x = 0; x < row.length; x++) {
        const c = row[x];
        const v: Ink | 0 = c === "#" ? (ink ?? 1) : c === "*" ? (ink ?? 2) : 0;
        if (v) this.fill(ox + x * scale, oy + y * scale, scale, scale, v);
      }
    }
  }

  fill(x: number, y: number, w: number, h: number, ink: Ink = 1) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, ink);
  }

  rect(x: number, y: number, w: number, h: number, ink: Ink = 1) {
    for (let i = 0; i < w; i++) {
      this.set(x + i, y, ink);
      this.set(x + i, y + h - 1, ink);
    }
    for (let j = 0; j < h; j++) {
      this.set(x, y + j, ink);
      this.set(x + w - 1, y + j, ink);
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, ink: Ink = 1) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, ink);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  /** 5x7 text, optionally scaled. Returns the advance width. */
  text(str: string, x: number, y: number, ink: Ink = 1, scale = 1) {
    return this.drawFont(FONT_5X7, str, x, y, ink, scale);
  }

  /** 3x5 text. Returns the advance width. */
  small(str: string, x: number, y: number, ink: Ink = 1) {
    return this.drawFont(FONT_3X5, str, x, y, ink);
  }

  private drawFont(
    font: Record<string, string>,
    str: string,
    x: number,
    y: number,
    ink: Ink,
    scale = 1,
  ) {
    let cx = x;
    for (const ch of str.toUpperCase()) {
      const glyph = (font[ch] ?? font[" "]).split("|");
      this.blitScaled(glyph, cx, y, scale, ink);
      cx += (glyph[0].length + 1) * scale;
    }
    return cx - x - scale;
  }
}

export function textWidth(str: string, small = false, scale = 1) {
  const font = small ? FONT_3X5 : FONT_5X7;
  let w = 0;
  for (const ch of str.toUpperCase()) w += (font[ch] ?? font[" "]).indexOf("|") + 1;
  return Math.max(0, w - 1) * scale;
}

/** Horizontally mirror a frame. */
export function mirror(frame: Frame): Frame {
  return frame.map((row) => [...row].reverse().join(""));
}

/**
 * Shear a frame vertically: column c moves by round(c * slope) rows. Used to
 * derive rising / diving poses from a level hand-drawn pose.
 */
export function shear(frame: Frame, slope: number): Frame {
  const w = frame[0].length;
  const shifts = Array.from({ length: w }, (_, c) => Math.round((c - (w - 1) / 2) * slope));
  const min = Math.min(...shifts);
  const max = Math.max(...shifts);
  const h = frame.length + max - min;
  const rows = Array.from({ length: h }, () => Array<string>(w).fill("."));
  frame.forEach((row, y) => {
    for (let c = 0; c < w; c++) rows[y + shifts[c] - min][c] = row[c];
  });
  return rows.map((r) => r.join(""));
}
