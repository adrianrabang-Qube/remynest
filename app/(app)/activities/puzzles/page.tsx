import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getActiveContext } from "@/lib/active-profile";
import { listPuzzles, type PuzzleSummary } from "@/lib/puzzles/queries";
import RemyStage from "@/components/remy/platform/RemyStage";
import PuzzleCard from "@/components/puzzles/hub/PuzzleCard";

export const metadata: Metadata = { title: "Memory Puzzles" };
export const dynamic = "force-dynamic";

/**
 * Memory Puzzles — the activity hub (Phase 1B; fills the Phase-1 mount point).
 * Workspace comes from the VALIDATED active context (forged-cookie-safe);
 * listing is service-role but explicitly scoped by that context. Probe-gated:
 * before the operator applies the migration the hub shows a calm setting-up
 * state instead of erroring.
 */
export default async function PuzzlesHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // protect-by-default already redirects; belt-and-braces

  const context = await getActiveContext();
  const activeProfileId = context.type === "CARE" ? context.profileId : null;
  const listing = await listPuzzles(user.id, activeProfileId);

  const shelves: Array<{ id: string; label: string; items: PuzzleSummary[] }> = [
    { id: "continue", label: "Continue playing", items: listing.inProgress },
    { id: "fresh", label: "Ready to start", items: listing.fresh },
    { id: "favourites", label: "Favourites", items: listing.favourites },
    { id: "finished", label: "Finished puzzles", items: listing.finished },
  ];
  const hasAny = shelves.some((s) => s.items.length > 0);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link
        href="/activities"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-medium text-charcoal-soft transition hover:text-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Remy&apos;s Activities
      </Link>

      <header className="mt-4 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-charcoal md:text-3xl">
            Memory Puzzles
          </h1>
          <p className="mt-1 text-charcoal-soft">
            Piece a favourite photo back together — no timers, no scores.
          </p>
        </div>
      </header>

      {!listing.available ? (
        /* Migration not applied yet — honest, calm, no dead controls. */
        <section className="mt-6 rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
          <RemyStage context="welcome" size={112} className="mx-auto mb-3" />
          <p className="text-charcoal-soft">Remy is setting up the puzzle table.</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-charcoal-muted">
            Puzzles will open here very soon.
          </p>
        </section>
      ) : (
        <>
          <Link
            href="/activities/puzzles/new"
            className="mt-6 flex min-h-11 items-center justify-center gap-2 rounded-full bg-sage px-6 py-3 font-semibold text-white shadow-soft transition hover:bg-sage-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
          >
            <Plus className="h-5 w-5" aria-hidden />
            Create a puzzle
          </Link>

          {!hasAny && (
            <section className="mt-6 rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
              <RemyStage context="welcome" size={112} className="mx-auto mb-3" />
              <p className="text-charcoal-soft">No puzzles yet.</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-charcoal-muted">
                Pick a photo you love and Remy will turn it into your first
                puzzle.
              </p>
            </section>
          )}

          {shelves.map(
            (shelf) =>
              shelf.items.length > 0 && (
                <section
                  key={shelf.id}
                  aria-labelledby={`shelf-${shelf.id}`}
                  className="mt-8"
                >
                  <h2
                    id={`shelf-${shelf.id}`}
                    className="font-serif text-lg font-semibold text-charcoal"
                  >
                    {shelf.label}
                  </h2>
                  <div className="mt-3 space-y-3">
                    {shelf.items.map((p) => (
                      <PuzzleCard key={`${shelf.id}-${p.id}`} puzzle={p} />
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
