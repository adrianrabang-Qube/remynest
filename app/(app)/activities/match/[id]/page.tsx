import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { userCanAccessProfile } from "@/lib/profile-ownership";
import { getMatchGame } from "@/lib/memory-match/queries";
import { matchSizeConfig } from "@/lib/memory-match/types";
import MatchBoard from "@/components/memory-match/MatchBoard";

export const metadata: Metadata = { title: "Memory Match" };
export const dynamic = "force-dynamic";

/**
 * Play screen shell: authoritative fetch + READ authorization against the
 * game's OWN context; signed card photos. The board is KEYED by id + shuffle
 * seed so "Play again" (new seed via action + refresh) remounts with a fresh
 * board — the puzzle-audit lesson, applied from day one.
 */
export default async function MatchPlayPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const data = await getMatchGame(params.id);
  const authorized =
    !!data &&
    (data.game.memory_profile_id == null
      ? data.game.user_id === user.id
      : await userCanAccessProfile(user.id, data.game.memory_profile_id));

  if (!data || !authorized) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <Link
          href="/activities/match"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-medium text-charcoal-soft transition hover:text-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Memory Match
        </Link>
        <div className="mt-6 rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
          <p className="text-charcoal-soft">This game isn&apos;t available.</p>
          <p className="mt-1 text-sm text-charcoal-muted">
            It may have been removed, or it belongs to a different workspace.
          </p>
        </div>
      </div>
    );
  }

  const size = matchSizeConfig(data.game.pairs);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link
        href="/activities/match"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-medium text-charcoal-soft transition hover:text-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Memory Match
      </Link>

      <header className="mt-4">
        <h1 className="font-serif text-2xl font-semibold text-charcoal md:text-3xl">
          {size?.label ?? "Match"} game
        </h1>
        <p className="mt-1 text-sm text-charcoal-muted">
          Tap a card, then find its twin. Take all the time you like.
        </p>
      </header>

      <MatchBoard
        key={`${data.game.id}:${data.game.shuffle_seed}`}
        game={data.game}
        initialMatched={data.matched}
        cardPhotos={data.cardPhotos}
      />
    </div>
  );
}
