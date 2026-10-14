"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useSteppedFrame } from "@/hooks/useSteppedFrame";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { AudioEngine, type AudioStatus } from "@/lib/audio";
import { STATIONS } from "@/lib/stations";
import { useNowPlaying } from "@/hooks/useNowPlaying";
import { THEMES, type ThemeName } from "@/lib/themes";
import { EQ_ORDER, eqGain, type EqName } from "@/lib/eq";
import { SCENES, type SceneName } from "@/lib/scenes";
import { DOT_H, DOT_W } from "@/lib/dots/gfx";
import { SegmentDisplay } from "./SegmentDisplay";
import { Marquee } from "./Marquee";
import { DotMatrix } from "./DotMatrix";
import { ThemeToggle } from "./ThemeToggle";
import { VolumeKnob } from "./VolumeKnob";

type View = Exclude<SceneName, "opening" | "static">;
type Mode = View | "demo";
type Shown = View | "opening";
type Source = "CD" | "FM" | "AUX";

const VIEWS: View[] = ["spectrum", "eq3d", "dolphin", "racer", "slots", "aqua", "warp"];
const MODES: Mode[] = [...VIEWS, "demo"];
const MODE_NAMES: Record<Mode, string> = {
  spectrum: SCENES.spectrum.label,
  eq3d: SCENES.eq3d.label,
  dolphin: SCENES.dolphin.label,
  racer: SCENES.racer.label,
  slots: SCENES.slots.label,
  aqua: SCENES.aqua.label,
  warp: SCENES.warp.label,
  demo: "DEMO",
};
const SOURCES: Source[] = ["CD", "FM", "AUX"];

const TRACKS = [
  "Night Drive on the Coast Highway",
  "Tinted Windows",
  "Exit 14 - Last Gas for 60 Miles",
  "Auto Reverse",
  "Low Fuel High Hopes",
  "Wet Asphalt Neon",
];

// Tiny curve glyphs printed next to each EQ legend.
const EQ_ICON: Record<EqName, string> = {
  "S.BASS": "M0 1 L3 1 L5 5 L12 5",
  PWRFL: "M0 1 L3 4 L9 4 L12 1",
  NTRL: "M0 3 L12 3",
  VOCAL: "M0 5 L4 5 L6 1 L8 5 L12 5",
  CUSTOM: "M0 5 L4 3 L8 4 L12 1",
};

const WIPE_COLS = 16; // the wipe crosses the window in 16 columns...
const WIPE_STEP = 2; // ...two per tick
const DEMO_SECONDS = 6;
const LAMP_TICKS = 10; // power-on lamp test (all segments lit), at 10fps
const BOOT_TICKS = 48; // then the WELCOME scene, then the selected mode
const DEMO_BANNER = "Demonstration - Press Mode to Exit";
const BOOT_BANNER = "Welcome - Have a Nice Drive";
const VOL_MAX = 40;
const VOL_DEFAULT = 14; // quiet start; live radio is mastered loud
const VOL_KEY = "hx970-volume";
const STATIC_MIN_MS = 700; // static burst shown on every retune, even if the stream connects instantly

export function HeadUnit() {
  const reduced = useReducedMotion();
  const [theme, setTheme] = useState<ThemeName>("teal");
  const [mode, setMode] = useState<Mode>("spectrum");
  const [demoView, setDemoView] = useState<View>("spectrum");
  const [eq, setEq] = useState<EqName>("PWRFL");
  const [bootTick, setBootTick] = useState(0);
  const [source, setSource] = useState<Source>("CD");
  const [track, setTrack] = useState(0);
  const [station, setStation] = useState(0);
  const [file, setFile] = useState<string | null>(null);
  const [status, setStatus] = useState<AudioStatus>("idle");
  const [staticHold, setStaticHold] = useState(false);
  const [volume, setVolume] = useState(VOL_DEFAULT);
  const [flash, setFlash] = useState<string | null>(null);
  const [clock, setClock] = useState<{ hm: string; colon: boolean } | null>(null);

  // Graphic area snaps to an integer multiple of the dot grid so the dot
  // matrix fills it exactly; the spectrum views share the same box.
  const vizSlot = useRef<HTMLDivElement>(null);
  const [vizCell, setVizCell] = useState(0);
  useEffect(() => {
    const el = vizSlot.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const fit = e.contentRect.width / DOT_W;
      setVizCell(fit >= 2 ? Math.floor(fit) : fit);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const vizSize = vizCell
    ? ({
        width: DOT_W * vizCell,
        height: DOT_H * vizCell,
        "--cell": `${vizCell}px`,
      } as CSSProperties)
    : undefined;

  const engineRef = useRef<AudioEngine | null>(null);
  const engine = () => (engineRef.current ??= new AudioEngine(setStatus));
  const fileInput = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null);
  const staticTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const eqRef = useRef(eq);
  eqRef.current = eq;

  useEffect(
    () => () => {
      engineRef.current?.dispose();
      clearTimeout(flashTimer.current);
      clearTimeout(staticTimer.current);
    },
    [],
  );

  // Volume: restore the last setting, apply it with a squared (perceptual)
  // curve, and remember it.
  useEffect(() => {
    const saved = Number(localStorage.getItem(VOL_KEY));
    if (localStorage.getItem(VOL_KEY) !== null && saved >= 0 && saved <= VOL_MAX) setVolume(saved);
  }, []);
  useEffect(() => {
    engine().setVolume((volume / VOL_MAX) ** 2);
    localStorage.setItem(VOL_KEY, String(volume));
  }, [volume]);

  const announce = (text: string) => {
    clearTimeout(flashTimer.current);
    setFlash(text);
    flashTimer.current = setTimeout(() => setFlash(null), 1600);
  };

  // --- Clock (colon blinks on the half second) ---------------------------
  const tickClock = () => {
    const d = new Date();
    const h = d.getHours() % 12 || 12;
    const hm = `${String(h).padStart(2, "!")}:${String(d.getMinutes()).padStart(2, "0")}`;
    const colon = reduced || d.getMilliseconds() < 500;
    setClock((c) => (c && c.hm === hm && c.colon === colon ? c : { hm, colon }));
  };
  useSteppedFrame(10, tickClock);
  useEffect(tickClock, []);

  // --- Power-on: lamp test, then WELCOME (skipped for reduced motion) -----
  const booting = !reduced && bootTick < BOOT_TICKS;
  const lamp = booting && bootTick < LAMP_TICKS;
  useSteppedFrame(10, () => setBootTick((t) => t + 1), !booting);

  // --- Demo mode steps through every view ---------------------------------
  useSteppedFrame(
    1 / DEMO_SECONDS,
    () => setDemoView((v) => VIEWS[(VIEWS.indexOf(v) + 1) % VIEWS.length]),
    mode !== "demo" || reduced,
  );

  // --- Segment wipe between views ----------------------------------------
  const shown: Shown = booting ? "opening" : mode === "demo" ? demoView : mode;
  const [vis, setVis] = useState<{ cur: Shown; prev: Shown; wipe: number }>({
    cur: shown,
    prev: shown,
    wipe: -1,
  });
  if (vis.cur !== shown) {
    setVis({ cur: shown, prev: vis.cur, wipe: reduced ? -1 : 0 });
  }
  useSteppedFrame(
    12,
    () =>
      setVis((v) =>
        v.wipe < 0 ? v : { ...v, wipe: v.wipe + WIPE_STEP > WIPE_COLS ? -1 : v.wipe + WIPE_STEP },
      ),
    vis.wipe < 0,
  );

  const layerStyle = (view: Shown): CSSProperties => {
    if (vis.wipe < 0) return {};
    const pct = (vis.wipe / WIPE_COLS) * 100;
    return view === vis.cur
      ? { clipPath: `inset(0 ${100 - pct}% 0 0)` }
      : { clipPath: `inset(0 0 0 ${pct}%)` };
  };
  const layers: Shown[] = vis.wipe < 0 || vis.prev === vis.cur ? [vis.cur] : [vis.cur, vis.prev];

  const sample = useCallback(
    (n: number) =>
      engine()
        .bands(n)
        .map((v, i) => Math.min(1, v * eqGain(eqRef.current, i, n))),
    [],
  );

  // --- Controls -----------------------------------------------------------
  const cycleMode = () => {
    // During power-on, MODE just skips to the current mode.
    if (booting) return setBootTick(BOOT_TICKS);
    const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    if (next === "demo") setDemoView(mode === "demo" ? demoView : (mode as View));
    setMode(next);
    announce(MODE_NAMES[next]);
  };

  const cycleEq = () => {
    const next = EQ_ORDER[(EQ_ORDER.indexOf(eq) + 1) % EQ_ORDER.length];
    setEq(next);
    announce(`EQ ${next}`);
  };

  // Retune to a preset: static burst on the dot matrix, then the live stream.
  // Always called from a click, so the AudioContext is allowed to start.
  const tune = (i: number) => {
    setStation(i);
    clearTimeout(staticTimer.current);
    setStaticHold(true);
    staticTimer.current = setTimeout(() => setStaticHold(false), STATIC_MIN_MS);
    void engine().playStream(STATIONS[i].stream);
  };

  const cycleSource = () => {
    const next = SOURCES[(SOURCES.indexOf(source) + 1) % SOURCES.length];
    setSource(next);
    announce(next === "FM" ? `FM ${STATIONS[station].freq}` : next);
    if (next === "FM") tune(station);
    else if (next === "AUX" && fileRef.current) void engine().playFile(fileRef.current);
    else engine().stop();
  };

  const seek = (dir: 1 | -1) => {
    if (source === "CD") setTrack((t) => (t + dir + TRACKS.length) % TRACKS.length);
    if (source === "FM") {
      const next = (station + dir + STATIONS.length) % STATIONS.length;
      announce(`FM ${STATIONS[next].freq}`);
      tune(next);
    }
  };

  const onFile = (f: File | undefined) => {
    if (!f) return;
    fileRef.current = f;
    setSource("AUX");
    setFile(f.name.replace(/\.[^.]+$/, ""));
    void engine().playFile(f);
  };

  const togglePlay = () => {
    if (source === "FM" && !engine().active) return tune(station);
    void engine().toggle();
  };

  const live = status === "playing";
  const tuning = source === "FM" && (staticHold || status === "tuning");
  const nowPlaying = useNowPlaying(STATIONS[station].meta, source === "FM" && live);

  // --- Readouts -------------------------------------------------------------
  let title: string;
  let number: string;
  if (source === "CD") {
    title = TRACKS[track];
    number = String(track + 1).padStart(2, "0");
  } else if (source === "FM") {
    const st = STATIONS[station];
    title =
      status === "error"
        ? `${st.freq} - No Signal`
        : tuning
          ? `Tuning ${st.freq}`
          : live
            ? [st.name, nowPlaying].filter(Boolean).join(" - ")
            : `${st.name} - Press Play`;
    number = st.freq;
  } else {
    title = status === "error" ? "Format Error" : (file ?? "Aux In - Press Load");
    number = "01";
  }

  const marquee = lamp
    ? ""
    : (flash ?? (booting ? BOOT_BANNER : mode === "demo" ? DEMO_BANNER : title));

  const renderView = (v: Shown) => (
    <DotMatrix
      scene={v}
      ink={THEMES[theme].lit}
      accent={THEMES[theme].accent}
      paused={reduced}
      sample={v === "spectrum" || v === "eq3d" ? sample : undefined}
    />
  );

  const style = { "--vfd": THEMES[theme].lit, "--accent": THEMES[theme].accent } as CSSProperties;

  return (
    <div
      className="headunit"
      style={style}
      data-reduced={reduced || undefined}
      data-lamp={lamp || undefined}
    >
      <div className="faceplate">
        <div className="silkscreen">
          <span className="model">HX-970</span>
          <span>DIGITAL SIGNAL PROCESSOR</span>
          <span className="silk-right">FM / AM · CD · AUX IN</span>
        </div>

        <div className="face-main">
          <VolumeKnob
            value={volume}
            max={VOL_MAX}
            onChange={(v) => {
              setVolume(v);
              announce(`Volume ${v}`);
            }}
          />
          <div className="window">
            <div className="vfd">
              <div className="row top">
                <SegmentDisplay
                  variant="14"
                  value={source}
                  ghost="~~~"
                  align="left"
                  className="src"
                />
                <span className={`legend${source === "CD" || source === "AUX" ? " on" : ""}`}>
                  TRK
                </span>
                <span className={`legend${source === "FM" ? " on" : ""}`}>MHz</span>
                <SegmentDisplay value={number} ghost="888.8" className="num" />
                <span className="spacer" />
                <span className={`legend${source === "FM" && live ? " on" : ""}`}>ST</span>
                <span className={`legend${live && source !== "CD" ? " on blink" : ""}`}>▶</span>
                <SegmentDisplay
                  value={clock ? (clock.colon ? clock.hm : clock.hm.replace(":", " ")) : ""}
                  ghost="88:88"
                  label={clock ? clock.hm.replace("!", "") : "clock"}
                  className="clock"
                />
              </div>

              <div className="row">
                <Marquee text={marquee} width={16} paused={reduced || flash !== null} />
              </div>

              <div className="viz-slot" ref={vizSlot}>
                <div className="viz" aria-live="off" style={vizSize}>
                  {layers.map((v) => (
                    <div key={v} className="viz-layer" style={layerStyle(v)}>
                      {renderView(v)}
                    </div>
                  ))}
                  {tuning && (
                    <div className="viz-layer viz-static">
                      <DotMatrix
                        scene="static"
                        ink={THEMES[theme].lit}
                        accent={THEMES[theme].accent}
                        paused={reduced}
                      />
                    </div>
                  )}
                  {vis.wipe >= 0 && (
                    <div
                      className="wipe-edge"
                      style={{ left: `${(vis.wipe / WIPE_COLS) * 100}%` }}
                      aria-hidden
                    />
                  )}
                </div>
              </div>

              <div className="row bottom">
                <SegmentDisplay
                  variant="14"
                  value={booting ? "HELLO" : MODE_NAMES[mode]}
                  ghost="~~~~~~~~"
                  align="left"
                  label={`Display mode: ${MODE_NAMES[mode]}`}
                  className="modeseg"
                />
                <span className="spacer" />
                <div className="eq-legends" aria-label={`EQ: ${eq}`} role="img">
                  {EQ_ORDER.map((name) => (
                    <span key={name} className={`eq-box${name === eq ? " on" : ""}`}>
                      <svg viewBox="0 0 12 6" aria-hidden>
                        <path d={EQ_ICON[name]} />
                      </svg>
                      {name}
                    </span>
                  ))}
                </div>
                <span className="spacer" />
                <SegmentDisplay
                  variant="14"
                  value={THEMES[theme].label}
                  ghost="~~~~"
                  align="left"
                  className="modeseg"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="keys">
          <button type="button" className="key" onClick={cycleSource}>
            SRC
          </button>
          <button type="button" className="key" onClick={() => seek(-1)} aria-label="Previous">
            ◀◀
          </button>
          <button type="button" className="key" onClick={() => seek(1)} aria-label="Next">
            ▶▶
          </button>
          <button
            type="button"
            className="key key-wide"
            onClick={cycleMode}
            aria-label={`Display mode: ${MODE_NAMES[mode]}`}
          >
            MODE
          </button>
          <button type="button" className="key" onClick={cycleEq} aria-label={`EQ preset: ${eq}`}>
            EQ
          </button>
          <ThemeToggle theme={theme} onChange={setTheme} />
          <button type="button" className="key" onClick={() => fileInput.current?.click()}>
            LOAD
          </button>
          <button
            type="button"
            className="key"
            onClick={togglePlay}
            disabled={!(source === "FM" || (source === "AUX" && file))}
            aria-label={live ? "Pause" : "Play"}
          >
            ▶❚❚
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="audio/*"
            hidden
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </div>
      {source === "FM" && (
        <p className="credit">
          FM {STATIONS[station].freq} is{" "}
          <a href={STATIONS[station].site} target="_blank" rel="noopener noreferrer">
            {STATIONS[station].name}
          </a>
          , streamed live from the station. Not affiliated; support them if you enjoy it.
        </p>
      )}
    </div>
  );
}
