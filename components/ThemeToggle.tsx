"use client";

import { THEMES, THEME_ORDER, type ThemeName } from "@/lib/themes";

type Props = {
  theme: ThemeName;
  onChange: (t: ThemeName) => void;
};

export function ThemeToggle({ theme, onChange }: Props) {
  const next = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length];
  return (
    <button
      type="button"
      className="key"
      onClick={() => onChange(next)}
      aria-label={`Display color: ${THEMES[theme].label}. Switch to ${THEMES[next].label}`}
    >
      <span className="key-led" style={{ background: THEMES[theme].lit }} />
      DIMMER
    </button>
  );
}
