"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Music } from "lucide-react";

import { haptic, hapticSuccess } from "@/lib/haptics";
import {
  SONG_ARTIST_MAX,
  SONG_ERA_MAX,
  SONG_MAX_LINKS,
  SONG_NOTE_MAX,
  SONG_TITLE_MAX,
} from "@/lib/music-memories/types";
import { createSongMemory } from "@/app/(app)/activities/music/actions";
import SpotifyImportField from "@/components/music-memories/SpotifyImportField";

/**
 * Music Memories create wizard: song DETAILS (title required; artist/era/note
 * optional) → OPTIONAL memory linking (0–12, selection order preserved) →
 * save. The picker reuses the Story Builder pattern over the existing
 * paginated /api/memories feed (`data.data` shape, settle-always + retry,
 * signed thumbs / serif text tiles). NO audio anywhere in v1.
 */

type PickerMemory = {
  id: string;
  title: string;
  excerpt: string;
  thumbUrl: string | null;
};

const PICKER_PAGE = 50;

function toPickerMemory(raw: unknown): PickerMemory | null {
  const m = raw as Record<string, unknown> | null;
  if (!m?.id) return null;
  const attachments = (Array.isArray(m.attachments) ? m.attachments : []) as Array<
    Record<string, unknown>
  >;
  const image = attachments.find((a) => {
    const mime = String(a?.mimeType ?? a?.type ?? "");
    return typeof a?.url === "string" && (!mime || mime.startsWith("image"));
  });
  const content = typeof m.content === "string" ? m.content : "";
  return {
    id: String(m.id),
    title: typeof m.title === "string" ? m.title : "",
    excerpt: content.slice(0, 80),
    thumbUrl:
      typeof image?.thumbnailUrl === "string"
        ? (image.thumbnailUrl as string)
        : typeof image?.url === "string"
          ? (image.url as string)
          : null,
  };
}

export default function SongWizard() {
  const router = useRouter();
  const [step, setStep] = useState<"details" | "link">("details");
  const [error, setError] = useState("");

  // ---- details ----
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [era, setEra] = useState("");
  const [note, setNote] = useState("");
  const [spotifyUrl, setSpotifyUrl] = useState(""); // import-only source metadata

  // ---- optional linking ----
  const [memories, setMemories] = useState<PickerMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const loadPage = useCallback(async (pageOffset: number): Promise<void> => {
    setError("");
    setFailed(false);
    try {
      const res = await fetch(
        `/api/memories?limit=${PICKER_PAGE}&offset=${pageOffset}`,
        { cache: "no-store", signal: AbortSignal.timeout(15_000) },
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];
      const page = (list as unknown[])
        .map(toPickerMemory)
        .filter(Boolean) as PickerMemory[];
      setMemories((prev) => (pageOffset === 0 ? page : [...prev, ...page]));
      setOffset(pageOffset + PICKER_PAGE);
      setHasMore((list as unknown[]).length === PICKER_PAGE);
    } catch {
      setFailed(true);
      setError("We couldn't load your memories right now.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadPage(0);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadPage]);

  const retry = useCallback(async () => {
    setLoading(true);
    await loadPage(0);
    setLoading(false);
  }, [loadPage]);

  const toggle = useCallback((id: string) => {
    void haptic("light");
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= SONG_MAX_LINKS) return prev;
      return [...prev, id];
    });
  }, []);

  const onSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    void haptic("medium");
    const result = await createSongMemory({
      title,
      artist,
      era,
      note,
      memoryIds: selectedIds,
      spotifyUrl,
    });
    if (result.ok && result.songId) {
      void hapticSuccess();
      router.push(`/activities/music/${result.songId}`);
      return;
    }
    setSaving(false);
    setError(
      !result.ok && result.reason === "unavailable"
        ? "Music Memories isn't quite ready yet — please try again soon."
        : "We couldn't save this song. Please check the title and try again.",
    );
  }, [saving, title, artist, era, note, selectedIds, spotifyUrl, router]);

  const canContinue = title.trim().length > 0;

  const inputClass =
    "mt-1 w-full rounded-xl border border-sand-deep px-4 py-3 text-base text-charcoal outline-none transition placeholder:text-charcoal-muted focus:border-sage focus:ring-2 focus:ring-sage/40";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <button
        type="button"
        onClick={() =>
          step === "details"
            ? router.push("/activities/music")
            : setStep("details")
        }
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-medium text-charcoal-soft transition hover:text-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {step === "details" ? "Music Memories" : "Back to the song"}
      </button>

      <header className="mt-4">
        <h1 className="font-serif text-2xl font-semibold text-charcoal md:text-3xl">
          {step === "details" ? "Add a song" : "Which memories hold this song?"}
        </h1>
        <p className="mt-1 text-charcoal-soft">
          {step === "details"
            ? "A song that means something — and a few words about why."
            : "Optional — link the moments this song brings back."}
        </p>
      </header>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600"
        >
          {error}
        </p>
      )}

      {step === "details" && (
        <section className="mt-6 space-y-4">
          <SpotifyImportField
            spotifyUrl={spotifyUrl}
            onImported={({ title: imported, spotifyUrl: url }) => {
              setTitle(imported);
              setSpotifyUrl(url);
            }}
            onClear={() => setSpotifyUrl("")}
          />
          <div>
            <label htmlFor="song-title" className="block text-sm font-medium text-charcoal-soft">
              Song title
            </label>
            <input
              id="song-title"
              type="text"
              value={title}
              maxLength={SONG_TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Moon River"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="song-artist" className="block text-sm font-medium text-charcoal-soft">
              Artist <span className="text-charcoal-muted">(optional)</span>
            </label>
            <input
              id="song-artist"
              type="text"
              value={artist}
              maxLength={SONG_ARTIST_MAX}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="e.g. Andy Williams"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="song-era" className="block text-sm font-medium text-charcoal-soft">
              Era or year <span className="text-charcoal-muted">(optional)</span>
            </label>
            <input
              id="song-era"
              type="text"
              value={era}
              maxLength={SONG_ERA_MAX}
              onChange={(e) => setEra(e.target.value)}
              placeholder="e.g. 1962, or “our wedding year”"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="song-note" className="block text-sm font-medium text-charcoal-soft">
              Why this song? <span className="text-charcoal-muted">(optional)</span>
            </label>
            <textarea
              id="song-note"
              value={note}
              maxLength={SONG_NOTE_MAX}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="Who sang it, where it played, what it brings back…"
              className={inputClass}
            />
          </div>
          <button
            type="button"
            disabled={!canContinue}
            onClick={() => setStep("link")}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-sage px-6 py-3 font-semibold text-white shadow-soft transition hover:bg-sage-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 disabled:opacity-50"
          >
            <Music className="h-5 w-5" aria-hidden />
            Continue
          </button>
        </section>
      )}

      {step === "link" && (
        <section className="mt-6">
          {loading ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-hidden>
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square animate-pulse rounded-2xl bg-sand-deep/40 motion-reduce:animate-none"
                />
              ))}
            </div>
          ) : failed && memories.length === 0 ? (
            <div className="rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
              <p className="text-charcoal-soft">
                We couldn&apos;t load your memories right now.
              </p>
              <p className="mt-1 text-sm text-charcoal-muted">
                You can still save the song and link memories later.
              </p>
              <button
                type="button"
                onClick={() => void retry()}
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-sand-deep/70 bg-white px-6 py-2.5 text-sm font-semibold text-charcoal transition hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
              >
                Try again
              </button>
            </div>
          ) : memories.length === 0 && !failed ? (
            <div className="rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
              <p className="text-charcoal-soft">No memories yet to link.</p>
              <p className="mt-1 text-sm text-charcoal-muted">
                You can save the song on its own.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {memories.map((m) => {
                  const orderIndex = selectedIds.indexOf(m.id);
                  const isSelected = orderIndex !== -1;
                  const name = m.title || m.excerpt || "Untitled memory";
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggle(m.id)}
                      aria-pressed={isSelected}
                      aria-label={
                        isSelected
                          ? `Unlink “${name}”`
                          : `Link “${name}” to this song`
                      }
                      className={`relative aspect-square overflow-hidden rounded-2xl border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage ${
                        isSelected ? "border-sage ring-2 ring-sage" : "border-sand-deep/60"
                      }`}
                    >
                      {m.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URL
                        <img
                          src={m.thumbUrl}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full flex-col justify-between bg-sand p-3">
                          <span className="font-serif text-2xl leading-none text-gold-ink" aria-hidden>
                            ”
                          </span>
                          <span className="line-clamp-3 text-sm font-medium text-charcoal">
                            {name}
                          </span>
                        </span>
                      )}
                      {isSelected && (
                        <span
                          aria-hidden
                          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-sage text-xs font-bold text-white shadow-soft"
                        >
                          {orderIndex + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {hasMore && (
                <button
                  type="button"
                  onClick={() => void loadPage(offset)}
                  className="mx-auto mt-4 flex min-h-11 items-center justify-center rounded-full border border-sand-deep/70 bg-white px-6 py-2.5 text-sm font-semibold text-charcoal transition hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
                >
                  Show more memories
                </button>
              )}
            </>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={() => void onSave()}
            aria-busy={saving || undefined}
            className="mt-6 flex min-h-11 w-full items-center justify-center rounded-full bg-sage px-6 py-3 font-semibold text-white shadow-soft transition hover:bg-sage-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {saving
              ? "Saving…"
              : selectedIds.length > 0
                ? `Save song with ${selectedIds.length} linked memor${selectedIds.length === 1 ? "y" : "ies"}`
                : "Save song without links"}
          </button>
        </section>
      )}
    </div>
  );
}
