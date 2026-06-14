import type { createClient } from "@/utils/supabase/server";
import { getActiveContext } from "@/lib/active-profile";
import { getAccessibleProfiles } from "@/lib/profile-access";
import { getDateCoverage, type DateCoverage } from "@/lib/remy/date-coverage";
import { getRemyLifeChapters } from "@/lib/remy/life-chapters";
import { getRemyCollections } from "@/lib/remy/collections";
import { getRemyConnections } from "@/lib/remy/connections";
import { getRemyStories } from "@/lib/remy/story-mode";
import { getRemyBiography } from "@/lib/remy/biography";
import { getRemyMemoryBook } from "@/lib/remy/memory-book";
import { getFamilyIntelligence } from "@/lib/remy/family";
import {
  deriveLifeJourneySignals,
  type LifeJourneySignals,
} from "@/lib/remy/life-journey-signals";
import { deriveStorySignals, type StorySignals } from "@/lib/remy/story-signals";
import { buildWorkspaceUnderstanding } from "@/lib/remy/workspace-understanding";
import { fuseObservations } from "@/lib/remy/observation-bridge";
import {
  observationsToVoiceLines,
  type RemyVoiceLine,
} from "@/lib/remy/voice-engine";
import { buildRemyBriefing, type RemyBriefing } from "@/lib/remy/briefing";
import { remyVoice } from "@/lib/remy/persona";
import type { RemyUnderstanding } from "@/lib/remy/understanding";

type RemySupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * The Remy home/companion model — the single, canonical COMPOSITION of existing
 * Remy intelligence (workspace understanding · story/life-journey signals ·
 * observation bridge · voice · briefing). Shared by /home and /remy so the
 * composition lives in exactly one place. Pure reuse of existing loaders — no
 * new intelligence, no new query types, no AI.
 */
export interface RemyHomeModel {
  understanding: RemyUnderstanding;
  voiceLines: RemyVoiceLine[];
  briefing: RemyBriefing;
  story?: StorySignals;
  lifeJourney: LifeJourneySignals;
  coverage: DateCoverage;
  /** Highest-ranked voice line carrying a CTA. */
  nextAction: RemyVoiceLine | null;
  subjectName: string | null;
  isMyNest: boolean;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export async function buildRemyHomeModel(
  supabase: RemySupabase,
  userId: string,
): Promise<RemyHomeModel> {
  const activeContext = await getActiveContext();
  const memoryProfileId =
    activeContext?.type === "CARE" ? activeContext.profileId : null;
  const isMyNest = !memoryProfileId;

  const [coverage, chapters, collections, connections, accessibleProfiles] =
    await Promise.all([
      getDateCoverage(supabase, memoryProfileId),
      getRemyLifeChapters(supabase, userId, { sort: "count", limit: 12 }),
      getRemyCollections(supabase, userId, { limit: 12, includeDetails: true }),
      getRemyConnections(supabase, userId, { limit: 12 }),
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

  // Decades: family-wide when a family exists, else account-wide chapters for My
  // Nest; deferred for a single care workspace (can't account-scope to one
  // subject) — consistent with the Dashboard.
  const chapterDecades = chapters
    .map((c) => ({ decade: parseInt(c.id, 10), count: c.memoryCount }))
    .filter((d) => !Number.isNaN(d.decade));
  const decades = family?.decades ?? (isMyNest ? chapterDecades : undefined);

  const lifeJourney = deriveLifeJourneySignals(decades ?? [], null);
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

  const voiceLines = observationsToVoiceLines(
    fuseObservations(understanding, remyVoice(subjectName, !isMyNest), []),
  );
  const nextAction = voiceLines.find((line) => line.cta) ?? null;
  const briefing = buildRemyBriefing({
    understanding,
    voiceLines,
    story,
    lifeJourney,
  });

  return {
    understanding,
    voiceLines,
    briefing,
    story,
    lifeJourney,
    coverage,
    nextAction,
    subjectName,
    isMyNest,
  };
}
