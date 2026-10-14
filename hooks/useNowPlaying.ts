"use client";

import { useEffect, useState } from "react";
import type { NowPlayingSource } from "@/lib/stations";

const POLL_MS = 20000;

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"');

const join = (artist?: string | null, title?: string | null) =>
  [artist, title].filter(Boolean).join(" - ").trim() || null;

async function poll(src: Exclude<NowPlayingSource, null>, signal: AbortSignal) {
  const get = async (url: string) => (await fetch(url, { signal, cache: "no-store" })).json();
  switch (src.kind) {
    case "plaza": {
      const d = await get("https://api.plaza.one/status");
      return join(d.song?.artist, d.song?.title);
    }
    case "kexp": {
      const d = await get("https://api.kexp.org/v2/plays/?limit=1");
      const p = d.results?.[0];
      return p?.play_type === "trackplay" ? join(p.artist, p.song) : "On air break";
    }
    case "nts": {
      const d = await get("https://www.nts.live/api/v2/live");
      const ch = d.results?.find((r: { channel_name: string }) => r.channel_name === src.channel);
      return ch ? decode(ch.now.broadcast_title) : null;
    }
    case "radioparadise": {
      const d = await get("/api/now-playing?src=radioparadise");
      return join(d.artist, d.title);
    }
    default:
      return null;
  }
}

/**
 * "Artist - Title" (or show name) for the tuned station, or null when the
 * station has no feed / the feed fails. Only runs while `enabled`.
 */
export function useNowPlaying(src: NowPlayingSource, enabled: boolean) {
  const [text, setText] = useState<string | null>(null);
  const key = JSON.stringify(src);

  useEffect(() => {
    setText(null);
    if (!src || !enabled) return;

    // Nightride pushes every channel's track changes over one SSE stream.
    if (src.kind === "nightride") {
      const es = new EventSource("https://nightride.fm/meta");
      es.onmessage = (e) => {
        try {
          const items = JSON.parse(e.data) as { station: string; artist: string; title: string }[];
          const hit = items.find((i) => i.station === src.station);
          if (hit) setText(join(hit.artist, hit.title));
        } catch {
          /* keepalive or malformed frame */
        }
      };
      return () => es.close();
    }

    const ctl = new AbortController();
    const run = () =>
      poll(src, ctl.signal)
        .then((t) => setText(t))
        .catch(() => {
          if (!ctl.signal.aborted) setText(null);
        });
    void run();
    const id = setInterval(run, POLL_MS);
    return () => {
      ctl.abort();
      clearInterval(id);
    };
  }, [key, enabled]);

  return text;
}
