/**
 * Remy Platform (v2) — ANSWER ASSEMBLY ENGINE (pure).
 *
 * The FINAL deterministic intelligence layer before any conversational / LLM rendering. It does NOT
 * generate answers — it assembles ONLY the structured, FACTUAL package a FUTURE conversational layer
 * will verbalize: ordered structured SECTIONS (from the answer plan), a deterministic CHRONOLOGY (from
 * the real life-story chapters), the real EVIDENCE / entity lists the answer stands on, and bounded
 * coverage / context metrics.
 *
 * This is NOT chat, NOT GPT, NOT an LLM. No prose, no narration, no generated text, no prompts, no
 * fabricated data — every field is a structured id, enum, or number, and everything traces to a real
 * upstream entity. Internal only. PURE: no React/DOM/Supabase/fetch/timers/clock/Date/Math.random/
 * persistence/network/LLM.
 */
import type {
  AnswerAssembly,
  AnswerAssemblyContext,
  AnswerAssemblyCoverage,
  AnswerAssemblySummary,
  AnswerChronology,
  AnswerEvidence,
  AnswerEvidenceKind,
  AnswerPlan,
  AnswerPlanStepKind,
  AnswerSection,
  AnswerSectionKind,
  BiographyAnalysis,
  BiographySection,
  ConversationFoundation,
  EmotionalProfile,
  FavouritePerson,
  JourneyAnalysis,
  LifeStoryAnalysis,
  LifeStoryChapter,
  MemoryGraph,
  MemoryTheme,
  MemoryUnderstanding,
  QuestionUnderstanding,
  ReasoningAnalysis,
  RelationshipObservation,
  SignificantMemory,
} from "./family-types";

export interface AnswerAssemblyInput {
  answerPlan: AnswerPlan;
  questionUnderstanding: QuestionUnderstanding;
  conversationFoundation: ConversationFoundation;
  biography: BiographyAnalysis;
  reasoning: ReasoningAnalysis;
  lifeStory: LifeStoryAnalysis;
  journeyAnalysis: JourneyAnalysis;
  graph: MemoryGraph;
  understandings: MemoryUnderstanding[];
  // --- Optional refinements (the package is complete from the required layers alone) ---
  favourites?: FavouritePerson[];
  significantMemories?: SignificantMemory[];
  relationshipObservations?: RelationshipObservation[];
  emotionalProfile?: EmotionalProfile | null;
}

const MAX_SECTIONS = 32;
const MAX_EVIDENCE = 32;
const MAX_REFERENCES = 96;
const MAX_MEMORIES = 48;
const MAX_PEOPLE = 24;
const MAX_JOURNEYS = 24;
const MAX_CHAPTERS = 24;
const MAX_ANCHORS = 16;
const MAX_THEMES = 13;

/** Which structured answer section an answer-plan step becomes. */
const SECTION_KIND_OF_STEP: Record<AnswerPlanStepKind, AnswerSectionKind> = {
  memory: "memory",
  journey: "journey",
  chapter: "chapter",
  theme: "theme",
  anchor: "anchor",
  person: "relationship",
  timeline: "timeline",
  relationship: "relationship",
  event: "timeline",
  summary: "summary",
  comparison: "comparison",
  reference: "anchor",
};

const clamp100 = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

function peopleOf(u: MemoryUnderstanding): string[] {
  const r = u.relationship;
  return r.primaryPerson ? [r.primaryPerson, ...r.secondaryPeople] : [...r.secondaryPeople];
}

function emptyAssembly(dominantTheme: MemoryTheme, dominantAnchor: string | null): AnswerAssembly {
  return {
    sections: [],
    chronology: { entries: [], startYear: 0, endYear: 0 },
    evidence: [],
    memories: [],
    people: [],
    journeys: [],
    chapters: [],
    anchors: [],
    themes: [],
    references: [],
    coverage: {
      memoryCoverage: 0,
      journeyCoverage: 0,
      chapterCoverage: 0,
      themeCoverage: 0,
      anchorCoverage: 0,
      personCoverage: 0,
      timelineCompleteness: 0,
      answerCompleteness: 0,
      confidence: 0,
      contextDepth: 0,
    },
    context: {
      sectionCount: 0,
      evidenceCount: 0,
      memoryCount: 0,
      coverage: 0,
      confidence: 0,
      contextDepth: 0,
    },
    summary: {
      dominantTheme,
      dominantAnchor,
      primaryJourney: null,
      primaryPerson: null,
      sectionCount: 0,
      evidenceCount: 0,
      coverage: 0,
      confidence: 0,
    },
  };
}

export function buildAnswerAssembly(input: AnswerAssemblyInput): AnswerAssembly {
  const planSteps = input.answerPlan.steps;
  const dominantTheme = input.reasoning.summary.dominantTheme;
  const dominantAnchor = input.reasoning.summary.dominantAnchor;
  if (planSteps.length === 0) return emptyAssembly(dominantTheme, dominantAnchor);

  const understandingById = new Map<string, MemoryUnderstanding>();
  for (const u of input.understandings) understandingById.set(u.id, u);
  const totalMemories = input.understandings.length || 1;
  const peopleUniverse = new Set<string>();
  for (const u of input.understandings) for (const p of peopleOf(u)) peopleUniverse.add(p);

  const sectionOfMemory = new Map<string, BiographySection>();
  for (const section of input.biography.sections) {
    for (const id of section.memoryIds) sectionOfMemory.set(id, section);
  }
  const graphDegree = new Map<string, number>();
  for (const edge of input.graph.edges) {
    graphDegree.set(edge.source, (graphDegree.get(edge.source) ?? 0) + 1);
    graphDegree.set(edge.target, (graphDegree.get(edge.target) ?? 0) + 1);
  }

  // ---- Sections: render each answer-plan step as a structured section ----
  const sections: AnswerSection[] = planSteps.map((step) => ({
    id: `assembly-${step.id.slice("step-".length)}`,
    kind: SECTION_KIND_OF_STEP[step.kind],
    stepId: step.id,
    order: 0,
    memoryIds: step.memoryIds,
    journeyIds: step.journeyIds,
    chapterIds: step.chapterIds,
    anchorIds: step.anchorIds,
    themeIds: step.themeIds,
    personIds: step.personIds,
    weight: step.weight,
    confidence: step.confidence,
  }));
  sections.sort((a, b) => b.weight - a.weight || (a.id < b.id ? -1 : 1));
  const boundedSections = sections.slice(0, MAX_SECTIONS);
  boundedSections.forEach((s, i) => {
    s.order = i;
  });

  // ---- Evidence: aggregate real supporting entities from the sections (+ each memory's chapter) ----
  const evidenceMap = new Map<string, AnswerEvidence>();
  const addEvidence = (
    kind: AnswerEvidenceKind,
    refId: string,
    weight: number,
    confidence: number,
  ): void => {
    const key = `${kind}|${refId}`;
    const existing = evidenceMap.get(key);
    if (existing) {
      existing.weight = Math.max(existing.weight, weight);
      existing.confidence = Math.max(existing.confidence, confidence);
    } else {
      evidenceMap.set(key, { kind, refId, weight, confidence });
    }
  };
  for (const section of boundedSections) {
    for (const id of section.memoryIds) {
      addEvidence("memory", id, section.weight, section.confidence);
      const chapter = sectionOfMemory.get(id);
      if (chapter) for (const cid of chapter.chapterIds) addEvidence("chapter", cid, section.weight, section.confidence);
    }
    for (const id of section.journeyIds) addEvidence("journey", id, section.weight, section.confidence);
    for (const id of section.chapterIds) addEvidence("chapter", id, section.weight, section.confidence);
    for (const id of section.anchorIds) addEvidence("anchor", id, section.weight, section.confidence);
    for (const t of section.themeIds) addEvidence("theme", t, section.weight, section.confidence);
    for (const id of section.personIds) addEvidence("person", id, section.weight, section.confidence);
  }
  // Optional: real significant memories / favourite people strengthen the evidence pool when present.
  for (const sig of input.significantMemories ?? []) {
    if (understandingById.has(sig.id)) addEvidence("memory", sig.id, 40, 60);
  }
  for (const fav of input.favourites ?? []) {
    addEvidence("person", fav.id, clamp100(fav.score), 60);
  }
  const allEvidence = [...evidenceMap.values()].sort(
    (a, b) =>
      b.weight - a.weight ||
      (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0) ||
      (a.refId < b.refId ? -1 : 1),
  );
  const references = allEvidence.slice(0, MAX_REFERENCES);
  const evidence = allEvidence.slice(0, MAX_EVIDENCE);

  // ---- Real entity lists (memories additionally ranked by graph connectivity) ----
  const idsByKind = (kind: AnswerEvidenceKind): AnswerEvidence[] =>
    allEvidence.filter((e) => e.kind === kind);
  const memories = idsByKind("memory")
    .sort(
      (a, b) =>
        b.weight - a.weight ||
        (graphDegree.get(b.refId) ?? 0) - (graphDegree.get(a.refId) ?? 0) ||
        (a.refId < b.refId ? -1 : 1),
    )
    .slice(0, MAX_MEMORIES)
    .map((e) => e.refId);
  const people = idsByKind("person").slice(0, MAX_PEOPLE).map((e) => e.refId);
  const journeys = idsByKind("journey").slice(0, MAX_JOURNEYS).map((e) => e.refId);
  const chapters = idsByKind("chapter").slice(0, MAX_CHAPTERS).map((e) => e.refId);
  const anchors = idsByKind("anchor").slice(0, MAX_ANCHORS).map((e) => e.refId);
  const themes = idsByKind("theme").slice(0, MAX_THEMES).map((e) => e.refId as MemoryTheme);

  // ---- Chronology: deterministic order from the real life-story chapters ----
  const chronologyChapters = [...input.lifeStory.chapters].sort(
    (a, b) =>
      (a.startYear > 0 ? a.startYear : Number.MAX_SAFE_INTEGER) -
        (b.startYear > 0 ? b.startYear : Number.MAX_SAFE_INTEGER) ||
      (a.id < b.id ? -1 : 1),
  );
  const chronologyEntries = chronologyChapters.map((c: LifeStoryChapter, i) => ({
    chapterId: c.id,
    journeyIds: [...c.journeyIds].sort(),
    startYear: c.startYear,
    endYear: c.endYear,
    order: i,
    confidence: clamp100(c.continuity),
  }));
  const chronologyYears = chronologyChapters
    .flatMap((c) => [c.startYear, c.endYear])
    .filter((y) => y > 0);
  const chronology: AnswerChronology = {
    entries: chronologyEntries,
    startYear: chronologyYears.length ? Math.min(...chronologyYears) : 0,
    endYear: chronologyYears.length ? Math.max(...chronologyYears) : 0,
  };

  // ---- Coverage ----
  const distinctMemories = new Set<string>();
  const distinctJourneys = new Set<string>();
  const distinctChapters = new Set<string>();
  const distinctThemes = new Set<MemoryTheme>();
  const distinctAnchors = new Set<string>();
  const distinctPersons = new Set<string>();
  for (const section of boundedSections) {
    for (const id of section.memoryIds) {
      distinctMemories.add(id);
      const chapter = sectionOfMemory.get(id);
      if (chapter) for (const cid of chapter.chapterIds) distinctChapters.add(cid);
    }
    for (const id of section.journeyIds) distinctJourneys.add(id);
    for (const id of section.chapterIds) distinctChapters.add(id);
    for (const t of section.themeIds) distinctThemes.add(t);
    for (const id of section.anchorIds) distinctAnchors.add(id);
    for (const id of section.personIds) distinctPersons.add(id);
  }
  const totalJourneys = input.journeyAnalysis.journeys.length || 1;
  const totalChapters = input.lifeStory.chapters.length || 1;

  const memoryCoverage = clamp100((distinctMemories.size / totalMemories) * 100);
  const journeyCoverage = clamp100((distinctJourneys.size / totalJourneys) * 100);
  const chapterCoverage = clamp100((distinctChapters.size / totalChapters) * 100);
  const themeCoverage = clamp100((distinctThemes.size / Math.max(1, input.reasoning.themes.length)) * 100);
  const anchorCoverage = clamp100((distinctAnchors.size / Math.max(1, input.reasoning.anchors.length)) * 100);
  const personCoverage = clamp100((distinctPersons.size / Math.max(1, peopleUniverse.size)) * 100);
  const timelineCompleteness = clamp100(input.lifeStory.story.continuity);
  const answerCompleteness = clamp100(
    (memoryCoverage +
      journeyCoverage +
      chapterCoverage +
      themeCoverage +
      personCoverage +
      timelineCompleteness) /
      6,
  );

  const avgSectionConfidence =
    boundedSections.length > 0
      ? boundedSections.reduce((s, x) => s + x.confidence, 0) / boundedSections.length
      : 0;
  const emotionalBoost = input.emotionalProfile ? input.emotionalProfile.memoryPreservation * 0.1 : 0;
  const relationshipBoost = Math.min(5, input.relationshipObservations?.length ?? 0);
  const confidence = clamp100(
    avgSectionConfidence * 0.6 +
      input.questionUnderstanding.context.confidence * 0.2 +
      input.conversationFoundation.context.confidence * 0.2 +
      emotionalBoost +
      relationshipBoost,
  );
  const distinctKinds = new Set(boundedSections.map((s) => s.kind)).size;
  const contextDepth = clamp100(
    Math.min(60, boundedSections.length * 5) + Math.min(40, distinctKinds * 6),
  );

  const coverage: AnswerAssemblyCoverage = {
    memoryCoverage,
    journeyCoverage,
    chapterCoverage,
    themeCoverage,
    anchorCoverage,
    personCoverage,
    timelineCompleteness,
    answerCompleteness,
    confidence,
    contextDepth,
  };

  const context: AnswerAssemblyContext = {
    sectionCount: boundedSections.length,
    evidenceCount: evidence.length,
    memoryCount: memories.length,
    coverage: memoryCoverage,
    confidence,
    contextDepth,
  };

  const summary: AnswerAssemblySummary = {
    dominantTheme,
    dominantAnchor,
    primaryJourney: journeys[0] ?? null,
    primaryPerson: people[0] ?? null,
    sectionCount: boundedSections.length,
    evidenceCount: evidence.length,
    coverage: answerCompleteness,
    confidence,
  };

  return {
    sections: boundedSections,
    chronology,
    evidence,
    memories,
    people,
    journeys,
    chapters,
    anchors,
    themes,
    references,
    coverage,
    context,
    summary,
  };
}
