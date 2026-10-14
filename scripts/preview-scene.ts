// Dev tool: render a scene to the terminal.
//   node --experimental-strip-types scripts/preview-scene.ts dolphin 0 8 16
// "#" = primary ink, "*" = accent ink, "·" = unlit.
import { Gfx } from "../lib/dots/gfx.ts";
import { SCENES } from "../lib/scenes/index.ts";
import { AudioEngine } from "../lib/audio.ts";

const [name, ...ticks] = process.argv.slice(2);
const factory = SCENES[name as keyof typeof SCENES]?.create;
if (!factory) throw new Error(`unknown scene ${name}; have ${Object.keys(SCENES).join(", ")}`);
// Analyzer scenes get the procedural generator as their audio input.
const engine = new AudioEngine();
const scene = factory({ sample: (n: number) => engine.bands(n) });
const g = new Gfx();
const want = new Set((ticks.length ? ticks : ["0"]).map(Number));
const last = Math.max(...want);
for (let t = 0; t <= last; t++) {
  if (t > 0) scene.step();
  if (!want.has(t)) continue;
  scene.draw(g);
  console.log(`-- ${name} @ ${t}`);
  for (let y = 0; y < g.h; y++) {
    let row = "";
    for (let x = 0; x < g.w; x++) row += [" ·", "#", "*"][g.get(x, y)].slice(-1);
    console.log(row);
  }
}
