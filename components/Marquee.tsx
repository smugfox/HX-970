"use client";

import { useState } from "react";
import { useSteppedFrame } from "@/hooks/useSteppedFrame";
import { toSeg14 } from "@/lib/segments";
import { SegmentDisplay } from "./SegmentDisplay";

type Props = {
  text: string;
  /** Visible cells. */
  width?: number;
  fps?: number;
  paused?: boolean;
};

const GAP = "!!!!";
const HOLD = 10; // ticks to hold at the start of each pass

export function Marquee({ text, width = 14, fps = 8, paused = false }: Props) {
  const seg = toSeg14(text);
  const scrolls = seg.length > width;
  const loop = seg + GAP;
  const [state, setState] = useState({ text: seg, step: 0 });
  // Restart from the left whenever the text changes.
  const step = state.text === seg ? state.step : 0;

  useSteppedFrame(
    fps,
    () => setState((s) => ({ text: seg, step: s.text === seg ? s.step + 1 : 0 })),
    paused || !scrolls,
  );

  let windowText = seg.slice(0, width);
  if (scrolls) {
    const offset = Math.max(0, step - HOLD) % loop.length;
    windowText = (loop + loop).slice(offset, offset + width);
  }

  return (
    <SegmentDisplay
      className="marquee"
      variant="14"
      value={windowText}
      ghost={"~".repeat(width)}
      align="left"
      label={text}
    />
  );
}
