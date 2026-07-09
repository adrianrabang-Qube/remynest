/**
 * Remy Platform (v2) — JOURNEY ENGINE (pure).
 *
 * Remy already understands individual memories, their significance, relationships, personality, and
 * how memories connect (the graph). This engine understands COMPLETE LIFE JOURNEYS — a Journey is a
 * structured collection of connected memories representing ONE continuous part of a life (School
 * Years, University, Career, Family Holidays, Medical Journey, Care Journey, …).
 *
 * Journeys must EMERGE from real signals — dominant theme, life stage, shared people, chronological
 * continuity, and graph connectivity — never be invented. Unrelated memories are never merged,
 * missing years are never fabricated, transitions are never guessed; a group that cannot be
 * confidently formed (too few memories, or separated by a large real gap) is left separate.
 *
 * REQUIRED inputs are the understanding + graph layers (the only outputs computed by this point in
 * the pipeline); the later-stage engine outputs (chapters / significant / emotional / favourites) are
 * OPTIONAL refinements used only when a caller supplies them — the required inputs already carry every
 * signal the engine needs. PURE: no React/DOM/Supabase/fetch/timers/clock/randomness/persistence/GPT.
 */
import type {
  EmotionalProfile,
  FavouritePerson,
  Journey,
  JourneyAnalysis,
  JourneyConnection,
  JourneyImportance,
  JourneyStage,
  JourneySummary,
  JourneyTimeline,
  LifeChapter,
  LifeStage,
  MemoryGraph,
  MemoryTheme,
  MemoryUnderstanding,
  SignificantMemory,
} from "./family-types";

export interface JourneyInput {
  understandings: MemoryUnderstanding[];
  graph: MemoryGraph;
  // --- Optional refinements (computed later in the pipeline; the engine works without them) ---
  chapters?: LifeChapter[];
  significantMemories?: SignificantMemory[];
  emotionalProfile?: EmotionalProfile | null;
  favourites?: FavouritePerson[];
}

/** A journey needs at least this many connected memories to be confidently formed. */
const MIN_JOURNEY_SIZE = 3;
/** A year gap larger than this splits one theme into distinct journeys (a real break in continuity). */
const MAX_GAP_YEARS = 8;
/** When chapters are supplied, a chapter change plus this smaller gap is also a split boundary. */
const CHAPTER_SPLIT_GAP = 3;

const IMPORTANCE_WEIGHT: Record<MemoryUnderstanding["importance"], number> = {
  ordinary: 1,
  important: 3,
  major: 6,
  legacy: 10,
};

/** Base journey title per theme; refined by life stage where a real distinction exists. */
const JOURNEY_TITLE: Record<MemoryTheme, string> = {
  family: "Family Life",
  travel: "Travel",
  celebration: "Celebrations",
  achievement: "Achievements",
  health: "Medical Journey",
  pets: "Pet Memories",
  home: "Home Life",
  work: "Career",
  education: "School Years",
  friendship: "Friendships",
  care: "Care Journey",
  relationships: "Relationships",
  other: "Life Memories",
};

const clamp100 = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

function peopleOf(u: MemoryUnderstanding): string[] {
  const r = u.relationship;
  return r.primaryPerson ? [r.primaryPerson, ...r.secondaryPeople] : [...r.secondaryPeople];
}

function titleFor(theme: MemoryTheme, lifeStage: LifeStage): string {
  if (theme === "education" && lifeStage === "early-adult") return "University";
  if (theme === "travel" && lifeStage === "family-life") return "Family Holidays";
  return JOURNEY_TITLE[theme];
}

function dominantLifeStage(group: MemoryUnderstanding[]): LifeStage {
  const counts = new Map<LifeStage, number>();
  for (const u of group) {
    if (u.lifeStage === "unknown") continue;
    counts.set(u.lifeStage, (counts.get(u.lifeStage) ?? 0) + 1);
  }
  let best: LifeStage = "unknown";
  let bestN = 0;
  // Sort keys for a deterministic winner on ties.
  for (const [ls, n] of [...counts.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (n > bestN) {
      best = ls;
      bestN = n;
    }
  }
  return best;
}

function dominantPeople(group: MemoryUnderstanding[], favourites?: FavouritePerson[]): string[] {
  const counts = new Map<string, number>();
  for (const u of group) {
    for (const p of peopleOf(u)) counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  const favRank = new Map<string, number>();
  if (favourites) favourites.forEach((f, i) => favRank.set(f.id, i));
  return [...counts.entries()]
    .sort(
      (a, b) =>
        b[1] - a[1] ||
        (favRank.get(a[0]) ?? Number.MAX_SAFE_INTEGER) - (favRank.get(b[0]) ?? Number.MAX_SAFE_INTEGER) ||
        (a[0] < b[0] ? -1 : 1),
    )
    .slice(0, 3)
    .map(([id]) => id);
}

function buildTimeline(group: MemoryUnderstanding[]): JourneyTimeline {
  const byYear = new Map<number, string[]>();
  for (const u of group) {
    const y = u.timeSpan.year;
    const list = byYear.get(y);
    if (list) list.push(u.id);
    else byYear.set(y, [u.id]);
  }
  const stages: JourneyStage[] = [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, memoryIds]) => ({ year, memoryIds }));
  const years = group.map((u) => u.timeSpan.year).filter((y) => y > 0);
  return {
    startYear: years.length ? Math.min(...years) : 0,
    endYear: years.length ? Math.max(...years) : 0,
    stages,
  };
}

function continuityOf(group: MemoryUnderstanding[]): number {
  const years = group
    .map((u) => u.timeSpan.year)
    .filter((y) => y > 0)
    .sort((a, b) => a - b);
  if (years.length <= 1) return 100;
  const span = years[years.length - 1] - years[0];
  if (span === 0) return 100;
  let gaps = 0;
  let largest = 0;
  for (let i = 1; i < years.length; i++) {
    const d = years[i] - years[i - 1];
    if (d > 2) {
      gaps += 1;
      largest = Math.max(largest, d);
    }
  }
  return clamp100(100 - gaps * 12 - largest * 2);
}

function significanceOf(
  group: MemoryUnderstanding[],
  memoryIdSet: Set<string>,
  graph: MemoryGraph,
  significantSet: Set<string> | undefined,
  emotionalProfile: EmotionalProfile | null | undefined,
): number {
  let importanceSum = 0;
  for (const u of group) importanceSum += IMPORTANCE_WEIGHT[u.importance];

  let intraEdges = 0;
  for (const e of graph.edges) {
    if (memoryIdSet.has(e.source) && memoryIdSet.has(e.target)) intraEdges += 1;
  }

  let significantBoost = 0;
  if (significantSet) {
    for (const u of group) if (significantSet.has(u.id)) significantBoost += 4;
  }

  // Optional gentle scaling by overall relationship health (0.9–1.0); neutral (1.0) when absent.
  const healthScale = emotionalProfile ? 0.9 + emotionalProfile.relationshipHealth / 1000 : 1;

  const base =
    group.length * 4 + importanceSum + Math.min(20, intraEdges) + Math.min(20, significantBoost);
  return clamp100(base * healthScale);
}

function journeyImportanceOf(significance: number): JourneyImportance {
  if (significance >= 75) return "defining";
  if (significance >= 55) return "major";
  if (significance >= 35) return "notable";
  return "minor";
}

/**
 * Split a theme's memories (already sorted by year) into continuous segments. A break is a real year
 * gap larger than MAX_GAP_YEARS, or — when chapters are supplied — a chapter change alongside a
 * smaller gap. Undated memories (year 0) never force a split; they attach to the current segment.
 */
function segmentByContinuity(
  sorted: MemoryUnderstanding[],
  chapterOf: Map<string, string>,
): MemoryUnderstanding[][] {
  const segments: MemoryUnderstanding[][] = [];
  let current: MemoryUnderstanding[] = [];
  let prevYear: number | null = null;
  let prevChapter: string | null = null;

  for (const u of sorted) {
    const y = u.timeSpan.year;
    const chapter = chapterOf.get(u.id) ?? null;
    if (prevYear != null && y > 0 && prevYear > 0) {
      const gap = y - prevYear;
      const chapterChanged = prevChapter != null && chapter != null && chapter !== prevChapter;
      if (gap > MAX_GAP_YEARS || (chapterChanged && gap > CHAPTER_SPLIT_GAP)) {
        segments.push(current);
        current = [];
      }
    }
    current.push(u);
    if (y > 0) prevYear = y;
    if (chapter != null) prevChapter = chapter;
  }
  if (current.length) segments.push(current);
  return segments;
}

/**
 * Build complete life journeys from the understanding + graph layers. Deterministic, real-data-only.
 * Returns the journeys, the real links between them, and a structured summary.
 */
export function buildJourneys(input: JourneyInput): JourneyAnalysis {
  const { understandings, graph } = input;
  const significantSet = input.significantMemories
    ? new Set(input.significantMemories.map((s) => s.id))
    : undefined;
  const chapterOf = new Map<string, string>();
  if (input.chapters) {
    for (const c of input.chapters) {
      for (const id of c.memoryIds) chapterOf.set(id, c.id);
    }
  }

  // Group by dominant (first) theme; "other"/themeless memories never anchor a journey.
  const byTheme = new Map<MemoryTheme, MemoryUnderstanding[]>();
  for (const u of understandings) {
    const theme = u.themes[0];
    if (!theme || theme === "other") continue;
    const list = byTheme.get(theme);
    if (list) list.push(u);
    else byTheme.set(theme, [u]);
  }

  const journeys: Journey[] = [];
  const themes = [...byTheme.keys()].sort();
  for (const theme of themes) {
    const group = byTheme.get(theme)!;
    const sorted = [...group].sort(
      (a, b) => a.timeSpan.year - b.timeSpan.year || (a.id < b.id ? -1 : 1),
    );
    const segments = segmentByContinuity(sorted, chapterOf);

    segments.forEach((segment, idx) => {
      if (segment.length < MIN_JOURNEY_SIZE) return; // cannot be confidently formed — leave separate
      const memoryIds = segment.map((u) => u.id);
      const memoryIdSet = new Set(memoryIds);
      const timeline = buildTimeline(segment);
      const lifeStage = dominantLifeStage(segment);
      const significance = significanceOf(
        segment,
        memoryIdSet,
        graph,
        significantSet,
        input.emotionalProfile,
      );
      journeys.push({
        id: `journey-${theme}-${timeline.startYear}-${idx}`,
        title: titleFor(theme, lifeStage),
        memoryIds,
        dominantTheme: theme,
        dominantPeople: dominantPeople(segment, input.favourites),
        lifeStage,
        startYear: timeline.startYear,
        endYear: timeline.endYear,
        significance,
        continuity: continuityOf(segment),
        importance: journeyImportanceOf(significance),
        timeline,
      });
    });
  }

  // Real links between journeys: shared dominant people and/or the same dominant theme.
  const connections: JourneyConnection[] = [];
  for (let i = 0; i < journeys.length; i++) {
    const a = journeys[i];
    const aPeople = new Set(a.dominantPeople);
    for (let j = i + 1; j < journeys.length; j++) {
      const b = journeys[j];
      const sharedPeople = b.dominantPeople.filter((p) => aPeople.has(p));
      const sharedTheme = a.dominantTheme === b.dominantTheme;
      if (sharedPeople.length === 0 && !sharedTheme) continue;
      connections.push({
        source: a.id,
        target: b.id,
        sharedPeople,
        sharedTheme,
        strength: sharedPeople.length * 3 + (sharedTheme ? 2 : 0),
      });
    }
  }

  const dominant = journeys.reduce<Journey | null>(
    (best, j) => (best == null || j.significance > best.significance ? j : best),
    null,
  );
  const summary: JourneySummary = {
    journeyCount: journeys.length,
    totalJourneyMemories: journeys.reduce((s, j) => s + j.memoryIds.length, 0),
    dominantJourneyId: dominant ? dominant.id : null,
    themes: [...new Set(journeys.map((j) => j.dominantTheme))],
  };

  return { journeys, connections, summary };
}
