import type { RemyTone } from "./types";

/**
 * Remy's Understanding Engine — the canonical, deterministic layer that turns
 * existing Remy intelligence (themes, coverage, decades, recency, relationships)
 * into a structured point of view about a subject (a person today; a family or
 * relationship later). It is the operating layer many surfaces render: Profile
 * Detail now, Search ("Ask Remy"), the Remy home, People rows, Story, etc.
 *
 * This file is renderer-agnostic and has NO AI / model calls. New lenses (Phase
 * 2/3) attach by adding a UnderstandingFacetKind + a deterministic rule here —
 * renderers iterate facets generically and need no change.
 */

/** What role Remy is playing in a given facet — the "what is Remy doing here?" answer. */
export type RemyRole =
  | "companion"
  | "guide"
  | "curator"
  | "storyteller"
  | "organizer"
  | "memory-keeper"
  | "connector";

/** Facet categories. Additive — Phase 2/3 lenses extend this union. */
export type UnderstandingFacetKind =
  | "life-areas"
  | "strongest-period"
  | "coverage"
  | "recency"
  | "missing-knowledge"
  | "relationship";

export type CoverageLevel = "new" | "sparse" | "moderate" | "rich";

export interface UnderstandingLens {
  /** Human label for the bridge, e.g. "Themes", "Life Journey". */
  label: string;
  href: string;
}

/** One thing Remy understands — a single renderer-agnostic unit. */
export interface UnderstandingFacet {
  kind: UnderstandingFacetKind;
  /** Higher leads first. */
  priority: number;
  tone: RemyTone;
  role: RemyRole;
  /** Short human phrase ("Family-oriented · Loves travel"). */
  label: string;
  /** Optional secondary evidence ("42 memories in Family"). */
  detail?: string;
  /** Optional bridge into the supporting evidence surface (the lens). */
  lens?: UnderstandingLens;
}

export interface RemyUnderstanding {
  subject: { id: string; name: string };
  level: CoverageLevel;
  /** Too little evidence to characterize the subject yet. */
  isNascent: boolean;
  /** Condensed one-liner for compact renderers (rows, search hits). */
  summary: string;
  /** Ranked, gated facets (empty when there's nothing to say yet). */
  facets: UnderstandingFacet[];
}

export interface DecadeBucket {
  decade: number;
  count: number;
}

export interface UnderstandingInput {
  subject: { id: string; name: string };
  memoryCount: number;
  datedCount: number;
  /** Top themes (from getFamilyIntelligence), most-documented first. */
  themes: { label: string; memoryCount: number }[];
  coveragePercentage: number;
  /** Per-decade dated-memory counts (from bucketDecades). */
  decades: DecadeBucket[];
  birthYear: number | null;
  relationshipLabel: string | null;
  /** Themes the wider family shares (≥2 profiles); optional. */
  sharedFamilyThemes?: { label: string }[];
  lastActivityAt: string | null;
  /** Injectable for deterministic output (tests). */
  now?: Date;
}

/** Theme slug → a warm, documentation-grounded trait phrase. Safe fallback below. */
const TRAIT_LEXICON: Record<string, string> = {
  family: "Family-oriented",
  travel: "Loves travel",
  career: "Career-focused",
  work: "Career-focused",
  health: "Stays active",
  fitness: "Stays active",
  food: "Loves cooking",
  cooking: "Loves cooking",
  music: "Loves music",
  nature: "Loves the outdoors",
  outdoors: "Loves the outdoors",
  friends: "Socially connected",
  faith: "Faith-centered",
  religion: "Faith-centered",
  education: "Lifelong learner",
  learning: "Lifelong learner",
  home: "Home-centered",
  holidays: "Celebrates the moments",
  celebration: "Celebrates the moments",
  pets: "Animal lover",
  animals: "Animal lover",
  art: "Creative spirit",
  creativity: "Creative spirit",
  sports: "Loves sports",
  garden: "Loves gardening",
  gardening: "Loves gardening",
};

/** Bucket raw memory dates into per-decade counts (ascending by decade). */
export function bucketDecades(
  dates: (string | null | undefined)[],
): DecadeBucket[] {
  const counts = new Map<number, number>();
  for (const value of dates) {
    if (!value) continue;
    const year = new Date(value).getFullYear();
    if (Number.isNaN(year)) continue;
    const decade = Math.floor(year / 10) * 10;
    counts.set(decade, (counts.get(decade) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([decade, count]) => ({ decade, count }))
    .sort((a, b) => a.decade - b.decade);
}

function coverageLevel(memoryCount: number, percentage: number): CoverageLevel {
  if (memoryCount < 3) return "new";
  if (memoryCount < 25) return "sparse";
  if (memoryCount <= 60) return "moderate";
  return percentage >= 50 ? "rich" : "moderate";
}

function cap(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function monthsSince(iso: string, now: Date): number {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return 0;
  const ms = now.getTime() - then.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24 * 30)));
}

/** Earliest decade with zero memories within the subject's plausible lifespan. */
function findGapDecade(
  decades: DecadeBucket[],
  birthYear: number | null,
  now: Date,
): number | null {
  if (decades.length === 0) return null;
  const present = new Set(decades.map((d) => d.decade));
  const start =
    birthYear != null ? Math.floor(birthYear / 10) * 10 : decades[0].decade;
  const end = Math.floor(now.getFullYear() / 10) * 10;
  for (let decade = start; decade <= end; decade += 10) {
    if (!present.has(decade)) return decade;
  }
  return null;
}

/**
 * Build Remy's understanding of one person from existing deterministic signals.
 * Every facet is gated by minimum evidence so Remy never overclaims.
 */
export function buildPersonUnderstanding(
  input: UnderstandingInput,
): RemyUnderstanding {
  const now = input.now ?? new Date();
  const { subject, memoryCount, datedCount, themes, decades } = input;
  const level = coverageLevel(memoryCount, input.coveragePercentage);
  const isNascent = memoryCount < 3;

  if (memoryCount === 0) {
    return {
      subject,
      level,
      isNascent: true,
      summary: `Just getting to know ${subject.name}.`,
      facets: [],
    };
  }

  const facets: UnderstandingFacet[] = [];

  // Life areas — what Remy has discovered matters (curator).
  if (!isNascent && themes.length > 0) {
    const top = themes.slice(0, 2);
    const traits = top
      .map((t) => TRAIT_LEXICON[t.label.toLowerCase()])
      .filter((t): t is string => Boolean(t));
    const label = traits.length
      ? traits.join(" · ")
      : `Most documented around ${top.map((t) => t.label).join(" & ")}`;
    facets.push({
      kind: "life-areas",
      priority: 70,
      tone: "informative",
      role: "curator",
      label,
      detail: `${themes[0].memoryCount} ${
        themes[0].memoryCount === 1 ? "memory" : "memories"
      } in ${themes[0].label}`,
      lens: { label: "Themes", href: "/collections" },
    });
  }

  // Strongest life period — the best-documented decade (storyteller).
  if (decades.length > 0) {
    const top = [...decades].sort((a, b) => b.count - a.count)[0];
    if (top && top.count >= 2) {
      facets.push({
        kind: "strongest-period",
        priority: 60,
        tone: "celebratory",
        role: "storyteller",
        label: `Richest memories from the ${top.decade}s`,
        detail: `${top.count} ${top.count === 1 ? "memory" : "memories"}`,
        lens: { label: "Life Journey", href: "/timeline" },
      });
    }
  }

  // Missing knowledge — what Remy is missing (guide). Invitational, never judgmental.
  if (datedCount >= 2) {
    const gap = findGapDecade(decades, input.birthYear, now);
    if (gap != null) {
      const birthDecade =
        input.birthYear != null ? Math.floor(input.birthYear / 10) * 10 : null;
      const isEarlyYears = birthDecade != null && gap <= birthDecade + 10;
      facets.push({
        kind: "missing-knowledge",
        priority: 55,
        tone: "gentle",
        role: "guide",
        label: isEarlyYears
          ? `Remy knows little about ${subject.name}'s early years`
          : `Little preserved from the ${gap}s`,
        detail: "Add a memory to fill this in",
        lens: { label: "Add a memory", href: "/memories/new" },
      });
    }
  } else if (memoryCount >= 3 && datedCount < Math.ceil(memoryCount / 2)) {
    facets.push({
      kind: "missing-knowledge",
      priority: 55,
      tone: "gentle",
      role: "guide",
      label: `Most of ${subject.name}'s memories aren't placed in time yet`,
      detail: "Add dates so Remy can build the timeline",
      lens: { label: "Add dates", href: "/memory-dates" },
    });
  }

  // Relationship — how Remy sees this life connected (connector).
  const sharedTheme = input.sharedFamilyThemes?.[0]?.label;
  if (input.relationshipLabel || sharedTheme) {
    const base = input.relationshipLabel
      ? `Your ${input.relationshipLabel.toLowerCase()}`
      : "Part of your family";
    facets.push({
      kind: "relationship",
      priority: 50,
      tone: "reassuring",
      role: "connector",
      label: sharedTheme ? `${base} · shares ${sharedTheme} with the family` : base,
      lens: { label: "Relationships", href: "/connections" },
    });
  }

  // Coverage — how complete Remy's understanding is (guide).
  facets.push({
    kind: "coverage",
    priority: 40,
    tone: "informative",
    role: "guide",
    label: `Life story coverage: ${cap(level)}`,
    detail: `${datedCount} of ${memoryCount} memories dated`,
    lens: { label: "Story", href: "/library/story" },
  });

  // Recency — how actively the story is growing (memory-keeper).
  if (input.lastActivityAt) {
    const months = monthsSince(input.lastActivityAt, now);
    facets.push({
      kind: "recency",
      priority: 30,
      tone: months <= 1 ? "encouraging" : "informative",
      role: "memory-keeper",
      label:
        months < 1
          ? "Added to this month"
          : `Last added ${months} ${months === 1 ? "month" : "months"} ago`,
      lens: { label: "Memories", href: "/memories" },
    });
  }

  facets.sort((a, b) => b.priority - a.priority);
  const ranked = facets.slice(0, 6);
  const summary = isNascent
    ? `Just getting to know ${subject.name}.`
    : ranked
        .slice(0, 2)
        .map((f) => f.label)
        .join(" · ");

  return { subject, level, isNascent, summary, facets: ranked };
}
