import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getActiveContext } from "@/lib/active-profile";
import {
  listMatchGames,
  type MatchGameSummary,
} from "@/lib/memory-match/queries";
import { matchSizeConfig } from "@/lib/memory-match/types";
import RemyStage from "@/components/remy/platform/RemyStage";

export const metadata: Metadata = { title: "Memory Match" };
export const dynamic = "force-dynamic";

function GameCard({ game }: { game: MatchGameSummary }) {
  const size = matchSizeConfig(game.pairs);
  const state =
    game.matchedCount > 0
      ? `${game.matchedCount} of ${game.pairs} pairs found`
      : game.completed_count > 0
        ? "Completed — play again"
        : "Ready to play";
  return (
    <Link
      href={`/activities/match/${game.id}`}
      className="flex items-center gap-4 rounded-3xl border border-sand-deep/70 bg-white p-4 shadow-soft transition hover:border-primary/30 hover:shadow-soft-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {game.thumbUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URL
        <img
          src={game.thumbUrl}
          alt=""
          className="h-12 w-12 shrink-0 rounded-2xl object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sand font-serif text-xl text-gold-ink"
        >
          ⁂
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[17px] font-semibold text-charcoal">
          {size?.label ?? "Match"} game · {game.pairs} pairs
        </span>
        <span className="mt-0.5 block text-sm text-charcoal-muted">{state}</span>
      </span>
      <span aria-hidden className="shrink-0 text-sm font-semibold text-primary">
        {game.matchedCount > 0 ? "Continue" : "Play"}
      </span>
    </Link>
  );
}

/**
 * Memory Match hub (Activity #3). Honest shelves from real persisted data
 * (in-progress = matched pairs saved; finished = completed at least once).
 * Probe-gated setting-up state until the operator applies the migration.
 */
export default async function MatchHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const context = await getActiveContext();
  const activeProfileId = context.type === "CARE" ? context.profileId : null;
  const listing = await listMatchGames(user.id, activeProfileId);

  const shelves = [
    { id: "continue", label: "Continue playing", items: listing.inProgress },
    { id: "fresh", label: "Ready to play", items: listing.fresh },
    { id: "finished", label: "Finished games", items: listing.finished },
  ];
  const hasAny = shelves.some((s) => s.items.length > 0);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link
        href="/activities"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-medium text-charcoal-soft transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Remy&apos;s Activities
      </Link>

      <header className="mt-4">
        <h1 className="font-serif text-2xl font-semibold text-charcoal md:text-3xl">
          Memory Match
        </h1>
        <p className="mt-1 text-charcoal-soft">
          Find the pairs among your own photos — no rush, no score.
        </p>
      </header>

      {!listing.available ? (
        <section className="mt-6 rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
          <RemyStage context="welcome" size={112} className="mx-auto mb-3" />
          <p className="text-charcoal-soft">
            Remy is setting up the matching table.
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-charcoal-muted">
            Memory Match will open here very soon.
          </p>
        </section>
      ) : (
        <>
          <Link
            href="/activities/match/new"
            className="mt-6 flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-white shadow-soft transition hover:bg-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Plus className="h-5 w-5" aria-hidden />
            Create a game
          </Link>

          {!hasAny && (
            <section className="mt-6 rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
              <RemyStage context="welcome" size={112} className="mx-auto mb-3" />
              <p className="text-charcoal-soft">No games yet.</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-charcoal-muted">
                Pick a few favourite photos and Remy will lay out the cards.
              </p>
            </section>
          )}

          {shelves.map(
            (shelf) =>
              shelf.items.length > 0 && (
                <section
                  key={shelf.id}
                  aria-labelledby={`match-${shelf.id}`}
                  className="mt-8"
                >
                  <h2
                    id={`match-${shelf.id}`}
                    className="font-serif text-lg font-semibold text-charcoal"
                  >
                    {shelf.label}
                  </h2>
                  <div className="mt-3 space-y-3">
                    {shelf.items.map((g) => (
                      <GameCard key={`${shelf.id}-${g.id}`} game={g} />
                    ))}
                  </div>
                </section>
              ),
          )}
        </>
      )}
    </div>
  );
}
