import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { userCanWriteProfile } from "@/lib/profile-ownership";
import { getLinkedMoments, getSongMemory } from "@/lib/music-memories/queries";
import SongEditor from "@/components/music-memories/SongEditor";

export const metadata: Metadata = { title: "Edit song" };
export const dynamic = "force-dynamic";

/** Edit shell: WRITE authorization against the song's own context. */
export default async function EditSongPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const song = await getSongMemory(params.id);
  const authorized =
    !!song &&
    (song.memory_profile_id == null
      ? song.user_id === user.id
      : await userCanWriteProfile(user.id, song.memory_profile_id));

  if (!song || !authorized) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <Link
          href="/activities/music"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-medium text-charcoal-soft transition hover:text-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Music Memories
        </Link>
        <div className="mt-6 rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
          <p className="text-charcoal-soft">This song can&apos;t be edited.</p>
          <p className="mt-1 text-sm text-charcoal-muted">
            It may have been removed, or your access here is view-only.
          </p>
        </div>
      </div>
    );
  }

  const moments = await getLinkedMoments(song);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link
        href={`/activities/music/${song.id}`}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-medium text-charcoal-soft transition hover:text-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to the song
      </Link>

      <header className="mt-4">
        <h1 className="font-serif text-2xl font-semibold text-charcoal md:text-3xl">
          Edit song
        </h1>
        <p className="mt-1 text-charcoal-soft">
          Update the details, or change which memories it holds.
        </p>
      </header>

      <SongEditor
        songId={song.id}
        initial={{
          title: song.title,
          artist: song.artist,
          era: song.era,
          note: song.note,
          spotifyUrl: song.spotify_url,
        }}
        initialMoments={moments.map((m) => ({
          id: m.id,
          title: m.title || m.content.slice(0, 60) || "Untitled memory",
          imageUrl: m.imageUrl,
        }))}
      />
    </div>
  );
}
