import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { createClient } from "@/utils/supabase/server";
import { getActiveContext } from "@/lib/active-profile";
import { getAccessibleProfiles } from "@/lib/profile-access";
import { getDateCoverage } from "@/lib/remy/date-coverage";
import { getRemyLifeChapters } from "@/lib/remy/life-chapters";
import { getRemyCollections } from "@/lib/remy/collections";
import { getRemyConnections } from "@/lib/remy/connections";
import { getRemyStories } from "@/lib/remy/story-mode";
import { getRemyBiography } from "@/lib/remy/biography";
import { getRemyMemoryBook } from "@/lib/remy/memory-book";
import { getFamilyIntelligence } from "@/lib/remy/family";
import { deriveLifeJourneySignals } from "@/lib/remy/life-journey-signals";
import { deriveStorySignals } from "@/lib/remy/story-signals";
import { buildWorkspaceUnderstanding } from "@/lib/remy/workspace-understanding";
import { fuseObservations } from "@/lib/remy/observation-bridge";
import { observationsToVoiceLines } from "@/lib/remy/voice-engine";
import { remyVoice } from "@/lib/remy/persona";

import RemyHomeSummary from "@/components/remy/RemyHomeSummary";
import RemyVoicePreview from "@/components/remy/RemyVoicePreview";
import RemyStorySnapshot from "@/components/remy/RemyStorySnapshot";
import ProfileCoverageCard from "@/components/profile/identity/ProfileCoverageCard";

export const dynamic = "force-dynamic";

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

/**
 * Remy Home (/home) — the first dedicated Remy experience. Pure COMPOSITION of
 * intelligence that already exists (workspace-understanding · story/life-journey
 * signals · observation-bridge · voice-engine) into:
 *
 *   Remy understanding → Remy speaking → Family story → Progress → Next action
 *
 * No new intelligence, no new lenses/signals/observations, no AI, no new
 * pipeline. The Dashboard remains the operational workspace page; Home is
 * additive. Reuses the same loaders so it introduces no novel query types.
 */
export default async function RemyHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const activeContext = await getActiveContext();
  const memoryProfileId =
    activeContext?.type === "CARE" ? activeContext.profileId : null;
  const isMyNest = !memoryProfileId;

  const [coverage, chapters, collections, connections, accessibleProfiles] =
    await Promise.all([
      getDateCoverage(supabase, memoryProfileId),
      getRemyLifeChapters(supabase, user.id, { sort: "count", limit: 12 }),
      getRemyCollections(supabase, user.id, { limit: 12, includeDetails: true }),
      getRemyConnections(supabase, user.id, { limit: 12 }),
      getAccessibleProfiles(),
    ]);

  const familyProfiles = (accessibleProfiles ?? []).map((p) => ({
    id: p.id,
    name: str(p.preferred_name) ?? str(p.profile_name) ?? "Family member",
  }));
  const family =
    familyProfiles.length >= 2
      ? await getFamilyIntelligence(supabase, familyProfiles)
      : null;

  const subjectName = memoryProfileId
    ? familyProfiles.find((p) => p.id === memoryProfileId)?.name ?? null
    : null;

  // Pure synthesizers (no queries) — reused verbatim.
  const stories = getRemyStories({ chapters, collections, connections });
  const biography = getRemyBiography({
    stories,
    chapters,
    collections,
    connections,
    family,
    coverage,
  });
  const memoryBook = getRemyMemoryBook({ biography, stories });

  // Canonical signals (reused; no new query). Decades: family-wide when a family
  // exists, else account-wide chapters for My Nest; deferred for a single care
  // workspace (can't account-scope to one subject) — consistent with Dashboard.
  const chapterDecades = chapters
    .map((c) => ({ decade: parseInt(c.id, 10), count: c.memoryCount }))
    .filter((d) => !Number.isNaN(d.decade));
  const decades = family?.decades ?? (isMyNest ? chapterDecades : undefined);

  const lifeJourney = deriveLifeJourneySignals(decades ?? [], null);
  // Story readiness only where chapter data is reliably scoped: My Nest
  // (account-wide ≈ My Nest) or a family (family-wide). Deferred for a single
  // care workspace — account-wide chapters aren't scoped to one subject — so it
  // stays coherent with the decades deferral above (no account-wide leakage).
  const story =
    family || isMyNest
      ? deriveStorySignals({
          chapterCount: family ? family.decades.length : chapters.length,
          storyCount: stories.length,
          strongestChapterTitle: chapters[0]?.title ?? null,
          earliestYear: lifeJourney.earliestDecade,
          latestYear: lifeJourney.latestDecade,
          hasStory: stories.length > 0,
          hasBiography: Boolean(biography),
          hasMemoryBook: Boolean(memoryBook),
        })
      : undefined;

  const understanding = buildWorkspaceUnderstanding({
    workspaceLabel: family
      ? "your family"
      : isMyNest
        ? "My Nest"
        : subjectName ?? "this workspace",
    peopleCount: familyProfiles.length,
    totalMemories: family?.totalMemories ?? coverage.total,
    totalDated: family?.totalDated ?? coverage.dated,
    themes:
      family?.themes ??
      collections.map((c) => ({ label: c.title, memoryCount: c.memoryCount })),
    decades,
    story,
  });

  // Voice over the understanding-derived observation stream (the bridge) — no
  // new scoring; ranking preserved. Next action = highest-ranked line with a CTA.
  const voiceLines = observationsToVoiceLines(
    fuseObservations(understanding, remyVoice(subjectName, !isMyNest), []),
  );
  const nextAction = voiceLines.find((line) => line.cta) ?? null;

  return (
    <div className="space-y-4 p-4 md:space-y-5 md:p-6">
      <header>
        <h1 className="text-xl font-semibold text-charcoal md:text-2xl">
          Home with Remy
        </h1>
        <p className="mt-0.5 text-sm text-charcoal-muted">
          What Remy understands, and where to go next.
        </p>
      </header>

      {/* 1 — What Remy understands */}
      <RemyHomeSummary understanding={understanding} />

      {/* 2 — Remy speaking */}
      <RemyVoicePreview lines={voiceLines} />

      {/* 3 — Family story snapshot (deterministic, from signals; shown only when
          chapter data is reliably scoped — see story derivation above) */}
      {story && <RemyStorySnapshot story={story} lifeJourney={lifeJourney} />}

      {/* 4 — Memory progress (reused coverage card; dates omitted) */}
      <ProfileCoverageCard
        firstDate={null}
        latestDate={null}
        percentage={coverage.percentage}
        total={coverage.total}
        dated={coverage.dated}
      />

      {/* 5 — Suggested next action (highest-ranked observation CTA) */}
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
