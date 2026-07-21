"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { haptic, hapticSuccess } from "@/lib/haptics";
import {
  SONG_ARTIST_MAX,
  SONG_ERA_MAX,
  SONG_NOTE_MAX,
  SONG_TITLE_MAX,
} from "@/lib/music-memories/types";
import { updateSongMemory } from "@/app/(app)/activities/music/actions";
import SpotifyImportField from "@/components/music-memories/SpotifyImportField";
import MomentOrderList, {
  type MomentListItem,
} from "@/components/stories/MomentOrderList";

/**
 * Edit a song memory: details + linked-memory order/removal via the ONE
 * shared button-driven MomentOrderList (reused from Story Builder — Move
 * earlier/later ≥44px controls, position-aware labels; never drag-only).
 */
export default function SongEditor({
  songId,
  initial,
  initialMoments,
}: {
  songId: string;
  initial: {
    title: string;
    artist: string;
    era: string;
    note: string;
    spotifyUrl: string;
  };
  initialMoments: MomentListItem[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [artist, setArtist] = useState(initial.artist);
  const [era, setEra] = useState(initial.era);
  const [note, setNote] = useState(initial.note);
  const [spotifyUrl, setSpotifyUrl] = useState(initial.spotifyUrl);
  const [moments, setMoments] = useState(initialMoments);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [announce, setAnnounce] = useState("");

  const move = useCallback((index: number, dir: -1 | 1) => {
    setMoments((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
    setAnnounce(`Moved to position ${index + 1 + dir}.`);
    void haptic("light");
  }, []);

  const remove = useCallback((index: number) => {
    setMoments((prev) => prev.filter((_, i) => i !== index));
    setAnnounce("Memory unlinked from this song.");
    void haptic("light");
  }, []);

  const onSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    void haptic("medium");
    const result = await updateSongMemory({
      songId,
      title,
      artist,
      era,
      note,
      memoryIds: moments.map((m) => m.id),
      spotifyUrl,
    });
    if (result.ok) {
      void hapticSuccess();
      router.push(`/activities/music/${songId}`);
      return;
    }
    setSaving(false);
    setError("We couldn't save your changes. Please check the title and try again.");
  }, [saving, songId, title, artist, era, note, moments, spotifyUrl, router]);

  const canSave = title.trim().length > 0 && !saving;
  const inputClass =
    "mt-1 w-full rounded-xl border border-sand-deep px-4 py-3 text-base text-charcoal outline-none transition placeholder:text-charcoal-muted focus:border-primary focus:ring-2 focus:ring-primary/40";

  return (
    <section className="mt-6 space-y-4">
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>

      {error && (
        <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      )}

      <SpotifyImportField
        spotifyUrl={spotifyUrl}
        onImported={({ title: imported, spotifyUrl: url }) => {
          setTitle(imported);
          setSpotifyUrl(url);
        }}
        onClear={() => setSpotifyUrl("")}
      />

      <div>
        <label htmlFor="edit-song-title" className="block text-sm font-medium text-charcoal-soft">
          Song title
        </label>
        <input
          id="edit-song-title"
          type="text"
          value={title}
          maxLength={SONG_TITLE_MAX}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="edit-song-artist" className="block text-sm font-medium text-charcoal-soft">
          Artist <span className="text-charcoal-muted">(optional)</span>
        </label>
        <input
          id="edit-song-artist"
          type="text"
          value={artist}
          maxLength={SONG_ARTIST_MAX}
          onChange={(e) => setArtist(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="edit-song-era" className="block text-sm font-medium text-charcoal-soft">
          Era or year <span className="text-charcoal-muted">(optional)</span>
        </label>
        <input
          id="edit-song-era"
          type="text"
          value={era}
          maxLength={SONG_ERA_MAX}
          onChange={(e) => setEra(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="edit-song-note" className="block text-sm font-medium text-charcoal-soft">
          Why this song? <span className="text-charcoal-muted">(optional)</span>
        </label>
        <textarea
          id="edit-song-note"
          value={note}
          maxLength={SONG_NOTE_MAX}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          className={inputClass}
        />
      </div>

      {moments.length > 0 && (
        <div>
          <h2 className="font-serif text-lg font-semibold text-charcoal">
            Linked memories
          </h2>
          <div className="mt-2">
            <MomentOrderList items={moments} onMove={move} onRemove={remove} />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={!canSave}
          onClick={() => void onSave()}
          aria-busy={saving || undefined}
          className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-primary px-6 py-3 font-semibold text-white shadow-soft transition hover:bg-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <Link
          href={`/activities/music/${songId}`}
          className="flex min-h-11 items-center justify-center rounded-full border border-sand-deep/70 bg-white px-6 py-3 font-semibold text-charcoal transition hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Cancel
        </Link>
      </div>
    </section>
  );
}
