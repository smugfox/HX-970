// VFD phosphor colors. Add a theme by adding an entry here; everything
// (CSS glow, canvas dots, segment readouts) reads from this one map.
// `accent` is the second phosphor used for legends, fruit, lamps, sunsets.
export const THEMES = {
  teal: { label: "TEAL", lit: "#6ff6ff", accent: "#ff8f3a" },
  amber: { label: "AMBR", lit: "#ffb43a", accent: "#ff5b3d" },
  green: { label: "GREN", lit: "#7dff7a", accent: "#ffc93a" },
} as const;

export type ThemeName = keyof typeof THEMES;

export const THEME_ORDER = Object.keys(THEMES) as ThemeName[];
