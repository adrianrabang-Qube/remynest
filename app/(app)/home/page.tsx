import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, MessageCircle } from "lucide-react";

import { createClient } from "@/utils/supabase/server";
import { buildRemyHomeModel } from "@/lib/remy/home-model";

import RemyBriefing from "@/components/remy/RemyBriefing";
import RemyHomeSummary from "@/components/remy/RemyHomeSummary";
import RemyVoicePreview from "@/components/remy/RemyVoicePreview";
import RemyStorySnapshot from "@/components/remy/RemyStorySnapshot";
import ProfileCoverageCard from "@/components/profile/identity/ProfileCoverageCard";

export const dynamic = "force-dynamic";

/**
 * Remy Home (/home) — the primary Remy experience. A pure COMPOSITION of existing
 * intelligence, now sourced from the shared buildRemyHomeModel (used by /remy
 * too). No new intelligence/lenses/signals/observations/AI/queries. The Dashboard
 * remains the operational workspace page; Home is additive.
 */
export default async function RemyHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Onboarding gate — Home is the post-login default, so it preserves onboarding
  // exactly as the Dashboard does.
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.onboarding_completed) redirect("/onboarding");

  const { understanding, voiceLines, briefing, story, lifeJourney, coverage, nextAction } =
    await buildRemyHomeModel(supabase, user.id);

  return (
    <div className="space-y-4 p-4 md:space-y-5 md:p-6">
      <header>
        <h1 className="text-xl font-semibold text-charcoal md:text-2xl">Home</h1>
        <p className="mt-0.5 text-sm text-charcoal-muted">
          Your memory companion — what Remy understands, and what to do next.
        </p>
      </header>

      {/* Entry point into the dedicated companion experience */}
      <Link
        href="/remy"
        className="flex items-center justify-between gap-3 rounded-2xl border border-sage/30 bg-sage/[0.06] px-4 py-3 text-sm font-semibold text-sage-deep transition hover:bg-sage/10"
      >
        <span className="inline-flex items-center gap-2">
          <MessageCircle className="h-4 w-4" aria-hidden />
          Open conversation with Remy
        </span>
        <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
      </Link>

      {/* 1 — Remy briefing (daily composition of the outputs below) */}
      <RemyBriefing briefing={briefing} />

      {/* 2 — What Remy understands */}
      <RemyHomeSummary understanding={understanding} />

      {/* 3 — Remy speaking */}
      <RemyVoicePreview lines={voiceLines} />

      {/* 4 — Family story snapshot (deterministic, from signals; shown only when
          chapter data is reliably scoped) */}
      {story && <RemyStorySnapshot story={story} lifeJourney={lifeJourney} />}

      {/* 5 — Memory progress (reused coverage card; dates omitted) */}
      <ProfileCoverageCard
        firstDate={null}
        latestDate={null}
        percentage={coverage.percentage}
        total={coverage.total}
        dated={coverage.dated}
      />

      {/* 6 — Suggested next action (highest-ranked observation CTA) */}
      {nextAction?.cta && (
        <section
          aria-label="Suggested next step"
          className="rounded-3xl border border-sage/25 bg-gradient-to-br from-sage/[0.07] to-sand/40 p-4 shadow-soft md:p-6"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-charcoal-muted">
            Suggested next step
          </p>
          <p className="mt-1 text-sm text-charcoal">{nextAction.text}</p>
          <Link
            href={nextAction.cta.href}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-sage px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-sage-deep"
          >
            {nextAction.cta.label}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>
      )}
    </div>
  );
}
