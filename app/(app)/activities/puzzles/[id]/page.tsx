import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import {
  userCanAccessProfile,
} from "@/lib/profile-ownership";
import { getPuzzleWithProgress } from "@/lib/puzzles/queries";
import PuzzlePlayer from "@/components/puzzles/play/PuzzlePlayer";

export const metadata: Metadata = { title: "Memory Puzzle" };
export const dynamic = "force-dynamic";

/**
 * Play screen shell (RSC): authoritative fetch + authorization against the
 * puzzle's OWN context (owner for My Nest; accepted caregiver access for a
 * care workspace) + a fresh signed play-session image. The client engine
 * mounts inside (Phase 1C).
 */
export default async function PuzzlePlayPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const data = await getPuzzleWithProgress(params.id);
  const authorized =
    !!data &&
    (data.puzzle.memory_profile_id == null
      ? data.puzzle.user_id === user.id
      : await userCanAccessProfile(user.id, data.puzzle.memory_profile_id));

  if (!data || !authorized || !data.imageUrl) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <Link
          href="/activities/puzzles"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-medium text-charcoal-soft transition hover:text-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Memory Puzzles
        </Link>
        <div className="mt-6 rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
          <p className="text-charcoal-soft">This puzzle isn&apos;t available.</p>
          <p className="mt-1 text-sm text-charcoal-muted">
            It may have been removed, or it belongs to a different workspace.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link
        href="/activities/puzzles"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-medium text-charcoal-soft transition hover:text-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Memory Puzzles
      </Link>

      <header className="mt-4">
        <h1 className="font-serif text-2xl font-semibold text-charcoal md:text-3xl">
          {data.puzzle.title || "Memory puzzle"}
        </h1>
      </header>

      <PuzzlePlayer
        puzzle={data.puzzle}
        initialPlacements={data.placements}
        imageUrl={data.imageUrl}
      />
    </div>
  );
}
