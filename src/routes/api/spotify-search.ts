import { createFileRoute } from "@tanstack/react-router";

// Client Credentials token cache (server-side only; tokens live ~1 hour).
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const clientId = process.env["SPOTIFY_CLIENT_ID"];
  const clientSecret = process.env["SPOTIFY_CLIENT_SECRET"];
  if (!clientId || !clientSecret) throw new Error("Spotify credentials are not configured.");

  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.value;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spotify auth failed [${res.status}]: ${body}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

export const Route = createFileRoute("/api/spotify-search")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let query = "";
        try {
          const body = (await request.json()) as { query?: string };
          query = (body.query ?? "").trim();
        } catch {
          return Response.json({ error: "Invalid request body." }, { status: 400 });
        }
        if (!query) return Response.json({ error: "Missing search query." }, { status: 400 });

        try {
          const token = await getAccessToken();
          const url = new URL("https://api.spotify.com/v1/search");
          url.searchParams.set("q", query);
          url.searchParams.set("type", "track");
          url.searchParams.set("limit", "1");
          const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) {
            const body = await res.text();
            console.error(`Spotify search failed [${res.status}]: ${body}`);
            // Return 200 with an error field so the UI handles it gracefully instead of tripping the error boundary.
            const premiumBlocked = res.status === 403 && body.includes("premium");
            return Response.json({
              error: premiumBlocked
                ? "Spotify requires a Premium account on the developer app before search works."
                : `Spotify search failed [${res.status}]`,
              premiumBlocked,
            });
          }
          const data = (await res.json()) as {
            tracks?: { items?: Array<{ uri: string; name: string; artists: Array<{ name: string }> }> };
          };
          const track = data.tracks?.items?.[0];
          if (!track) return Response.json({ error: "No tracks found." }, { status: 404 });
          return Response.json({
            uri: track.uri,
            name: track.name,
            artist: track.artists.map((a) => a.name).join(", "),
          });
        } catch (err) {
          console.error("Spotify search error:", err);
          return Response.json({ error: err instanceof Error ? err.message : "Spotify search unavailable." }, { status: 500 });
        }
      },
    },
  },
});
