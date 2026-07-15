/**
 * Music Memories — Spotify LINK IMPORT validation (pure; no fetch/DB/React).
 *
 * Approved scope is IMPORT-ONLY: a pasted track link prefills editable song
 * details via Spotify's official oEmbed endpoint. No account linking, OAuth,
 * playback, players, iframes, or external-link CTAs — ever.
 *
 * SECURITY MODEL (server-enforced; this module is the single rule source):
 *  - We validate protocol (https), host (exactly `open.spotify.com` or
 *    `spotify.link`), length, and a TRACK-ONLY path BEFORE any network call.
 *  - The server contacts ONLY the fixed official endpoint
 *    `https://open.spotify.com/oembed?url=…` — the user's link travels as a
 *    QUERY PARAM; we never fetch a user-provided host and never follow their
 *    redirects (spotify.link short links are resolved BY SPOTIFY inside
 *    oEmbed, not by us).
 *  - The oEmbed `html` is used ONLY as a string to extract the canonical
 *    track id (never rendered, never persisted).
 *  - The ONLY persisted artifact is the CANONICAL track URL
 *    `https://open.spotify.com/track/<22-char base62 id>`.
 */

export const SPOTIFY_URL_MAX_LENGTH = 200;

/** The single Spotify endpoint the server is allowed to contact. */
export const SPOTIFY_OEMBED_ENDPOINT = "https://open.spotify.com/oembed";

const TRACK_ID_RE = /^[A-Za-z0-9]{22}$/;

/** Canonical persisted form — anything else is dropped, never stored. */
export const SPOTIFY_CANONICAL_RE =
  /^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]{22}$/;

export type SpotifyImportUrl =
  | { kind: "track"; canonicalUrl: string; oembedUrl: string }
  | { kind: "short"; oembedUrl: string };

/**
 * Strictly parse a user-pasted Spotify link. Returns null for anything that
 * is not an https track link on the two allowed hosts (albums, playlists,
 * artists, embeds, other hosts, userinfo tricks, over-long input → null).
 */
export function parseSpotifyImportUrl(input: unknown): SpotifyImportUrl | null {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw || raw.length > SPOTIFY_URL_MAX_LENGTH) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password || url.port) return null;

  const host = url.hostname.toLowerCase();

  if (host === "open.spotify.com") {
    // /track/<id> with an optional Spotify locale prefix (/intl-xx/track/<id>).
    const m = url.pathname.match(/^\/(?:intl-[a-z]{2,5}\/)?track\/([A-Za-z0-9]+)$/i);
    if (!m || !TRACK_ID_RE.test(m[1])) return null;
    const canonicalUrl = `https://open.spotify.com/track/${m[1]}`;
    return { kind: "track", canonicalUrl, oembedUrl: canonicalUrl };
  }

  if (host === "spotify.link") {
    // Official short links: a single opaque slug. Track-ness is proven by the
    // oEmbed response (we extract /track/<id> from it) — we never contact
    // spotify.link ourselves.
    if (!/^\/[A-Za-z0-9]{4,32}$/.test(url.pathname)) return null;
    return { kind: "short", oembedUrl: `https://spotify.link${url.pathname}` };
  }

  return null;
}

/**
 * Extract the canonical track id from an oEmbed response (string search over
 * `html`/`iframe_url` — the html is NEVER rendered or persisted). Returns the
 * canonical track URL, or null when the link isn't a TRACK (album/playlist/…).
 */
export function canonicalTrackUrlFromOembed(payload: {
  html?: unknown;
  iframe_url?: unknown;
}): string | null {
  const haystack = [payload.iframe_url, payload.html]
    .filter((v): v is string => typeof v === "string")
    .join(" ");
  const m = haystack.match(/\/track\/([A-Za-z0-9]{22})/);
  return m ? `https://open.spotify.com/track/${m[1]}` : null;
}

/** Normalize an untrusted to-be-persisted value: canonical track URL or "". */
export function normalizeSpotifyUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const v = value.trim();
  return SPOTIFY_CANONICAL_RE.test(v) ? v : "";
}
