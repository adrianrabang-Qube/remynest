/**
 * Remy Platform (v2) — REASONING ENGINE (pure).
 *
 * Remy already understands memories, the memory graph, journeys, the life story, chapters, favourites,
 * anniversaries, significance, emotion, personality, and relationships. This engine REASONS over that
 * real structure to derive Remy's structural understanding OF a life:
 *   • Life Anchors      — the dominant structural pillars of the life (Family / Career / Medical / …).
 *   • Life Themes       — dominant lifetime themes from the real journey distribution.
 *   • Life Influences   — the people with the greatest real lifetime influence.
 *   • Relationship      — structured relationship importance (counts only, no emotional reading).
 *     Strengths
 *   • Memory Gaps       — FACTUAL documentation gaps (large year gaps, sparse / missing life stages,
 *                         weakly-documented stages) — never a guess at WHY.
 *
 * Everything is derived deterministically from the real journey / life-story / graph / understanding
 * layers. NO GPT, NO AI generation, NO prose/narration, NO fabricated memories / people / dates /
 * chronology, NO inference beyond what the real data supports. REQUIRED inputs are the journey +
 * life-story + graph + understanding layers; the emotional / personality / relationship / favourite /
 * significant outputs are OPTIONAL refinements. Internal only — nothing renders. PURE: no React/DOM/
 * Supabase/fetch/timers/clock/Date/Math.random/persistence/network.
 */
import type {
  EmotionalProfile,
  FavouritePerson,
  Journey,
  JourneyAnalysis,
  LifeAnchor,
  LifeInfluence,
  LifeStage,
  LifeStoryAnalysis,
  LifeTheme,
  MemoryGap,
  MemoryGraph,
  MemoryTheme,
  MemoryUnderstanding,
  PersonalityTrait,
  ReasoningAnalysis,
  ReasoningSummary,
  RelationshipObservation,
  RelationshipStrength,
  SignificantMemory,
} from "./family-types";

export interface ReasoningInput {
  journeyAnalysis: JourneyAnalysis;
  lifeStory: LifeStoryAnalysis;
  graph: MemoryGraph;
  understandings: MemoryUnderstanding[];
  // --- Optional refinements (the engine reasons from the required layers alone) ---
  emotionalProfile?: EmotionalProfile | null;
  personalityTraits?: PersonalityTrait[];
  relationshipObservations?: RelationshipObservation[];
  favourites?: FavouritePerson[];
  significantMemories?: SignificantMemory[];
}

/** A theme must anchor at least this many memories to count as a structural life anchor. */
const MIN_ANCHOR_MEMORIES = 3;
/** A consecutive-year gap of more than this many years is a factual documentation gap. */
const YEAR_GAP_THRESHOLD = 5;
/** A life stage with at most this many memories is factually sparse. */
const SPARSE_STAGE_MAX = 2;
/** Cap on how many influences / relationship-strengths / gaps the engine returns. */
const MAX_LIST = 12;
/** Ordered known life stages (for detecting a stage missing between the earliest and latest present). */
const LIFE_STAGE_ORDER: LifeStage[] = [
  "childhood",
  "teen-years",
  "early-adult",
  "family-life",
  "later-years",
];

const clamp100 = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

function peopleOf(u: MemoryUnderstanding): string[] {
  const r = u.relationship;
  return r.primaryPerson ? [r.primaryPerson, ...r.secondaryPeople] : [...r.secondaryPeople];
}

function emptyAnalysis(): ReasoningAnalysis {
  return {
    anchors: [],
    themes: [],
    influences: [],
    relationshipStrengths: [],
    gaps: [],
    summary: {
      dominantAnchor: null,
      dominantTheme: "other",
      strongestRelationship: null,
      reasoningDepth: 0,
      confidence: 0,
      lifeCoverage: 0,
    },
  };
}

export function buildReasoning(input: ReasoningInput): ReasoningAnalysis {
  const journeys = input.journeyAnalysis.journeys;
  const understandings = input.understandings;
  if (journeys.length === 0) return emptyAnalysis();

  const understandingById = new Map<string, MemoryUnderstanding>();
  for (const u of understandings) understandingById.set(u.id, u);

  const journeyOfMemory = new Map<string, string>();
  for (const j of journeys) {
    for (const id of j.memoryIds) journeyOfMemory.set(id, j.id);
  }

  const totalMemories =
    journeys.reduce((s, j) => s + j.memoryIds.length, 0) || 1;

  const favouriteRank = new Map<string, number>();
  if (input.favourites) input.favourites.forEach((f, i) => favouriteRank.set(f.id, i));
  const significantSet = input.significantMemories
    ? new Set(input.significantMemories.map((m) => m.id))
    : null;

  // ---- Life Anchors + Life Themes (theme-level aggregation over real journeys) ----
  const byTheme = new Map<MemoryTheme, { journeys: Journey[]; memoryIds: Set<string> }>();
  for (const j of journeys) {
    let bucket = byTheme.get(j.dominantTheme);
    if (!bucket) {
      bucket = { journeys: [], memoryIds: new Set<string>() };
      byTheme.set(j.dominantTheme, bucket);
    }
    bucket.journeys.push(j);
    for (const id of j.memoryIds) bucket.memoryIds.add(id);
  }
  const themeKeys = [...byTheme.keys()].sort();

  const themes: LifeTheme[] = themeKeys
    .map((theme) => {
      const bucket = byTheme.get(theme)!;
      return {
        theme,
        memoryCount: bucket.memoryIds.size,
        journeyCount: bucket.journeys.length,
        share: clamp100((bucket.memoryIds.size / totalMemories) * 100),
      };
    })
    .sort((a, b) => b.memoryCount - a.memoryCount || (a.theme < b.theme ? -1 : 1));

  const anchors: LifeAnchor[] = [];
  for (const theme of themeKeys) {
    if (theme === "other") continue; // "other"/themeless is never a structural anchor
    const bucket = byTheme.get(theme)!;
    if (bucket.memoryIds.size < MIN_ANCHOR_MEMORIES) continue; // never invent an anchor
    const memoryIds = [...bucket.memoryIds].sort();
    const memShare = bucket.memoryIds.size / totalMemories; // 0–1

    let dated = 0;
    let withMedia = 0;
    let peopled = 0;
    let significantCount = 0;
    for (const id of memoryIds) {
      const u = understandingById.get(id);
      if (!u) continue;
      if (u.historical) dated += 1;
      if (u.attachmentRichness > 0) withMedia += 1;
      if (u.relationship.participants > 0) peopled += 1;
      if (significantSet?.has(id)) significantCount += 1;
    }
    const known = memoryIds.length || 1;
    const strength = clamp100(
      memShare * 55 +
        Math.min(25, bucket.journeys.length * 7) +
        Math.min(20, (significantCount / known) * 40),
    );
    const confidence = clamp100(
      (dated / known) * 50 + (withMedia / known) * 30 + (peopled / known) * 20,
    );
    anchors.push({ id: `anchor-${theme}`, theme, journeyIds: bucket.journeys.map((j) => j.id), memoryIds, strength, confidence });
  }
  anchors.sort((a, b) => b.strength - a.strength || (a.id < b.id ? -1 : 1));

  // ---- Per-person structural facts (from real understandings + graph) ----
  const graphDegree = new Map<string, number>();
  for (const edge of input.graph.edges) {
    graphDegree.set(edge.source, (graphDegree.get(edge.source) ?? 0) + 1);
    graphDegree.set(edge.target, (graphDegree.get(edge.target) ?? 0) + 1);
  }

  const personMemories = new Map<string, Set<string>>();
  const personJourneys = new Map<string, Set<string>>();
  const personCoPeople = new Map<string, Set<string>>();
  for (const u of understandings) {
    const ppl = peopleOf(u);
    const jid = journeyOfMemory.get(u.id);
    for (const p of ppl) {
      let mem = personMemories.get(p);
      if (!mem) {
        mem = new Set<string>();
        personMemories.set(p, mem);
      }
      mem.add(u.id);
      if (jid) {
        let js = personJourneys.get(p);
        if (!js) {
          js = new Set<string>();
          personJourneys.set(p, js);
        }
        js.add(jid);
      }
      let co = personCoPeople.get(p);
      if (!co) {
        co = new Set<string>();
        personCoPeople.set(p, co);
      }
      for (const other of ppl) if (other !== p) co.add(other);
    }
  }
  const personIds = [...personMemories.keys()].sort();

  const influences: LifeInfluence[] = personIds
    .map((personId) => {
      const memoryIds = personMemories.get(personId)!;
      const journeyCount = personJourneys.get(personId)?.size ?? 0;
      let graphConnections = 0;
      for (const id of memoryIds) graphConnections += graphDegree.get(id) ?? 0;
      const favBonus = favouriteRank.has(personId)
        ? Math.max(0, 12 - (favouriteRank.get(personId) ?? 0))
        : 0;
      const influence = clamp100(
        Math.min(45, memoryIds.size * 6) +
          Math.min(25, journeyCount * 8) +
          Math.min(20, graphConnections * 2) +
          favBonus,
      );
      return { personId, memoryCount: memoryIds.size, journeyCount, graphConnections, influence };
    })
    .sort((a, b) => b.influence - a.influence || (a.personId < b.personId ? -1 : 1))
    .slice(0, MAX_LIST);

  const relationshipStrengths: RelationshipStrength[] = personIds
    .map((personId) => {
      const memoryCount = personMemories.get(personId)!.size;
      const journeyCount = personJourneys.get(personId)?.size ?? 0;
      const coAppearances = personCoPeople.get(personId)?.size ?? 0;
      const strength = clamp100(
        Math.min(55, memoryCount * 7) +
          Math.min(25, journeyCount * 8) +
          Math.min(20, coAppearances * 5),
      );
      return { personId, memoryCount, journeyCount, coAppearances, strength };
    })
    .sort((a, b) => b.strength - a.strength || (a.personId < b.personId ? -1 : 1))
    .slice(0, MAX_LIST);

  // ---- Memory Gaps (factual only) ----
  const gaps: MemoryGap[] = [];

  // Large year gaps between consecutive documented years across the whole life.
  const storyYears = distinctStoryYears(journeys);
  for (let i = 1; i < storyYears.length; i++) {
    const span = storyYears[i] - storyYears[i - 1];
    if (span > YEAR_GAP_THRESHOLD) {
      gaps.push({
        id: `gap-year-${storyYears[i - 1]}-${storyYears[i]}`,
        kind: "year-gap",
        startYear: storyYears[i - 1],
        endYear: storyYears[i],
        lifeStage: null,
        magnitude: span,
      });
    }
  }

  // Life-stage counts (from real understandings).
  const stageMemoryCount = new Map<LifeStage, number>();
  const stageMediaCount = new Map<LifeStage, number>();
  for (const u of understandings) {
    if (u.lifeStage === "unknown") continue;
    stageMemoryCount.set(u.lifeStage, (stageMemoryCount.get(u.lifeStage) ?? 0) + 1);
    if (u.attachmentRichness > 0) {
      stageMediaCount.set(u.lifeStage, (stageMediaCount.get(u.lifeStage) ?? 0) + 1);
    }
  }
  const presentStages = LIFE_STAGE_ORDER.filter((s) => (stageMemoryCount.get(s) ?? 0) > 0);
  // Sparse present stages, and weakly-documented present stages.
  for (const stage of LIFE_STAGE_ORDER) {
    const count = stageMemoryCount.get(stage) ?? 0;
    if (count > 0 && count <= SPARSE_STAGE_MAX) {
      gaps.push({
        id: `gap-sparse-${stage}`,
        kind: "sparse-life-stage",
        startYear: 0,
        endYear: 0,
        lifeStage: stage,
        magnitude: count,
      });
    }
    if (count > 0 && (stageMediaCount.get(stage) ?? 0) === 0) {
      gaps.push({
        id: `gap-weak-${stage}`,
        kind: "weak-documentation",
        startYear: 0,
        endYear: 0,
        lifeStage: stage,
        magnitude: count,
      });
    }
  }
  // Stages entirely missing BETWEEN the earliest and latest present stages (a factual gap only).
  if (presentStages.length >= 2) {
    const firstIdx = LIFE_STAGE_ORDER.indexOf(presentStages[0]);
    const lastIdx = LIFE_STAGE_ORDER.indexOf(presentStages[presentStages.length - 1]);
    for (let i = firstIdx + 1; i < lastIdx; i++) {
      const stage = LIFE_STAGE_ORDER[i];
      if ((stageMemoryCount.get(stage) ?? 0) === 0) {
        gaps.push({
          id: `gap-missing-${stage}`,
          kind: "missing-life-stage",
          startYear: 0,
          endYear: 0,
          lifeStage: stage,
          magnitude: 0,
        });
      }
    }
  }
  gaps.sort((a, b) => b.magnitude - a.magnitude || (a.id < b.id ? -1 : 1));
  const boundedGaps = gaps.slice(0, MAX_LIST);

  // ---- Summary (structured metadata only) ----
  const stageCoverage = presentStages.length / LIFE_STAGE_ORDER.length; // 0–1
  const lifeCoverage = clamp100(input.lifeStory.story.continuity * 0.6 + stageCoverage * 40);

  const avgAnchorConfidence =
    anchors.length > 0
      ? anchors.reduce((s, a) => s + a.confidence, 0) / anchors.length
      : 0;
  const emotionalBlend = input.emotionalProfile
    ? (input.emotionalProfile.memoryPreservation + input.emotionalProfile.relationshipHealth) / 2
    : avgAnchorConfidence;
  const confidence = clamp100(avgAnchorConfidence * 0.7 + emotionalBlend * 0.3);

  const reasoningDepth = clamp100(
    Math.min(45, anchors.length * 15) +
      Math.min(25, influences.length * 4) +
      Math.min(15, themes.length * 3) +
      Math.min(8, (input.personalityTraits?.length ?? 0) * 3) +
      Math.min(7, input.relationshipObservations?.length ?? 0),
  );

  const summary: ReasoningSummary = {
    dominantAnchor: anchors[0]?.id ?? null,
    dominantTheme: themes[0]?.theme ?? input.lifeStory.story.dominantTheme,
    strongestRelationship: influences[0]?.personId ?? null,
    reasoningDepth,
    confidence,
    lifeCoverage,
  };

  return { anchors, themes, influences, relationshipStrengths, gaps: boundedGaps, summary };
}

/** Distinct real (year > 0) documented years across all journeys, ascending. */
function distinctStoryYears(journeys: Journey[]): number[] {
  const set = new Set<number>();
  for (const j of journeys) {
    for (const stage of j.timeline.stages) {
      if (stage.year > 0) set.add(stage.year);
    }
  }
  return [...set].sort((a, b) => a - b);
}
