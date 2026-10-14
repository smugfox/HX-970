"use client";

import { useEffect, useRef, useState } from "react";
import { useSteppedFrame } from "@/hooks/useSteppedFrame";
import { DOT_H, DOT_W, Gfx } from "@/lib/dots/gfx";
import { SCENES, type SceneName } from "@/lib/scenes";
import type { Scene } from "@/lib/scenes/types";

type Props = {
  scene: SceneName;
  /** Primary and accent phosphor colors. */
  ink: string;
  accent: string;
  /** Overrides the scene's own rate (SCENES[scene].fps, default 10). */
  fps?: number;
  paused?: boolean;
  /** Audio band levels for the analyzer scenes. */
  sample?: (n: number) => number[];
};

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/**
 * 96x24 two-ink scene on a native-resolution canvas, scaled up by an integer
 * factor with image-rendering: pixelated. A CSS grid overlay draws the gaps
 * between dots; because the scale is an integer, the grid always lands on
 * dot boundaries. Mount one per scene (key it by scene name).
 */
export function DotMatrix({ scene, ink, accent, fps, paused = false, sample }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [cell, setCell] = useState(0);
  const sceneRef = useRef<Scene | null>(null);
  const gfx = useRef<Gfx | null>(null);
  const sampleRef = useRef(sample);
  sampleRef.current = sample;
  const getScene = () => {
    if (!sceneRef.current) {
      sceneRef.current = SCENES[scene].create({
        sample: (n) => sampleRef.current?.(n) ?? new Array<number>(n).fill(0),
      });
      // One step up front so a paused (reduced-motion) scene still has content.
      sceneRef.current.step();
    }
    return sceneRef.current;
  };

  // Pick the largest dot size that fits the container.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const fit = Math.min(width / DOT_W, height / DOT_H);
      // Integer scale whenever a dot can be at least 2px, so the grid lands
      // on dot boundaries. On very narrow screens fall back to a fractional
      // fit (no grid) rather than a tiny image.
      setCell(fit >= 2 ? Math.floor(fit) : fit);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const paint = () => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const g = (gfx.current ??= new Gfx());
    getScene().draw(g);
    const img = ctx.createImageData(DOT_W, DOT_H);
    const inks = [rgb(ink), rgb(ink), rgb(accent)];
    for (let i = 0; i < g.buf.length; i++) {
      const v = g.buf[i];
      const [r, gr, b] = inks[v];
      img.data[i * 4] = r;
      img.data[i * 4 + 1] = gr;
      img.data[i * 4 + 2] = b;
      // Unlit dots are transparent; the ghost tint is the CSS background
      // behind the canvas, so the glow filter only blooms lit dots.
      img.data[i * 4 + 3] = v ? 255 : 0;
    }
    ctx.putImageData(img, 0, 0);
  };

  const entry = SCENES[scene];
  useSteppedFrame(
    fps ?? ("fps" in entry ? entry.fps : 10),
    () => {
      getScene().step();
      paint();
    },
    paused,
  );

  // Repaint on theme change / resize, and give a paused scene a first frame.
  useEffect(paint);

  const interactive = "interactive" in SCENES[scene];
  const size = cell
    ? {
        width: DOT_W * cell,
        height: DOT_H * cell,
        // Dot gap scales with the dot; below 3px the grid would swallow the dot.
        ["--cell" as string]: `${cell}px`,
        ["--gap" as string]: `${cell >= 3 ? Math.max(1, Math.round(cell / 4)) : 0}px`,
      }
    : undefined;

  return (
    <div className="dotmatrix" ref={wrap}>
      <div className="dotmatrix-screen" style={size}>
        <canvas
          ref={canvas}
          width={DOT_W}
          height={DOT_H}
          role="img"
          aria-label={`Dot-matrix animation: ${SCENES[scene].label.toLowerCase()}`}
        />
        <div className="dotmatrix-grid" aria-hidden />
        {interactive && (
          <button
            type="button"
            className="dotmatrix-hit"
            aria-label="Pull the lever"
            onClick={() => getScene().poke?.()}
          />
        )}
      </div>
    </div>
  );
}
