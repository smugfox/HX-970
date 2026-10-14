// FM presets: real internet radio stations whose stream servers send CORS
// headers, so Web Audio can analyse them (verified Oct 2026; operators can
// change this at any time, in which case the preset shows NO SIGNAL).
// Frequencies are invented for the dial, except KEXP's, which is real.

export type NowPlayingSource =
  | { kind: "nightride"; station: string }
  | { kind: "plaza" }
  | { kind: "kexp" }
  | { kind: "nts"; channel: string }
  | { kind: "radioparadise" }
  | null;

export type Station = {
  freq: string;
  name: string;
  stream: string;
  site: string;
  meta: NowPlayingSource;
};

export const STATIONS: Station[] = [
  {
    freq: "88.3",
    name: "Nightride FM",
    stream: "https://stream.nightride.fm/nightride.mp3",
    site: "https://nightride.fm",
    meta: { kind: "nightride", station: "nightride" },
  },
  {
    freq: "89.9",
    name: "Chillsynth",
    stream: "https://stream.nightride.fm/chillsynth.mp3",
    site: "https://nightride.fm",
    meta: { kind: "nightride", station: "chillsynth" },
  },
  {
    freq: "90.3",
    name: "KEXP Seattle",
    stream: "https://kexp.streamguys1.com/kexp160.aac",
    site: "https://www.kexp.org",
    meta: { kind: "kexp" },
  },
  {
    freq: "92.5",
    name: "Plaza One",
    stream: "https://radio.plaza.one/mp3",
    site: "https://plaza.one",
    meta: { kind: "plaza" },
  },
  {
    freq: "95.7",
    name: "181.fm Awesome 80s",
    stream: "https://listen.181fm.com/181-awesome80s_128k.mp3",
    site: "https://181.fm",
    meta: null,
  },
  {
    freq: "98.1",
    name: "FluxFM 80er",
    stream: "https://streams.fluxfm.de/80er/mp3-128/audio/",
    site: "https://www.fluxfm.de",
    meta: null,
  },
  {
    freq: "101.5",
    name: "Radio Paradise",
    stream: "https://stream.radioparadise.com/mp3-128",
    site: "https://radioparadise.com",
    meta: { kind: "radioparadise" },
  },
  {
    freq: "106.1",
    name: "NTS 1",
    // The ntslive.net URL redirects through a hop without CORS headers;
    // this is the final, CORS-enabled host.
    stream: "https://streams.radiomast.io/nts1",
    site: "https://www.nts.live",
    meta: { kind: "nts", channel: "1" },
  },
];
