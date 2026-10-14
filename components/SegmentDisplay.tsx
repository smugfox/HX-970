import { ghostFor, pad, cellCount, type SegVariant } from "@/lib/segments";

type Props = {
  /** Lit characters. Padded with blanks to the ghost's width. */
  value: string;
  /** Unlit segment pattern shown underneath at ~10%. Defaults to all-segments-on for `value`. */
  ghost?: string;
  /** "7" (DSEG7) or "14" (DSEG14). */
  variant?: SegVariant;
  align?: "left" | "right";
  /** Accessible reading of the value, if different from `value`. */
  label?: string;
  className?: string;
};

export function SegmentDisplay({
  value,
  ghost,
  variant = "7",
  align = "right",
  label,
  className = "",
}: Props) {
  const g = ghost ?? ghostFor(value, variant);
  const lit = pad(value, cellCount(g), align);
  return (
    <span
      className={`seg seg-${variant} ${className}`}
      role="img"
      aria-label={label ?? value.replace(/!/g, " ").trim()}
    >
      <span className="seg-ghost" aria-hidden>
        {g}
      </span>
      <span className="seg-lit" aria-hidden>
        {lit}
      </span>
    </span>
  );
}
