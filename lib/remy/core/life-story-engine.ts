/**
 * Remy Platform (v2) — LIFE STORY ENGINE (pure).
 *
 * Remy already understands memories, their meaning, the memory graph, life journeys, relationships,
 * personality, and emotional significance. This engine assembles an entire LIFE STORY — the canonical,
 * structured chronological representation of a life, built ONLY from real journeys (`JourneyAnalysis`).
 *
 * A Life Story is NOT generated prose. Chapters are runs of chronologically-continuous, CONNECTED
 * journeys: two adjacent journeys join only when a real relational signal supports it (shared people,
 * a journey/graph connection, the same theme, or a shared life chapter) AND their years are
 * continuous AND their life stages are compatible. The timeline / milestones / summary are structured
 * references to EXISTING journeys, years, and memories. Nothing is invented: missing chapters / years
 * / events are never fabricated, disconnected journeys are never merged, and when continuity cannot be
 * established a journey stays independent (its own single-journey chapter). This is the canonical
 * source for future AI conversation / biography / timeline UI / story-book export / reasoning.
 *
 * REQUIRED input is the JourneyAnalysis; the graph / understandings / chapters / significant-memories
 * are OPTIONAL refinements (the engine assembles a complete story from journeys alone). PURE: no
 * React/DOM/Supabase/fetch/timers/clock/Date/Math.random/persistence/network/GPT.
 */
import type {
  Journey,
  JourneyAnalysis,
  LifeChapter,
  LifeStage,
  LifeStory,
  LifeStoryAnalysis,
  LifeStoryChapter,
  LifeStoryMilestone,
  LifeStorySummary,
  LifeStoryTimeline,
  LifeStoryTimelineEntry,
  MemoryGraph,
  MemoryTheme,
  MemoryUnderstanding,
  SignificantMemory,
} from "./family-types";

export interface LifeStoryInput {
  journeyAnalysis: JourneyAnalysis;
  // --- Optional refinements (the engine assembles a complete story from journeys alone) ---
  graph?: MemoryGraph;
  understandings?: MemoryUnderstanding[];
  chapters?: LifeChapter[];
  significantMemories?: SignificantMemory[];
}

/** Two dated journeys within this many years chain into the same chapter. */
const MAX_CHAPTER_GAP = 6;
/** Two dated journeys more than this many years apart are disconnected life periods — never chained. */
const MAX_HARD_GAP = 15;
/** Chronological order of the known life stages (for adjacency compatibility). */
const LIFE_STAGE_ORDER: LifeStage[] = [
  "childhood",
  "teen-years",
  "early-adult",
  "family-life",
  "later-years",
];

const clamp100 = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function peopleOf(u: MemoryUnderstanding): string[] {
  const r = u.relationship;
  return r.primaryPerson ? [r.primaryPerson, ...r.secondaryPeople] : [...r.secondaryPeople];
}

/** Stable chronological sort keys: undated journeys (year 0) sort AFTER all dated ones. */
function startKey(j: Journey): number {
  return j.startYear > 0 ? j.startYear : Number.MAX_SAFE_INTEGER;
}
function endKey(j: Journey): number {
  return j.endYear > 0 ? j.endYear : Number.MAX_SAFE_INTEGER;
}

function lifeStagesCompatible(a: LifeStage, b: LifeStage): boolean {
  if (a === "unknown" || b === "unknown") return true;
  const ia = LIFE_STAGE_ORDER.indexOf(a);
  const ib = LIFE_STAGE_ORDER.indexOf(b);
  if (ia < 0 || ib < 0) return true;
  return Math.abs(ia - ib) <= 1;
}

/** Distinct real (year > 0) years across a set of journeys, ascending. */
function distinctYears(journeys: Journey[]): number[] {
  const set = new Set<number>();
  for (const j of journeys) {
    for (const stage of j.timeline.stages) {
      if (stage.year > 0) set.add(stage.year);
    }
  }
  return [...set].sort((a, b) => a - b);
}

/** 0–100 chronological continuity from a set of real, ascending years (fewer/smaller gaps = higher). */
function continuityOfYears(years: number[]): number {
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
  return clamp100(100 - gaps * 10 - largest * 2);
}

function dominantThemeOf(journeys: Journey[]): MemoryTheme {
  const weight = new Map<MemoryTheme, number>();
  for (const j of journeys) {
    weight.set(j.dominantTheme, (weight.get(j.dominantTheme) ?? 0) + j.memoryIds.length);
  }
  let best: MemoryTheme = "other";
  let bestN = -1;
  for (const [theme, n] of [...weight.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (n > bestN) {
      best = theme;
      bestN = n;
    }
  }
  return best;
}

function dominantLifeStageOf(journeys: Journey[]): LifeStage {
  const weight = new Map<LifeStage, number>();
  for (const j of journeys) {
    if (j.lifeStage === "unknown") continue;
    weight.set(j.lifeStage, (weight.get(j.lifeStage) ?? 0) + j.memoryIds.length);
  }
  let best: LifeStage = "unknown";
  let bestN = 0;
  for (const [ls, n] of [...weight.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (n > bestN) {
      best = ls;
      bestN = n;
    }
  }
  return best;
}

function minStartYear(journeys: Journey[]): number {
  const years = journeys.map((j) => j.startYear).filter((y) => y > 0);
  return years.length ? Math.min(...years) : 0;
}
function maxEndYear(journeys: Journey[]): number {
  const years = journeys.map((j) => j.endYear).filter((y) => y > 0);
  return years.length ? Math.max(...years) : 0;
}

/** The set's highest-significance journey (deterministic tiebreak by id) — used for the title/anchor. */
function dominantJourneyOf(journeys: Journey[]): Journey {
  return journeys.reduce((best, j) =>
    j.significance > best.significance || (j.significance === best.significance && j.id < best.id)
      ? j
      : best,
  );
}

interface BondContext {
  connectedPairs: Set<string>;
  graphPairs: Set<string>;
  /** Full people per journey (from understandings) — richer than the top-3 `dominantPeople`. */
  journeyPeople: Map<string, Set<string>> | null;
  /** Life-chapter ids per journey (from chapters) — an extra "same period" relational signal. */
  journeyLifeChapters: Map<string, Set<string>> | null;
}

function sharePerson(a: Journey, b: Journey, ctx: BondContext): boolean {
  const aSet = ctx.journeyPeople?.get(a.id);
  const bSet = ctx.journeyPeople?.get(b.id);
  if (aSet && bSet) {
    for (const p of aSet) if (bSet.has(p)) return true;
    return false;
  }
  const dom = new Set(a.dominantPeople);
  return b.dominantPeople.some((p) => dom.has(p));
}

function shareLifeChapter(a: Journey, b: Journey, ctx: BondContext): boolean {
  const aSet = ctx.journeyLifeChapters?.get(a.id);
  const bSet = ctx.journeyLifeChapters?.get(b.id);
  if (!aSet || !bSet) return false;
  for (const c of aSet) if (bSet.has(c)) return true;
  return false;
}

/** Whether two chronologically-adjacent journeys belong to the same life-story chapter. */
function journeysBond(a: Journey, b: Journey, ctx: BondContext): boolean {
  const aDated = a.endYear > 0;
  const bDated = b.startYear > 0;

  let chronoOk = true;
  if (aDated && bDated) {
    const gap = b.startYear - a.endYear; // negative when the ranges overlap
    if (gap > MAX_HARD_GAP) return false; // disconnected life periods — never merge
    chronoOk = gap <= MAX_CHAPTER_GAP;
  }
  if (!chronoOk) return false;
  if (!lifeStagesCompatible(a.lifeStage, b.lifeStage)) return false;

  // Chronological continuity alone is not enough — a real relational link must support the join.
  return (
    sharePerson(a, b, ctx) ||
    ctx.connectedPairs.has(pairKey(a.id, b.id)) ||
    ctx.graphPairs.has(pairKey(a.id, b.id)) ||
    a.dominantTheme === b.dominantTheme ||
    shareLifeChapter(a, b, ctx)
  );
}

/** Journey-pairs that at least one real memory-graph edge connects (when a graph is supplied). */
function graphConnectedPairs(
  journeyOfMemory: Map<string, string>,
  graph: MemoryGraph | undefined,
): Set<string> {
  const pairs = new Set<string>();
  if (!graph) return pairs;
  for (const edge of graph.edges) {
    const ja = journeyOfMemory.get(edge.source);
    const jb = journeyOfMemory.get(edge.target);
    if (ja && jb && ja !== jb) pairs.add(pairKey(ja, jb));
  }
  return pairs;
}

function emptyAnalysis(): LifeStoryAnalysis {
  return {
    story: {
      id: "life-story",
      title: "A Life Story",
      journeys: [],
      startYear: 0,
      endYear: 0,
      dominantTheme: "other",
      continuity: 0,
    },
    chapters: [],
    timeline: { startYear: 0, endYear: 0, entries: [] },
    milestones: [],
    summary: {
      dominantTheme: "other",
      firstJourneyId: null,
      latestJourneyId: null,
      journeyCount: 0,
      chapterCount: 0,
      coveredYears: 0,
      lifeStageCoverage: {},
      continuityScore: 0,
    },
  };
}

/**
 * Assemble a whole life story from real journeys. Deterministic, real-data-only. Returns the story,
 * its chapters (connected runs of journeys), the structured timeline, the milestones, and a summary.
 */
export function buildLifeStory(input: LifeStoryInput): LifeStoryAnalysis {
  const allJourneys = input.journeyAnalysis.journeys;
  if (allJourneys.length === 0) return emptyAnalysis();

  // Chronological order (undated journeys last), stable by id.
  const ordered = [...allJourneys].sort(
    (a, b) => startKey(a) - startKey(b) || endKey(a) - endKey(b) || (a.id < b.id ? -1 : 1),
  );

  const journeyOfMemory = new Map<string, string>();
  for (const j of ordered) {
    for (const id of j.memoryIds) journeyOfMemory.set(id, j.id);
  }

  // Optional: full people per journey (from understandings) — a richer shared-people signal.
  let journeyPeople: Map<string, Set<string>> | null = null;
  if (input.understandings) {
    journeyPeople = new Map();
    for (const u of input.understandings) {
      const jid = journeyOfMemory.get(u.id);
      if (!jid) continue;
      let set = journeyPeople.get(jid);
      if (!set) {
        set = new Set<string>();
        journeyPeople.set(jid, set);
      }
      for (const p of peopleOf(u)) set.add(p);
    }
  }

  // Optional: life-chapter ids per journey (from chapters) — an extra "same period" signal.
  let journeyLifeChapters: Map<string, Set<string>> | null = null;
  if (input.chapters) {
    journeyLifeChapters = new Map();
    for (const chapter of input.chapters) {
      for (const mid of chapter.memoryIds) {
        const jid = journeyOfMemory.get(mid);
        if (!jid) continue;
        let set = journeyLifeChapters.get(jid);
        if (!set) {
          set = new Set<string>();
          journeyLifeChapters.set(jid, set);
        }
        set.add(chapter.id);
      }
    }
  }

  const connectedPairs = new Set<string>();
  for (const c of input.journeyAnalysis.connections) connectedPairs.add(pairKey(c.source, c.target));
  const ctx: BondContext = {
    connectedPairs,
    graphPairs: graphConnectedPairs(journeyOfMemory, input.graph),
    journeyPeople,
    journeyLifeChapters,
  };

  // Chain adjacent journeys into chapters (single-linkage over the chronological order).
  const groups: Journey[][] = [];
  let current: Journey[] = [ordered[0]];
  for (let i = 1; i < ordered.length; i++) {
    if (journeysBond(ordered[i - 1], ordered[i], ctx)) {
      current.push(ordered[i]);
    } else {
      groups.push(current);
      current = [ordered[i]];
    }
  }
  groups.push(current);

  const totalMemories = ordered.reduce((s, j) => s + j.memoryIds.length, 0) || 1;

  // Optional: significance rank per memory (from significant-memories) — anchors chapter milestones.
  const significantRank = new Map<string, number>();
  if (input.significantMemories) {
    input.significantMemories.forEach((m, i) => {
      if (!significantRank.has(m.id)) significantRank.set(m.id, i);
    });
  }

  const chapters: LifeStoryChapter[] = [];
  const milestones: LifeStoryMilestone[] = [];
  groups.forEach((group, idx) => {
    const memoryIds = [...new Set(group.flatMap((j) => j.memoryIds))];
    const years = distinctYears(group);
    const continuity = continuityOfYears(years);
    const startYear = minStartYear(group);
    const dominantJourney = dominantJourneyOf(group);
    const memShare = memoryIds.length / totalMemories; // 0–1
    const chapterId = `chapter-${startYear}-${idx}`;
    const chapter: LifeStoryChapter = {
      id: chapterId,
      title: dominantJourney.title,
      journeyIds: group.map((j) => j.id),
      memoryIds,
      dominantTheme: dominantThemeOf(group),
      lifeStage: dominantLifeStageOf(group),
      startYear,
      endYear: maxEndYear(group),
      continuity,
      centrality: clamp100(memShare * 70 + continuity * 0.3),
    };
    chapters.push(chapter);

    // Milestone: anchor to the most significant known memory in the chapter, else its start.
    let anchorMemoryId: string | null = null;
    let bestRank = Number.MAX_SAFE_INTEGER;
    for (const id of memoryIds) {
      const rank = significantRank.get(id);
      if (rank != null && rank < bestRank) {
        bestRank = rank;
        anchorMemoryId = id;
      }
    }
    milestones.push({
      id: `milestone-${chapterId}`,
      year: startYear,
      journeyId: dominantJourney.id,
      chapterId,
      memoryId: anchorMemoryId,
      kind: anchorMemoryId ? "significant-memory" : "chapter-start",
      label: chapter.title,
    });
  });

  const storyStartYear = minStartYear(ordered);
  const storyEndYear = maxEndYear(ordered);
  const storyYears = distinctYears(ordered);
  const storyContinuity = continuityOfYears(storyYears);
  const storyDominantTheme = dominantThemeOf(ordered);

  const story: LifeStory = {
    id: "life-story",
    title:
      storyStartYear > 0 && storyEndYear > 0
        ? `A Life Story (${storyStartYear}–${storyEndYear})`
        : "A Life Story",
    journeys: ordered.map((j) => j.id),
    startYear: storyStartYear,
    endYear: storyEndYear,
    dominantTheme: storyDominantTheme,
    continuity: storyContinuity,
  };

  // Timeline: one entry per journey, chronological (existing journeys + years only — no narration).
  const chapterOfJourney = new Map<string, string>();
  for (const ch of chapters) {
    for (const jid of ch.journeyIds) chapterOfJourney.set(jid, ch.id);
  }
  const entries: LifeStoryTimelineEntry[] = ordered.map((j) => ({
    journeyId: j.id,
    chapterId: chapterOfJourney.get(j.id) ?? "",
    startYear: j.startYear,
    endYear: j.endYear,
  }));
  const timeline: LifeStoryTimeline = { startYear: storyStartYear, endYear: storyEndYear, entries };

  // Summary: structured metadata only.
  const lifeStageCoverage: Partial<Record<LifeStage, number>> = {};
  for (const j of ordered) {
    if (j.lifeStage === "unknown") continue;
    lifeStageCoverage[j.lifeStage] = (lifeStageCoverage[j.lifeStage] ?? 0) + 1;
  }
  const summary: LifeStorySummary = {
    dominantTheme: storyDominantTheme,
    firstJourneyId: ordered[0]?.id ?? null,
    latestJourneyId: ordered[ordered.length - 1]?.id ?? null,
    journeyCount: ordered.length,
    chapterCount: chapters.length,
    coveredYears: storyYears.length,
    lifeStageCoverage,
    continuityScore: storyContinuity,
  };

  return { story, chapters, timeline, milestones, summary };
}
