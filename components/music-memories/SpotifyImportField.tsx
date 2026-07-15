"use client";

import { useCallback, useState } from "react";
import { Download, X } from "lucide-react";

import { haptic } from "@/lib/haptics";

/**
 * Optional "Import from Spotify" field — the ONE implementation shared by the
 * song wizard and editor. Import-only: posts the pasted link to the auth-gated
 * server endpoint (which alone talks to Spotify's official oEmbed) and hands
 * back { title, spotifyUrl } to prefill EDITABLE fields. Renders no iframe,
 * player, artwork, or external link — a text-only imported indicator with a
 * remove control. Errors are calm and local; manual entry is never blocked.
 */
export default function SpotifyImportField({
  spotifyUrl,
  onImported,
  onClear,
}: {
  /** Current canonical import ("" = none). */
  spotifyUrl: string;
  onImported: (result: { title: string; spotifyUrl: string }) => void;
  onClear: () => void;
}) {
  const [link, setLink] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [announce, setAnnounce] = useState("");

  const onImport = useCallback(async () => {
    if (pending || !link.trim()) return;
    setPending(true);
    setError("");
    void haptic("light");
    try {
      const res = await fetch("/api/music/spotify-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: link.trim() }),
        signal: AbortSignal.timeout(15_000),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.title || !data?.spotifyUrl) {
        setError(
          typeof data?.error === "string"
            ? data.error
            : "Spotify isn't reachable right now — you can still add the song by hand.",
        );
        return;
      }
      onImported({ title: String(data.title), spotifyUrl: String(data.spotifyUrl) });
      setAnnounce("Song details imported from Spotify. Everything stays editable.");
      setLink("");
    } catch {
      setError("Spotify isn't reachable right now — you can still add the song by hand.");
    } finally {
      setPending(false);
    }
  }, [pending, link, onImported]);

  return (
    <div className="rounded-2xl border border-sand-deep/60 bg-sand/40 p-4">
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>

      {spotifyUrl ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-charcoal-soft">
            <span className="font-semibold text-charcoal">
              Imported from Spotify.
            </span>{" "}
            The details below are yours to edit.
          </p>
          <button
            type="button"
            onClick={() => {
              onClear();
              setAnnounce("Spotify import removed.");
              void haptic("light");
            }}
            aria-label="Remove the Spotify import"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-charcoal-muted transition hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
      ) : (
        <>
          <label
            htmlFor="spotify-import"
            className="block text-sm font-medium text-charcoal-soft"
          >
            Import from Spotify <span className="text-charcoal-muted">(optional)</span>
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="spotify-import"
              type="url"
              inputMode="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Paste a Spotify song link"
              className="min-w-0 flex-1 rounded-xl border border-sand-deep bg-white px-4 py-3 text-base text-charcoal outline-none transition placeholder:text-charcoal-muted focus:border-sage focus:ring-2 focus:ring-sage/40"
            />
            <button
              type="button"
              onClick={() => void onImport()}
              disabled={pending || !link.trim()}
              aria-busy={pending || undefined}
              className="flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-sand-deep/70 bg-white px-4 text-sm font-semibold text-charcoal transition hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage disabled:opacity-50"
            >
              <Download className="h-4 w-4" aria-hidden />
              {pending ? "Asking…" : "Import"}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-charcoal-muted">
            We&apos;ll ask Spotify for this song&apos;s public title. No Spotify
            account is connected.
          </p>
          {error && (
            <p role="alert" className="mt-2 text-sm text-rose-600">
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
