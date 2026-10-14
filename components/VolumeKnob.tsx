"use client";

import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";

type Props = {
  value: number;
  max: number;
  onChange: (v: number) => void;
};

const SWEEP = 270; // degrees from min to max
const PX_PER_STEP = 5; // vertical drag distance per volume step

/**
 * Rotary volume knob. Drag up/down, scroll, or use arrow keys / PageUp /
 * PageDown / Home / End. Steps are whole numbers, like a real head unit.
 */
export function VolumeKnob({ value, max, onChange }: Props) {
  const drag = useRef<{ y: number; start: number } | null>(null);
  const knob = useRef<HTMLDivElement>(null);
  const set = (v: number) => onChange(Math.max(0, Math.min(max, Math.round(v))));
  const latest = useRef({ value, set });
  latest.current = { value, set };

  // Native, non-passive wheel listener so turning the knob doesn't scroll the page.
  useEffect(() => {
    const el = knob.current;
    if (!el) return;
    const onWheel = (e: globalThis.WheelEvent) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      latest.current.set(latest.current.value + (e.deltaY < 0 ? 1 : -1));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, start: value };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    set(drag.current.start + (drag.current.y - e.clientY) / PX_PER_STEP);
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = {
      ArrowUp: 1,
      ArrowRight: 1,
      ArrowDown: -1,
      ArrowLeft: -1,
      PageUp: 5,
      PageDown: -5,
    };
    if (e.key in step) set(value + step[e.key]);
    else if (e.key === "Home") set(0);
    else if (e.key === "End") set(max);
    else return;
    e.preventDefault();
  };

  const angle = -SWEEP / 2 + (value / max) * SWEEP;

  return (
    <div className="volume">
      <div
        ref={knob}
        className="knob"
        role="slider"
        tabIndex={0}
        aria-label="Volume"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        style={{ ["--level" as string]: value / max }}
      >
        <div className="knob-cap" style={{ transform: `rotate(${angle}deg)` }}>
          <span className="knob-dot" />
        </div>
      </div>
      <span className="volume-label">VOLUME</span>
    </div>
  );
}
