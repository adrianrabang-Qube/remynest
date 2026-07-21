import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Music } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { userCanAccessProfile } from "@/lib/profile-ownership";
import { getLinkedMoments, getSongMemory } from "@/lib/music-memories/queries";
import SongActions from "@/components/music-memories/SongActions";

export const metadata: Metadata = { title: "Song memory" };
export const dynamic = "force-dynamic";

/**
 * Song detail — details, the personal note, linked memories (signed thumbs /
 * serif text fallback), and a gentle reflection prompt. READ authorization
 * against the song's OWN context; linked moments fetched re-scoped by the
 * same workspace. No audio in v1.
 */
export default async function SongDetailPage({
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
      : await userCanAccessProfile(user.id, song.memory_profile_id));

  if (!song || !authorized) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <Link
          href="/activities/music"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-medium text-charcoal-soft transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Music Memories
        </Link>
        <div className="mt-6 rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
          <p className="text-charcoal-soft">This song isn&apos;t available.</p>
          <p className="mt-1 text-sm text-charcoal-muted">
            It may have been removed, or it belongs to a different workspace.
          </p>
        </div>
      </div>
    );
  }

  const moments = await getLinkedMoments(song);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link
        href="/activities/music"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-medium text-charcoal-soft transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Music Memories
      </Link>

      <header className="mt-4 flex items-start gap-4">
        <span
          aria-hidden
          className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sand text-gold-ink"
        >
          <Music className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <h1 className="font-serif text-2xl font-semibold text-charcoal md:text-3xl">
            {song.title}
          </h1>
          {(song.artist || song.era) && (
            <p className="mt-1 text-charcoal-soft">
              {[song.artist, song.era].filter(Boolean).join(" · ")}
            </p>
          )}
          {song.spotify_url && (
            /* Text-only source indicator — deliberately NOT a link, player,
               artwork, or embed (import-only scope). */
            <p className="mt-1 text-xs text-charcoal-muted">
              Details imported from Spotify
            </p>
          )}
        </div>
      </header>

      <div className="mt-4">
        <SongActions songId={song.id} />
      </div>

      {song.note && (
        <section className="mt-6 rounded-3xl border border-sand-deep/70 bg-white p-5 shadow-soft">
          <h2 className="text-xs font-medium uppercase tracking-wider text-charcoal-muted">
            Why this song
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-[17px] leading-relaxed text-charcoal-soft">
            {song.note}
          </p>
        </section>
      )}

      {moments.length > 0 && (
        <section aria-labelledby="linked-memories" className="mt-6">
          <h2
            id="linked-memories"
            className="font-serif text-lg font-semibold text-charcoal"
          >
            The memories it holds
          </h2>
          <ol className="mt-3 space-y-3">
            {moments.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-4 rounded-3xl border border-sand-deep/70 bg-white p-4 shadow-soft"
              >
                {m.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URL
                  <img
                    src={m.imageUrl}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-2xl object-cover"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sand font-serif text-xl text-gold-ink"
                  >
                    ”
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-charcoal">
                    {m.title || "Untitled memory"}
                  </span>
                  {m.memoryDate && (
                    <span className="mt-0.5 block text-sm text-charcoal-muted">
                      {new Date(m.memoryDate).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Gentle reflection prompt — conversation, never clinical. */}
      <section className="mt-6 rounded-3xl bg-sand p-5">
        <p className="text-[15px] leading-relaxed text-charcoal-soft">
          <span className="font-semibold text-charcoal">A moment to share:</span>{" "}
          next time you&apos;re together, put this song on and see where it
          takes the conversation.
        </p>
      </section>
    </div>
  );
}
