import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { logger, errorMessage } from "@/lib/logger";
import { captureError } from "@/lib/observability/capture";
import {
  SPOTIFY_OEMBED_ENDPOINT,
  canonicalTrackUrlFromOembed,
  parseSpotifyImportUrl,
} from "@/lib/music-memories/spotify";

export const maxDuration = 30;

/**
 * Music Memories — Spotify LINK IMPORT (import-only; no account, no OAuth,
 * no playback). Auth-gated + rate-limited. The pasted link is STRICTLY
 * validated (https; host exactly open.spotify.com or spotify.link; track-only
 * path; length cap) BEFORE any network call, and the server then contacts
 * ONLY Spotify's official oEmbed endpoint — the user's link travels as a
 * query parameter; we never fetch a user-supplied host and never follow user
 * redirects (redirect: "manual"). The oEmbed `html` is string-parsed for the
 * canonical track id and DISCARDED — never rendered, never persisted, never
 * returned to the client. Response: { title, spotifyUrl } only.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = enforceRateLimit("spotifyImport", user.id);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = parseSpotifyImportUrl(body?.url);
  if (!parsed) {
    return NextResponse.json(
      { error: "That doesn't look like a Spotify song link." },
      { status: 400 },
    );
  }

  try {
    const oembedUrl = `${SPOTIFY_OEMBED_ENDPOINT}?url=${encodeURIComponent(parsed.oembedUrl)}`;
    const res = await fetch(oembedUrl, {
      redirect: "manual",
      signal: AbortSignal.timeout(8_000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Spotify couldn't find that song right now." },
        { status: 502 },
      );
    }
    const payload = (await res.json().catch(() => null)) as {
      title?: unknown;
      html?: unknown;
      iframe_url?: unknown;
    } | null;
    if (!payload) {
      return NextResponse.json(
        { error: "Spotify couldn't find that song right now." },
        { status: 502 },
      );
    }

    // Canonical track id comes from oEmbed itself — this both resolves
    // spotify.link short links and enforces TRACK-only for them.
    const spotifyUrl =
      parsed.kind === "track"
        ? parsed.canonicalUrl
        : canonicalTrackUrlFromOembed(payload);
    if (!spotifyUrl) {
      return NextResponse.json(
        { error: "That Spotify link isn't a song. Try a track link." },
        { status: 400 },
      );
    }

    const title =
      typeof payload.title === "string" ? payload.title.trim().slice(0, 120) : "";
    if (!title) {
      return NextResponse.json(
        { error: "Spotify didn't return a title for that link." },
        { status: 502 },
      );
    }

    return NextResponse.json({ title, spotifyUrl });
  } catch (error) {
    // Timeout / network failure — calm structured error; manual entry stays usable.
    logger.error("[spotify-import] lookup failed", errorMessage(error));
    captureError(error, { route: "music.spotify-import" });
    return NextResponse.json(
      { error: "Spotify isn't reachable right now — you can still add the song by hand." },
      { status: 502 },
    );
  }
}
