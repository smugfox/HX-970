// Server-side relay for now-playing feeds that don't send CORS headers.
// Only fixed, known upstreams are reachable; the client picks by key.

const UPSTREAMS = {
  radioparadise: "https://api.radioparadise.com/api/now_playing?chan=0",
} as const;

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("src");
  if (!key || !(key in UPSTREAMS))
    return Response.json({ error: "unknown source" }, { status: 400 });
  try {
    const res = await fetch(UPSTREAMS[key as keyof typeof UPSTREAMS], {
      next: { revalidate: 15 },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return Response.json({ error: "upstream" }, { status: 502 });
    const data = (await res.json()) as { artist?: string; title?: string };
    return Response.json({ artist: data.artist ?? null, title: data.title ?? null });
  } catch {
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}
