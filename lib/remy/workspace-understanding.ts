import { cap, coverageLevel } from "./lenses/shared";
import { deriveLifeJourneySignals } from "./life-journey-signals";
import type { StorySignals } from "./story-signals";
import type { DecadeBucket, UnderstandingFacet } from "./lenses/types";
import type { RemyUnderstanding } from "./understanding";

/**
 * Workspace / family understanding — Remy understanding the whole, not a single
 * person. Deterministic, no AI. It produces the same RemyUnderstanding shape as
 * the person engine (so RemyLensSummary and the observation bridge work
 * unchanged), with workspace-scoped facets owned by lenses:
 *
 *   • relationships → the family network size
 *   • themes        → the most documented theme across the workspace
 *   • preservation  → total preserved + coverage level
 *
 * Inputs are intelligence the Dashboard already loads (getFamilyIntelligence /
 * collections / coverage / accessible profiles) — no duplicate queries.
 */
export interface WorkspaceUnderstandingInput {
  /** Human label for the whole, e.g. "your family" or "My Nest". */
  workspaceLabel: string;
  peopleCount: number;
  totalMemories: number;
  totalDated: number;
  /** Top documented themes across the workspace, most-documented first. */
  themes: { label: string; memoryCount: number }[];
  /** Family-wide dated-memory counts per decade (the time shape); optional. */
  decades?: DecadeBucket[];
  /** Narrative readiness across the workspace (from deriveStorySignals); optional. */
  story?: StorySignals;
  /** Injectable for deterministic output. */
  now?: Date;
}

export function buildWorkspaceUnderstanding(
  input: WorkspaceUnderstandingInput,
): RemyUnderstanding {
  const { workspaceLabel, peopleCount, totalMemories, totalDated, themes } =
    input;
  const percentage =
    totalMemories > 0 ? Math.round((totalDated / totalMemories) * 100) : 0;
  const level = coverageLevel(totalMemories, percentage);
  const isNascent = totalMemories < 3;
  const subject = { id: "workspace", name: workspaceLabel };

  if (totalMemories === 0) {
    return {
      subject,
      level,
      isNascent: true,
      summary: `Remy is just getting to know ${workspaceLabel}.`,
      facets: [],
    };
  }

  const facets: UnderstandingFacet[] = [];

  // Relationships — the family network.
  if (peopleCount >= 2) {
    facets.push({
      lensId: "relationships",
      kind: "relationship",
      priority: 65,
      tone: "reassuring",
      role: "connector",
      label: `${peopleCount} people in ${workspaceLabel}`,
      lens: { label: "People", href: "/profiles" },
    });
  }

  // Themes — what's most documented across the whole.
  if (!isNascent && themes.length > 0) {
    const top = themes[0];
    facets.push({
      lensId: "themes",
      kind: "life-areas",
      priority: 70,
      tone: "informative",
      role: "curator",
      label: `${top.label} is the most documented theme`,
      detail: themes[1]
        ? `${themes[1].label} also appears often`
        : `${top.memoryCount} ${top.memoryCount === 1 ? "memory" : "memories"}`,
      lens: { label: "Themes", href: "/collections" },
    });
  }

  // Life Journey — the time shape of the workspace (from family decade buckets).
  const journey = deriveLifeJourneySignals(
    input.decades ?? [],
    null,
    input.now ?? new Date(),
  );
  if (journey.hasTimeline) {
    if (
      journey.earliestDecade != null &&
      journey.latestDecade != null &&
      journey.documentedDecadeCount >= 2
    ) {
      facets.push({
        lensId: "life-journey",
        kind: "chapter-span",
        priority: 60,
        tone: "informative",
        role: "storyteller",
        label: `Most preserved memories span the ${journey.earliestDecade}s–${journey.latestDecade}s`,
        detail: `${journey.documentedDecadeCount} decades documented`,
        lens: { label: "Life Journey", href: "/timeline" },
      });
    }
    if (journey.strongestDecade && journey.strongestDecade.count >= 2) {
      facets.push({
        lensId: "life-journey",
        kind: "strongest-period",
        priority: 58,
        tone: "celebratory",
        role: "storyteller",
        label: `The ${journey.strongestDecade.decade}s are the best documented decade`,
        detail: `${journey.strongestDecade.count} memories`,
        lens: { label: "Life Journey", href: "/timeline" },
      });
    }
    if (
      totalDated >= 2 &&
      journey.documentedDecadeCount >= 2 &&
      journey.missingDecade != null
    ) {
      facets.push({
        lensId: "life-journey",
        kind: "missing-knowledge",
        priority: 45,
        tone: "gentle",
        role: "guide",
        label: `The ${journey.missingDecade}s remain lightly documented`,
        detail: "A few memories from then would help",
        lens: { label: "Add a memory", href: "/memories/new" },
      });
    }
  }

  // Story — narrative readiness across the workspace.
  if (input.story) {
    const s = input.story;
    if (s.narrativeCoverage === "developed") {
      facets.push({
        lensId: "story",
        kind: "story-ready",
        priority: 55,
        tone: "celebratory",
        role: "storyteller",
        label: `Stories span ${s.chapterCount} life ${
          s.chapterCount === 1 ? "chapter" : "chapters"
        }`,
        detail: s.hasMemoryBook
          ? "A memory book can be assembled"
          : "A biography can be generated",
        lens: { label: "Story", href: "/library/story" },
      });
    } else if (s.narrativeCoverage === "growing") {
      const who = workspaceLabel === "your family" ? "family " : "";
      facets.push({
        lensId: "story",
        kind: "narrative-growth",
        priority: 44,
        tone: "encouraging",
        role: "storyteller",
        label: `The ${who}story is still growing`,
        detail: `${s.chapterCount} ${
          s.chapterCount === 1 ? "chapter" : "chapters"
        } so far`,
        lens: { label: "Story", href: "/library/story" },
      });
    }
  }

  // Preservation — total preserved + coverage level.
  facets.push({
    lensId: "preservation",
    kind: "coverage",
    priority: 50,
    tone: "informative",
    role: "guide",
    label: `${totalMemories} ${
      totalMemories === 1 ? "memory" : "memories"
    } preserved`,
    detail: `Coverage: ${cap(level)} · ${totalDated} dated`,
    lens: { label: "Memories", href: "/memories" },
  });

  const ranked = facets.sort((a, b) => b.priority - a.priority).slice(0, 6);
  const summary = isNascent
    ? `Remy is just getting to know ${workspaceLabel}.`
    : ranked
        .slice(0, 2)
        .map((f) => f.label)
        .join(" · ");

  return { subject, level, isNascent, summary, facets: ranked };
}
