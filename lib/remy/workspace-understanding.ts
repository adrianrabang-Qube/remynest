import { cap, coverageLevel } from "./lenses/shared";
import type { UnderstandingFacet } from "./lenses/types";
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
  /** Injectable for deterministic output (reserved for future recency facet). */
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
    lens: { label: "Story", href: "/library/story" },
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
