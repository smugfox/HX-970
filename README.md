# HX-970 — late-90s head unit display

A web recreation of a 1990s car stereo VFD: smoked faceplate, ghosted segment readouts, a
14-segment marquee, a volume knob with an LED ring, and a two-color 192×48 dot-matrix
window with a set of period demo scenes.

```bash
npm install   # also copies the DSEG webfonts into public/fonts
npm run dev   # http://localhost:3000
```

**Controls:** `SRC` cycles CD / FM / AUX · `◀◀ ▶▶` change track or FM preset · `MODE` cycles the
views below, then `DEMO` · `EQ` cycles the display EQ presets (S.BASS / PWRFL / NTRL / VOCAL /
CUSTOM), which reshape the analyzer · `DIMMER` swaps phosphor color · `LOAD` picks a local audio
file (switches to AUX and drives the analyzer through a Web Audio `AnalyserNode`) · `▶❚❚`
play/pause. On CD (or before anything is playing) the analyzer runs a procedural pattern.

## Volume

The knob left of the display sets output volume, 0–40 like a real head unit. Drag up or down,
scroll over it, or focus it and use the arrow keys, PageUp/PageDown or Home/End. The marquee
shows `VOLUME n` while you turn it. It starts at 14, because live radio is mastered loud, and
remembers your setting in `localStorage`. The volume stage sits after the analyser, so the
spectrum reads the same at any volume.

## Dot matrix

Everything in the graphic window, including both analyzers, is drawn on one 192×48 two-ink
framebuffer, so it all shares a single dot pitch. The window snaps to a whole number of pixels
per dot (3–4px on desktop, with a 1px gap) and centres in the display. Below 2px per dot, on
narrow phones, it falls back to a fractional fit without the grid. Depth in the scenes comes from
parallax layers: far things are smaller, sparser and slower.

## FM: live internet radio

The FM band holds 8 presets, defined in `lib/stations.ts`. Each is a real internet radio station
whose stream server sends CORS headers. That means the audio can go through the same
`AnalyserNode` as local files, so the spectrum shows the actual broadcast.

| FM    | Station            | Now playing                      |
| ----- | ------------------ | -------------------------------- |
| 88.3  | Nightride FM       | live (server-sent events)        |
| 89.9  | Chillsynth         | live (server-sent events)        |
| 90.3  | KEXP Seattle       | polled every 20s                 |
| 92.5  | Plaza One          | polled                           |
| 95.7  | 181.fm Awesome 80s | station name only (no feed)      |
| 98.1  | FluxFM 80er        | station name only (no feed)      |
| 101.5 | Radio Paradise     | polled via `/api/now-playing` (no CORS on their API) |
| 106.1 | NTS 1              | polled (show name)               |

- Switching to FM, or pressing ◀◀ ▶▶ on FM, retunes. The dot matrix shows a static burst until
  the stream starts, and the marquee shows `TUNING`, then `STATION - ARTIST - TITLE`.
- `▶❚❚` pauses. A paused live stream restarts at the live edge rather than replaying a stale
  buffer.
- A stream that fails, or doesn't start within 15s, shows `NO SIGNAL`. Stations can change their
  CORS policy at any time, and this is what you'll see if one does.
- Browsers only start audio after a click, so FM never autoplays on page load.
- The frequencies are made up for the dial, except KEXP's (90.3 is real). The unit isn't
  affiliated with any station, and a credit link to the tuned station shows under it.

**Adding a station:** check the stream sends `Access-Control-Allow-Origin` (`curl -sD - -o
/dev/null -H "Origin: http://localhost:3000" <url>`), including on every redirect hop. Then add
an entry to `STATIONS`. Without CORS the audio would still play, but the analyzer would read
silence, so don't add stations that fail the check.

**Views:**

| Mode     | What it is                                                                     |
| -------- | ------------------------------------------------------------------------------ |
| SPECTRUM | 32 bands × 16 segments on the dot grid, accent peak caps that hold then fall |
| 3D EQ    | the same bars in perspective, leaning to a vanishing point, accent top zone, Hz legend |
| DOLPHIN  | dolphins leaping out of a rolling sea at sunset, gulls, splashes               |
| RACER    | pop-up-headlight coupe at night: skyline, streetlights, lane dashes, exhaust   |
| SLOTS    | three-reel slot machine with a bounce stop, credits and a WIN flash. Click / tap the display to pull |
| AQUA     | aquarium: big fish, a school of minnows, an angelfish, weed, a chest, bubbles  |
| WARP     | warp-speed starfield                                                           |
| DEMO     | steps through every view every 6s under a "DEMONSTRATION" banner               |

On load the unit runs a **power-on sequence**: a 1s lamp test (every segment, legend and dot lit),
then a typewriter WELCOME. Press MODE to skip it.

## Layout

```
components/
  HeadUnit.tsx          state, readouts, controls, boot, demo, segment wipe between views
  SegmentDisplay.tsx    value + ghost pattern + "7" | "14" variant (DSEG7 / DSEG14)
  Marquee.tsx           14-seg title window, steps one cell per tick
  VolumeKnob.tsx        rotary knob (drag / wheel / keys) with LED level ring
  DotMatrix.tsx         renders any scene (analyzers included): 192×48 canvas, integer-scaled
  ThemeToggle.tsx
app/api/now-playing/   server relay for now-playing feeds without CORS (fixed allowlist)
hooks/
  useSteppedFrame.ts    the shared low-fps loop
  useNowPlaying.ts      per-station now-playing (SSE or polling)
  useReducedMotion.ts
lib/
  dots/gfx.ts           2-ink framebuffer: blit, text, line, rect, clip, mirror
  dots/font.ts          5×7 and 3×5 bitmap fonts
  scenes/*.ts           one file per scene, sprites drawn as arrays inside
  scenes/index.ts       scene registry (label, factory)
  audio.ts              <audio> + AnalyserNode for files and live streams, log-band bucketing,
                        procedural fallback, tuning / error status
  stations.ts           FM presets (stream URL, site, now-playing source)
  eq.ts                 EQ preset gain curves
  meter.ts              analyzer ballistics (quantize, fall rate, peak hold)
  themes.ts             phosphor colors (primary + accent)
  segments.ts           DSEG ghost/padding helpers
scripts/
  preview-scene.ts      render any scene to the terminal as ASCII
```

## Frame rate

Every animation goes through `useSteppedFrame(fps, onStep, paused)`: one `requestAnimationFrame`
loop that only calls `onStep` once a full `1000 / fps` has elapsed. Per-frame work and `setState`
happen inside `onStep`, so React re-renders at the stepped rate, not at 60Hz. Current rates:
analyzers 12, segment wipe 12, scenes 10, marquee 8, boot 10. There is no tweening anywhere,
and the only CSS animation (the play indicator blink) uses `steps()`.

Mode changes wipe across the window two bar-columns per tick, with a fully lit column at the
edge.

## Swapping themes

The phosphor colors live in `lib/themes.ts`:

```ts
export const THEMES = {
  teal: { label: "TEAL", lit: "#6ff6ff", accent: "#ff8f3a" },
  amber: { label: "AMBR", lit: "#ffb43a", accent: "#ff5b3d" },
  green: { label: "GREN", lit: "#7dff7a", accent: "#ffc93a" },
  // add one:
  violet: { label: "VIOL", lit: "#b89bff", accent: "#7dff7a" },
} as const;
```

`lit` is the main phosphor and `accent` the second one: EQ legends, the 3D EQ top zone, and the
`*` dots in scenes (sun, cherries, sevens, lamps, windows). `HeadUnit` sets them as `--vfd` and
`--accent`, and the CSS derives the glow layers from them with `color-mix()`. The dot matrix gets
both as props. `DIMMER` cycles through themes in object order. Labels show on a 4-cell 14-seg
readout, so keep them to 4 characters. To change the default, edit `useState<ThemeName>("teal")`
in `HeadUnit.tsx`.

## Adding sprite frames

Sprites are arrays of strings, kept in the scene file that uses them. `#` is a primary-ink dot,
`*` is an accent-ink dot, and anything else is transparent. Every frame of a sprite must have the
same width and height. The window is 192×48 (`DOT_W` × `DOT_H` in `lib/dots/gfx.ts`).

```ts
const CRAB: Frame[] = [
  ["#.....#", ".#####.", "#*.#.*#", ".#####.", "#.#.#.#"],
  [".#...#.", ".#####.", "#*.#.*#", ".#####.", ".#.#.#."],
];
```

Draw it in a scene's `draw(g)` with `g.blit(frame, x, y)`. Pick the frame from the scene's tick
counter, e.g. `CRAB[Math.floor(f / 3) % CRAB.length]` flips every 3 ticks (≈3 times a second at
10fps). `g.blit(frame, x, y, undefined, true)` makes it opaque, hiding whatever is behind it.
`mirror(frame)` flips it horizontally for sprites that turn around.

## Adding a scene

1. Create `lib/scenes/crab.ts` exporting a factory that returns `{ step(), draw(g), poke?() }`.
   `step` advances one tick, `draw` paints the framebuffer, and the optional `poke` handles a
   click on the display.
2. Register it in `lib/scenes/index.ts`: `crab: { label: "CRAB", create: crab }`. Add
   `interactive: true` if it has `poke`.
3. Add `"crab"` to `VIEWS` and `MODE_NAMES` in `HeadUnit.tsx`.

Preview it in the terminal while drawing:

```bash
node --experimental-strip-types scripts/preview-scene.ts crab 0 10 20
```

Scene files import each other with `.ts` extensions (`allowImportingTsExtensions`), so that
command runs them directly in Node.

## Notes

- **Ghost segments.** `SegmentDisplay` stacks an all-segments-on layer (`8` for DSEG7, `~` for
  DSEG14) at 10% opacity under the lit text. Lit values are padded with `!`, DSEG's full-width
  blank, so they stay aligned. In DSEG, `.` is zero-width and `:` is narrow, which is how
  `888.8` and `88:88` stay aligned. In the dot matrix, the ghost is a 10% tint behind the
  canvas. The canvas draws only lit dots, so the glow filter doesn't bloom the unlit ones.
- **Responsive.** Readouts size with container query units. The dot matrix picks the largest
  *integer* dot size that fits its box, so pixel and grid boundaries always line up.
- **Reduced motion.** With `prefers-reduced-motion: reduce`, the power-on sequence is skipped, the
  marquee and scenes pause, the analyzer freezes on one frame, demo mode stops advancing, the wipe
  is instant, and the clock colon stops blinking.
- **Art.** All scenes and sprites are original, written as dot arrays in code. They draw on
  late-90s head-unit demo modes (leaping dolphins, sports-car demos, slot-machine "amuse" games,
  perspective spectrum analyzers) without copying any of them.
- **Fonts.** DSEG by Keshikan, SIL Open Font License 1.1.
