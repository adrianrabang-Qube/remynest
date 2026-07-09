/**
 * Remy Platform (v2) — BIOGRAPHY ENGINE (pure).
 *
 * Remy already understands memories, the memory graph, journeys, the life story, reasoning, chapters,
 * favourites, anniversaries, significance, emotion, personality, and relationships. This engine
 * assembles a BIOGRAPHY — a structured representation of a life — from those real layers.
 *
 * A Biography is NOT generated prose. Every section, period, and reference points at REAL entities
 * (journeys / chapters / anchors / themes / people / memories) and every metric is a structured
 * number. Sections mirror the real life-story chapters; periods group them chronologically by life
 * stage using only real memory years; references index the real entities so a future renderer can
 * resolve them. Nothing is invented: no fabricated memories / people / dates / chronology, no
 * paragraphs, no narration.
 *
 * REQUIRED inputs are the journey / life-story / reasoning / graph / understanding layers; the
 * favourite / emotional / relationship / significant outputs are OPTIONAL refinements. Internal only —
 * nothing renders. PURE: no React/DOM/Supabase/fetch/timers/clock/Date/Math.random/persistence/network.
 */
import type {
  BiographyAnalysis,
  BiographyCoverage,
  BiographyPeriod,
  BiographyReference,
  BiographySection,
  BiographySummary,
  EmotionalProfile,
  FavouritePerson,
  Journey,
  JourneyAnalysis,
  LifeStage,
  LifeStoryAnalysis,
  LifeStoryChapter,
  MemoryUnderstanding,
  MemoryGraph,
  ReasoningAnalysis,
  RelationshipObservation,
  SignificantMemory,
} from "./family-types";

export interface BiographyInput {
  journeyAnalysis: JourneyAnalysis;
  lifeStory: LifeStoryAnalysis;
  reasoning: ReasoningAnalysis;
  graph: MemoryGraph;
  understandings: MemoryUnderstanding[];
  // --- Optional refinements (the engine builds a complete biography from the required layers alone) ---
  favourites?: FavouritePerson[];
  emotionalProfile?: EmotionalProfile | null;
  relationshipObservations?: RelationshipObservation[];
  significantMemories?: SignificantMemory[];
}

/** Ordered known life stages (periods are grouped by stage; "unknown" is appended last). */
const LIFE_STAGE_ORDER: LifeStage[] = [
  "childhood",
  "teen-years",
  "early-adult",
  "family-life",
  "later-years",
];
/** How many top people / significant memories to index as references. */
const MAX_PEOPLE_REFS = 8;
const MAX_MEMORY_REFS = 12;

const clamp100 = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

function distinctStoryYears(journeys: Journey[]): number[] {
  const set = new Set<number>();
  for (const j of journeys) {
    for (const stage of j.timeline.stages) {
      if (stage.year > 0) set.add(stage.year);
    }
  }
  return [...set].sort((a, b) => a - b);
}

function emptyAnalysis(dominantTheme: BiographySummary["dominantTheme"]): BiographyAnalysis {
  return {
    sections: [],
    periods: [],
    references: [],
    coverage: {
      memoryCoverage: 0,
      journeyCoverage: 0,
      chapterCoverage: 0,
      lifeStageCoverage: 0,
      timelineCoverage: 0,
      confidence: 0,
    },
    summary: {
      dominantTheme,
      dominantAnchor: null,
      coveredYears: 0,
      coverage: 0,
      confidence: 0,
    },
  };
}

export function buildBiography(input: BiographyInput): BiographyAnalysis {
  const journeys = input.journeyAnalysis.journeys;
  const chapters = input.lifeStory.chapters;
  const dominantTheme = input.reasoning.summary.dominantTheme;
  if (journeys.length === 0 || chapters.length === 0) return emptyAnalysis(dominantTheme);

  const understandingById = new Map<string, MemoryUnderstanding>();
  for (const u of input.understandings) understandingById.set(u.id, u);
  const totalMemories = input.understandings.length || 1;
  const totalJourneyMemories = chapters.reduce((s, c) => s + c.memoryIds.length, 0) || 1;

  // ---- Sections: one per real life-story chapter (chronological order preserved) ----
  const sectionIdOfChapter = new Map<string, string>();
  const sections: BiographySection[] = chapters.map((chapter) => {
    const sectionId = `section-${chapter.id}`;
    sectionIdOfChapter.set(chapter.id, sectionId);

    let dated = 0;
    let withMedia = 0;
    let peopled = 0;
    for (const id of chapter.memoryIds) {
      const u = understandingById.get(id);
      if (!u) continue;
      if (u.historical) dated += 1;
      if (u.attachmentRichness > 0) withMedia += 1;
      if (u.relationship.participants > 0) peopled += 1;
    }
    const known = chapter.memoryIds.length || 1;
    const memShare = chapter.memoryIds.length / totalJourneyMemories; // 0–1
    const coverage = clamp100(memShare * 70 + chapter.continuity * 0.3);
    const confidence = clamp100(
      (dated / known) * 50 + (withMedia / known) * 30 + (peopled / known) * 20,
    );
    return {
      id: sectionId,
      title: chapter.title,
      journeyIds: chapter.journeyIds,
      chapterIds: [chapter.id],
      memoryIds: chapter.memoryIds,
      theme: chapter.dominantTheme,
      lifeStage: chapter.lifeStage,
      coverage,
      confidence,
    };
  });

  // ---- Periods: group chapters chronologically by life stage (real years only) ----
  const byStage = new Map<LifeStage, LifeStoryChapter[]>();
  for (const chapter of chapters) {
    let list = byStage.get(chapter.lifeStage);
    if (!list) {
      list = [];
      byStage.set(chapter.lifeStage, list);
    }
    list.push(chapter);
  }
  const stageOrder: LifeStage[] = [...LIFE_STAGE_ORDER, "unknown"];
  const periods: BiographyPeriod[] = [];
  for (const stage of stageOrder) {
    const chs = byStage.get(stage);
    if (!chs || chs.length === 0) continue;
    const startYears = chs.map((c) => c.startYear).filter((y) => y > 0);
    const endYears = chs.map((c) => c.endYear).filter((y) => y > 0);
    periods.push({
      id: `period-${stage}`,
      startYear: startYears.length ? Math.min(...startYears) : 0,
      endYear: endYears.length ? Math.max(...endYears) : 0,
      sectionIds: chs.map((c) => sectionIdOfChapter.get(c.id)!),
      lifeStage: stage,
      memoryCount: chs.reduce((s, c) => s + c.memoryIds.length, 0),
    });
  }

  // ---- References: index REAL entities (journeys / chapters / anchors / themes / people / memories) ----
  const references: BiographyReference[] = [];
  for (const section of sections) {
    for (const jid of section.journeyIds) references.push({ kind: "journey", refId: jid, sectionId: section.id });
    for (const cid of section.chapterIds) references.push({ kind: "chapter", refId: cid, sectionId: section.id });
  }
  for (const anchor of input.reasoning.anchors) {
    references.push({ kind: "anchor", refId: anchor.id, sectionId: null });
  }
  for (const theme of input.reasoning.themes) {
    references.push({ kind: "theme", refId: theme.theme, sectionId: null });
  }
  const seenPeople = new Set<string>();
  for (const influence of input.reasoning.influences) {
    if (seenPeople.size >= MAX_PEOPLE_REFS) break;
    if (seenPeople.has(influence.personId)) continue;
    seenPeople.add(influence.personId);
    references.push({ kind: "person", refId: influence.personId, sectionId: null });
  }
  for (const fav of input.favourites ?? []) {
    if (seenPeople.size >= MAX_PEOPLE_REFS) break;
    if (seenPeople.has(fav.id)) continue;
    seenPeople.add(fav.id);
    references.push({ kind: "person", refId: fav.id, sectionId: null });
  }
  const seenMemories = new Set<string>();
  for (const milestone of input.lifeStory.milestones) {
    if (milestone.memoryId == null || seenMemories.has(milestone.memoryId)) continue;
    seenMemories.add(milestone.memoryId);
    references.push({
      kind: "memory",
      refId: milestone.memoryId,
      sectionId: sectionIdOfChapter.get(milestone.chapterId) ?? null,
    });
  }
  for (const sig of input.significantMemories ?? []) {
    if (seenMemories.size >= MAX_MEMORY_REFS) break;
    if (seenMemories.has(sig.id)) continue;
    seenMemories.add(sig.id);
    references.push({ kind: "memory", refId: sig.id, sectionId: null });
  }

  // ---- Coverage metrics ----
  const memoriesInSections = new Set<string>();
  for (const section of sections) for (const id of section.memoryIds) memoriesInSections.add(id);
  const journeysInSections = new Set<string>();
  for (const section of sections) for (const jid of section.journeyIds) journeysInSections.add(jid);
  const presentStages = new Set<LifeStage>();
  for (const section of sections) if (section.lifeStage !== "unknown") presentStages.add(section.lifeStage);

  const avgSectionConfidence =
    sections.length > 0 ? sections.reduce((s, x) => s + x.confidence, 0) / sections.length : 0;
  // Optional documentation signals nudge confidence up when present (no-op when absent).
  const emotionalBoost = input.emotionalProfile
    ? input.emotionalProfile.memoryPreservation * 0.15
    : 0;
  const relationshipBoost = Math.min(6, input.relationshipObservations?.length ?? 0);
  const coverageConfidence = clamp100(avgSectionConfidence + emotionalBoost + relationshipBoost);

  const coverage: BiographyCoverage = {
    memoryCoverage: clamp100((memoriesInSections.size / totalMemories) * 100),
    journeyCoverage: clamp100((journeysInSections.size / journeys.length) * 100),
    chapterCoverage: clamp100((sections.length / chapters.length) * 100),
    lifeStageCoverage: clamp100((presentStages.size / LIFE_STAGE_ORDER.length) * 100),
    timelineCoverage: clamp100(input.lifeStory.story.continuity),
    confidence: coverageConfidence,
  };

  // ---- Summary ----
  const coveredYears = distinctStoryYears(journeys).length;
  const summary: BiographySummary = {
    dominantTheme,
    dominantAnchor: input.reasoning.summary.dominantAnchor,
    coveredYears,
    coverage: coverage.memoryCoverage,
    confidence: coverage.confidence,
  };

  return { sections, periods, references, coverage, summary };
}
