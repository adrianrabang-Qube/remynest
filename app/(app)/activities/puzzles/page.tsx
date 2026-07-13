import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import RemyStage from "@/components/remy/platform/RemyStage";
import { getActivity } from "@/lib/activities/registry";

export const metadata: Metadata = {
  title: "Memory Puzzles",
};

/**
 * Memory Puzzles — the Phase-1 MOUNT POINT inside the Activities platform.
 *
 * This route is where the puzzle hub (create / continue / finished shelves)
 * lands in Phase 1. Until then it is an honest, calm introduction — what the
 * activity is, with no dead controls and no fake "loading". Copy stays
 * non-clinical (LA1/LA5). Title/description come from the ONE registry.
 */
export default function PuzzlesActivityPage() {
  const activity = getActivity("puzzles");

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
          {activity?.title ?? "Memory Puzzles"}
        </h1>
        <p className="mt-1 text-charcoal-soft">
          {activity?.description ??
            "Turn a photo from your memories into a relaxing puzzle."}
        </p>
      </header>

      <section className="mt-6 rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
        <RemyStage context="welcome" size={112} className="mx-auto mb-3" />
        <p className="text-charcoal-soft">
          Remy is setting up the puzzle table.
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-charcoal-muted">
          Your first puzzle — made from a photo you love — opens here with the
          next update. No timers, no scores, just a quiet moment.
        </p>
      </section>
    </div>
  );
}
