// Audio source for the spectrum analyzer.
//
// With a local file or a live radio stream playing:
// <audio> -> MediaElementSource -> AnalyserNode -> speakers, and FFT bins are
// bucketed into log-spaced bands.
// Without one: a procedural generator (kick/snare/hat envelopes + per-band
// random walk) so the display always looks alive.

const MIN_HZ = 40;
const MAX_HZ = 16000;

export type AudioStatus = "idle" | "tuning" | "playing" | "paused" | "error";

const TUNE_TIMEOUT_MS = 15000;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gain: GainNode | null = null;
  private volume = 0.12;
  private source: MediaElementAudioSourceNode | null = null;
  private bins: Uint8Array<ArrayBuffer> | null = null;
  private fileUrl: string | null = null;
  private current: { kind: "file" | "stream"; url: string } | null = null;
  private status: AudioStatus = "idle";
  private tuneTimer: ReturnType<typeof setTimeout> | undefined;
  private walk: number[] = [];
  readonly el: HTMLAudioElement | null = typeof Audio !== "undefined" ? new Audio() : null;

  private onStatus: (s: AudioStatus) => void;

  constructor(onStatus: (s: AudioStatus) => void = () => {}) {
    this.onStatus = onStatus;
    const el = this.el;
    if (!el) return;
    // Required for Web Audio to read cross-origin streams (the station must
    // also send Access-Control-Allow-Origin). Harmless for local blob: files.
    el.crossOrigin = "anonymous";
    el.addEventListener("playing", () => this.emit("playing"));
    el.addEventListener("waiting", () => this.current && this.emit("tuning"));
    el.addEventListener("error", () => this.current && this.emit("error"));
  }

  private emit(s: AudioStatus) {
    if (s !== "tuning") clearTimeout(this.tuneTimer);
    this.status = s;
    this.onStatus(s);
  }

  /** Created lazily; must happen inside a user gesture. */
  private ensureGraph() {
    if (this.ctx || !this.el) return;
    this.ctx = new AudioContext();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.55;
    this.analyser.minDecibels = -85;
    this.analyser.maxDecibels = -12; // headroom for loudly mastered broadcast audio
    this.gain = this.ctx.createGain();
    this.gain.gain.value = this.volume;
    // Analyser sits before the volume stage, so the display doesn't shrink
    // when you turn it down (like a real head unit's spectrum).
    this.source = this.ctx.createMediaElementSource(this.el);
    this.source.connect(this.analyser).connect(this.gain).connect(this.ctx.destination);
    this.bins = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
  }

  /** Output gain, 0..1 (linear). Safe to call before audio starts. */
  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.gain && this.ctx)
      this.gain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
  }

  get active() {
    return this.current !== null;
  }

  get playing() {
    return !!this.el && !this.el.paused;
  }

  /** Must be called from a user gesture (file input change / click). */
  async playFile(file: File) {
    if (this.fileUrl) URL.revokeObjectURL(this.fileUrl);
    this.fileUrl = URL.createObjectURL(file);
    this.current = { kind: "file", url: this.fileUrl };
    await this.start(this.fileUrl, true);
  }

  /** Must be called from a user gesture (button click). */
  async playStream(url: string) {
    this.current = { kind: "stream", url };
    await this.start(url, false);
  }

  private async start(url: string, loop: boolean) {
    const el = this.el;
    if (!el) return;
    this.ensureGraph();
    this.emit("tuning");
    this.tuneTimer = setTimeout(
      () => this.status === "tuning" && this.emit("error"),
      TUNE_TIMEOUT_MS,
    );
    el.loop = loop;
    el.src = url;
    await this.ctx?.resume();
    try {
      await el.play();
    } catch (e) {
      // AbortError = we retuned before this one started; not a failure.
      if ((e as DOMException).name !== "AbortError") this.emit("error");
    }
  }

  /** Silence the element (switching to a source with no real audio). */
  stop() {
    this.current = null;
    if (this.el) {
      this.el.pause();
      this.el.removeAttribute("src");
      this.el.load();
    }
    this.emit("idle");
  }

  /** Play/pause. Live streams restart at the live edge instead of resuming a stale buffer. */
  async toggle() {
    const el = this.el;
    if (!el || !this.current) return false;
    if (el.paused) {
      if (this.current.kind === "stream") await this.start(this.current.url, false);
      else {
        await this.ctx?.resume();
        await el.play();
      }
    } else {
      el.pause();
      this.emit("paused");
    }
    return this.playing;
  }

  /** `n` band levels in 0..1. */
  bands(n: number): number[] {
    if (this.analyser && this.bins && this.current) return this.realBands(n);
    return this.fakeBands(n);
  }

  private realBands(n: number) {
    const analyser = this.analyser!;
    const bins = this.bins!;
    analyser.getByteFrequencyData(bins);
    const nyquist = analyser.context.sampleRate / 2;
    const hzPerBin = nyquist / bins.length;
    const top = Math.min(MAX_HZ, nyquist);
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      // Log-spaced band edges between MIN_HZ and top.
      const lo = MIN_HZ * Math.pow(top / MIN_HZ, i / n);
      const hi = MIN_HZ * Math.pow(top / MIN_HZ, (i + 1) / n);
      const a = Math.floor(lo / hzPerBin);
      const b = Math.max(a + 1, Math.floor(hi / hzPerBin));
      let peak = 0;
      for (let k = a; k < b && k < bins.length; k++) peak = Math.max(peak, bins[k]);
      // Gentle tilt so highs aren't permanently empty.
      const tilt = 1 + (i / n) * 0.35;
      out.push(Math.min(1, (peak / 255) * tilt));
    }
    return out;
  }

  private fakeBands(n: number) {
    const t = performance.now() / 1000;
    const bpm = 112;
    const beat = (t * bpm) / 60;
    const phase = beat % 1;
    const bar = Math.floor(beat) % 4;
    const kick = Math.pow(1 - phase, 3);
    const snare = bar % 2 === 1 ? Math.pow(1 - phase, 2) : 0;
    const hat = Math.pow(1 - ((beat * 2) % 1), 6);

    if (this.walk.length !== n) this.walk = Array.from({ length: n }, () => Math.random());
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      const x = i / (n - 1);
      this.walk[i] = Math.min(1, Math.max(0, this.walk[i] + (Math.random() - 0.5) * 0.35));
      const body = 0.55 - x * 0.3 + Math.sin(t * 0.7 + i * 0.9) * 0.08;
      const v =
        body * (0.55 + this.walk[i] * 0.45) +
        kick * Math.max(0, 0.5 - x * 1.4) +
        snare * 0.3 * Math.exp(-Math.pow((x - 0.45) / 0.2, 2)) +
        hat * 0.35 * Math.max(0, x - 0.55);
      out.push(Math.min(1, Math.max(0, v)));
    }
    return out;
  }

  dispose() {
    clearTimeout(this.tuneTimer);
    this.el?.pause();
    if (this.fileUrl) URL.revokeObjectURL(this.fileUrl);
    this.fileUrl = null;
    this.current = null;
    void this.ctx?.close();
  }
}
