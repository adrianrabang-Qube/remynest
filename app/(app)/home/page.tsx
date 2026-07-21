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
import MyNestExplainer from "@/components/profile/MyNestExplainer";
import { RemyStage } from "@/lib/remy";
import { getAccessibleProfiles } from "@/lib/profile-access";
import OrientationLine from "@/components/OrientationLine";

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

  // First-run explainer condition: in My Nest (this page IS the My Nest home) with no
  // care profiles yet. Component self-manages dismissal.
  const careProfiles = await getAccessibleProfiles();

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:space-y-5 md:p-6">
      <header>
        {/* LA1: reality-orientation anchor — a persistent day/date cue. */}
        <OrientationLine />
        <h1 className="mt-1 font-serif text-2xl font-semibold text-charcoal md:text-3xl">
          Home
        </h1>
        <p className="mt-1 text-sm text-charcoal-muted">
          Your memory companion — what Remy understands, and what to do next.
        </p>
      </header>

      {/* First-run welcome: a clear next step when there are no memories yet. */}
      {coverage.total === 0 && (
        <section className="flex flex-col items-start gap-4 rounded-3xl border border-sage/25 bg-gradient-to-br from-sage/[0.07] to-sand/40 p-5 shadow-soft sm:flex-row sm:items-center">
          <RemyStage context="welcome" size={112} className="shrink-0" priority />
          <div>
            <h2 className="text-lg font-semibold text-charcoal">
              Welcome to RemyNest
            </h2>
            <p className="mt-1 text-sm text-charcoal-soft">
              Start by adding your first memory — a photo, a note, or a moment you
              want to keep.
            </p>
            <Link
              href="/memories/new"
              className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-sage px-5 py-2.5 text-[15px] font-semibold text-white shadow-soft transition hover:bg-sage-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-sand"
            >
              Add your first memory
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      )}

      {/* First-run education: what My Nest is vs a care profile (dismissible). */}
      {careProfiles.length === 0 && <MyNestExplainer />}

      {/* Entry point into the dedicated companion experience — a COMPANION surface, so it
          carries the remy.* palette (purple stays scoped to Remy surfaces; page chrome is sage). */}
      <Link
        href="/remy"
        className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-remy-lavender/30 bg-remy-lavender/[0.08] px-4 py-3.5 text-[15px] font-semibold text-remy-violet transition hover:bg-remy-lavender/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
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
            className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-sage px-5 py-2.5 text-[15px] font-semibold text-white shadow-soft transition hover:bg-sage-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-sand"
          >
            {nextAction.cta.label}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>
      )}
    </div>
  );
}
