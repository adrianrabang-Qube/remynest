import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Music, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getActiveContext } from "@/lib/active-profile";
import { listSongMemories } from "@/lib/music-memories/queries";
import RemyStage from "@/components/remy/platform/RemyStage";

export const metadata: Metadata = { title: "Music Memories" };
export const dynamic = "force-dynamic";

/**
 * Music Memories hub (Activity #4) — "Your songs": one honest list (a saved
 * song has no in-progress state). Probe-gated "music room" state until the
 * operator applies the migration. NO audio in v1.
 */
export default async function MusicHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const context = await getActiveContext();
  const activeProfileId = context.type === "CARE" ? context.profileId : null;
  const listing = await listSongMemories(user.id, activeProfileId);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link
        href="/activities"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-medium text-charcoal-soft transition hover:text-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Remy&apos;s Activities
      </Link>

      <header className="mt-4">
        <h1 className="font-serif text-2xl font-semibold text-charcoal md:text-3xl">
          Music Memories
        </h1>
        <p className="mt-1 text-charcoal-soft">
          The songs of your life — and the memories they hold.
        </p>
      </header>

      {!listing.available ? (
        <section className="mt-6 rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
          <RemyStage context="welcome" size={112} className="mx-auto mb-3" />
          <p className="text-charcoal-soft">Remy is setting up the music room.</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-charcoal-muted">
            Music Memories will open here very soon.
          </p>
        </section>
      ) : (
        <>
          <Link
            href="/activities/music/new"
            className="mt-6 flex min-h-11 items-center justify-center gap-2 rounded-full bg-sage px-6 py-3 font-semibold text-white shadow-soft transition hover:bg-sage-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
          >
            <Plus className="h-5 w-5" aria-hidden />
            Add a song
          </Link>

          {listing.songs.length === 0 ? (
            <section className="mt-6 rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
              <RemyStage context="welcome" size={112} className="mx-auto mb-3" />
              <p className="text-charcoal-soft">No songs yet.</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-charcoal-muted">
                Start with one that always brings something back.
              </p>
            </section>
          ) : (
            <section aria-labelledby="your-songs" className="mt-8">
              <h2
                id="your-songs"
                className="font-serif text-lg font-semibold text-charcoal"
              >
                Your songs
              </h2>
              <div className="mt-3 space-y-3">
                {listing.songs.map((song) => (
                  <Link
                    key={song.id}
                    href={`/activities/music/${song.id}`}
                    className="flex items-center gap-4 rounded-3xl border border-sand-deep/70 bg-white p-4 shadow-soft transition hover:border-sage/30 hover:shadow-soft-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
                  >
                    <span
                      aria-hidden
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sand text-gold-ink"
                    >
                      <Music className="h-6 w-6" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[17px] font-semibold text-charcoal">
                        {song.title}
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-charcoal-muted">
                        {[song.artist, song.era].filter(Boolean).join(" · ") ||
                          (song.memory_ids.length > 0
                            ? `${song.memory_ids.length} linked memor${song.memory_ids.length === 1 ? "y" : "ies"}`
                            : "A song worth keeping")}
                      </span>
                    </span>
                    <span aria-hidden className="shrink-0 text-sm font-semibold text-sage">
                      Open
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
