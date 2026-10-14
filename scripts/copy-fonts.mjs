// Copies the DSEG webfonts we use from node_modules into public/fonts.
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
const src = "node_modules/dseg/fonts";
const out = "public/fonts";
const files = [
  "DSEG7-Classic/DSEG7Classic-BoldItalic.woff2",
  "DSEG14-Classic/DSEG14Classic-BoldItalic.woff2",
];
if (existsSync(src)) {
  mkdirSync(out, { recursive: true });
  for (const f of files) copyFileSync(`${src}/${f}`, `${out}/${f.split("/").pop()}`);
}
