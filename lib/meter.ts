// Spectrum meter ballistics: quantize band levels to whole segments, let
// bars rise instantly but fall in steps, and hold peak caps briefly before
// they drop at a fixed rate. Advanced once per display tick.

const PEAK_HOLD = 6; // ticks a peak cap holds before falling
const PEAK_FALL = 1; // segments per tick once falling
const BAR_FALL = 2; // bars drop at most this many segments per tick

export class Meter {
  levels: number[];
  peaks: number[];
  private hold: number[];

  readonly bands: number;
  readonly segments: number;

  constructor(bands: number, segments: number) {
    this.bands = bands;
    this.segments = segments;
    this.levels = new Array(bands).fill(0);
    this.peaks = new Array(bands).fill(0);
    this.hold = new Array(bands).fill(0);
  }

  /** `raw` = per-band levels in 0..1. */
  update(raw: number[]) {
    for (let i = 0; i < this.bands; i++) {
      const target = Math.round(Math.min(1, raw[i] ?? 0) * this.segments);
      const level = Math.max(target, this.levels[i] - BAR_FALL);
      this.levels[i] = level;
      if (level >= this.peaks[i]) {
        this.peaks[i] = level;
        this.hold[i] = PEAK_HOLD;
      } else if (this.hold[i] > 0) {
        this.hold[i]--;
      } else {
        this.peaks[i] = Math.max(level, this.peaks[i] - PEAK_FALL);
      }
    }
  }
}
