// Helpers for DSEG strings.
//
// DSEG metrics (BoldItalic): digits/letters and "!" are full cell width,
// "." is zero-width (it draws the decimal point of the previous cell),
// ":" and " " are narrow. "!" is the full-width blank, so we use it for
// padding. "8" lights every 7-seg segment, "~" every 14-seg segment.

export type SegVariant = "7" | "14";

const ALL_ON: Record<SegVariant, string> = { "7": "8", "14": "~" };

/** Count full-width cells (ignores zero-width "." and narrow ":"/" "). */
export function cellCount(s: string) {
  let n = 0;
  for (const ch of s) if (ch !== "." && ch !== ":" && ch !== " ") n++;
  return n;
}

/** All-segments-on ghost for a string, keeping "." and ":" in place. */
export function ghostFor(value: string, variant: SegVariant) {
  let out = "";
  for (const ch of value) out += ch === "." || ch === ":" || ch === " " ? ch : ALL_ON[variant];
  return out;
}

const SEG14_OK = /[A-Z0-9 !"$%&'()*+,\-/<=>?@\\^_`|]/;

/** Normalize arbitrary text to something DSEG14 renders at fixed width. */
export function toSeg14(text: string) {
  let out = "";
  for (const ch of text.toUpperCase().normalize("NFKD")) {
    if (/[̀-ͯ]/.test(ch)) continue; // strip accents
    if (ch === " " || ch === ".") out += "!";
    else out += SEG14_OK.test(ch) ? ch : "-";
  }
  return out;
}

/** Pad to `cells` full-width cells with "!" blanks. */
export function pad(value: string, cells: number, align: "left" | "right") {
  const fill = "!".repeat(Math.max(0, cells - cellCount(value)));
  return align === "right" ? fill + value : value + fill;
}
