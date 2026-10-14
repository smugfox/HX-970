"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * Low-fps loop. Runs a single requestAnimationFrame loop but only calls
 * `onStep` once a full 1000/fps interval has elapsed, so the callback never
 * runs faster than the target fps. The first rAF only arms the clock; the
 * first step lands one interval later.
 *
 * Callers should do their per-frame work (and any setState) inside onStep,
 * so React only re-renders at the stepped rate.
 */
export function useSteppedFrame(fps: number, onStep: (frame: number) => void, paused = false) {
  const cb = useRef(onStep);
  const frame = useRef(0);

  useLayoutEffect(() => {
    cb.current = onStep;
  });

  useEffect(() => {
    if (paused) return;
    const interval = 1000 / fps;
    let raf = 0;
    let last = -1;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (last < 0) {
        last = now;
        return;
      }
      const elapsed = now - last;
      // 1ms tolerance absorbs rAF timestamp jitter on 60/120Hz displays.
      if (elapsed < interval - 1) return;
      // Carry small lateness into the next deadline so the average rate holds
      // (e.g. 8fps on a 60Hz display alternates 7/8 vsyncs), but resync after
      // a long stall instead of firing a burst of short catch-up steps.
      const late = elapsed - interval;
      last = late > 0 && late < interval / 2 ? now - late : now;
      cb.current(frame.current++);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [fps, paused]);
}
