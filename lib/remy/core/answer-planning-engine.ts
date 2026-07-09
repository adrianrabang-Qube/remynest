/**
 * Remy Platform (v2) — ANSWER PLANNING ENGINE (pure).
 *
 * This is NOT chat, NOT GPT, NOT an LLM, and it produces NO answers. It builds the deterministic
 * EXECUTION PLAN a FUTURE conversational layer will run AFTER Question Understanding: an ordered list of
 * structured retrieval STEPS (each executes a real question intent and points only at real ids), the
 * real SOURCE pool those steps draw from (ranked by graph connectivity, enriched with the biography /
 * conversation / milestone entities), and structured coverage metrics.
 *
 * No prose, no generated answers, no prompts, no invented ids. A supported step kind with no real
 * backing (e.g. "reference" today) simply never appears rather than being fabricated. Internal only.
 * PURE: no React/DOM/Supabase/fetch/timers/clock/Date/Math.random/persistence/network/LLM.
 */
import type {
  AnswerPlan,
  AnswerPlanContext,
  AnswerPlanCoverage,
  AnswerPlanSource,
  AnswerPlanStep,
  AnswerPlanStepKind,
  AnswerPlanSummary,
  BiographyAnalysis,
  BiographySection,
  ConversationFoundation,
  EmotionalProfile,
  FavouritePerson,
  JourneyAnalysis,
  LifeStoryAnalysis,
  MemoryGraph,
  MemoryTheme,
  MemoryUnderstanding,
  QuestionIntentKind,
  QuestionUnderstanding,
  ReasoningAnalysis,
  RelationshipObservation,
  SignificantMemory,
} from "./family-types";

export interface AnswerPlanInput {
  questionUnderstanding: QuestionUnderstanding;
  conversationFoundation: ConversationFoundation;
  biography: BiographyAnalysis;
  reasoning: ReasoningAnalysis;
  lifeStory: LifeStoryAnalysis;
  journeyAnalysis: JourneyAnalysis;
  graph: MemoryGraph;
  understandings: MemoryUnderstanding[];
  // --- Optional refinements (the plan is complete from the required layers alone) ---
  favourites?: FavouritePerson[];
  relationshipObservations?: RelationshipObservation[];
  significantMemories?: SignificantMemory[];
  emotionalProfile?: EmotionalProfile | null;
}

const MAX_STEPS = 32;
const MAX_MEMORY_SOURCES = 32;

/** Which real retrieval step a question intent becomes (null = not executed as a step). */
const STEP_KIND_OF_INTENT: Record<QuestionIntentKind, AnswerPlanStepKind | null> = {
  memory: "memory",
  person: "person",
  journey: "journey",
  theme: "theme",
  "life-stage": "timeline",
  relationship: "relationship",
  timeline: "timeline",
  event: "event",
  date: "chapter",
  place: null,
  comparison: "comparison",
  summary: "summary",
  reference: "anchor",
};

const clamp100 = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

function peopleOf(u: MemoryUnderstanding): string[] {
  const r = u.relationship;
  return r.primaryPerson ? [r.primaryPerson, ...r.secondaryPeople] : [...r.secondaryPeople];
}

function emptyPlan(dominantTheme: MemoryTheme, dominantAnchor: string | null): AnswerPlan {
  return {
    steps: [],
    sources: [],
    context: { coverage: 0, confidence: 0, candidateCount: 0, sourceCount: 0, executionDepth: 0 },
    coverage: {
      memoryCoverage: 0,
      journeyCoverage: 0,
      themeCoverage: 0,
      personCoverage: 0,
      timelineCoverage: 0,
    },
    summary: {
      primaryIntent: null,
      primaryTheme: dominantTheme,
      primaryAnchor: dominantAnchor,
      coverage: 0,
      confidence: 0,
      planDepth: 0,
    },
  };
}

export function buildAnswerPlan(input: AnswerPlanInput): AnswerPlan {
  const intents = input.questionUnderstanding.intents;
  const dominantTheme = input.reasoning.summary.dominantTheme;
  const dominantAnchor = input.reasoning.summary.dominantAnchor;
  if (intents.length === 0) return emptyPlan(dominantTheme, dominantAnchor);

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

  // ---- Steps: execute each real question intent as a structured retrieval step ----
  const steps: AnswerPlanStep[] = [];
  for (const intent of intents) {
    const kind = STEP_KIND_OF_INTENT[intent.kind];
    if (!kind) continue; // e.g. "place" — never produced
    steps.push({
      id: `step-${intent.id.slice("intent-".length)}`,
      kind,
      intentId: intent.id,
      order: 0,
      memoryIds: intent.focus.memoryIds,
      journeyIds: intent.focus.journeyIds,
      chapterIds: intent.focus.chapterIds,
      anchorIds: intent.focus.anchorIds,
      themeIds: intent.focus.themeIds,
      personIds: intent.focus.personIds,
      weight: intent.weight,
      confidence: intent.confidence,
    });
  }
  steps.sort((a, b) => b.weight - a.weight || (a.id < b.id ? -1 : 1));
  const boundedSteps = steps.slice(0, MAX_STEPS);
  boundedSteps.forEach((s, i) => {
    s.order = i;
  });

  // ---- Sources: the real entities the steps draw from (deduped, deterministic) ----
  const sources: AnswerPlanSource[] = [];
  const seen: Record<AnswerPlanSource["kind"], Set<string>> = {
    memory: new Set(),
    journey: new Set(),
    chapter: new Set(),
    anchor: new Set(),
    theme: new Set(),
    person: new Set(),
    milestone: new Set(),
  };
  const addSource = (kind: AnswerPlanSource["kind"], refId: string, stepId: string | null): void => {
    if (seen[kind].has(refId)) return;
    seen[kind].add(refId);
    sources.push({ kind, refId, stepId });
  };

  // Non-memory sources from the steps (+ each memory's real biography chapter).
  const memoryFirstStep = new Map<string, string>();
  const memoryCandidates = new Set<string>();
  for (const step of boundedSteps) {
    for (const id of step.journeyIds) addSource("journey", id, step.id);
    for (const id of step.chapterIds) addSource("chapter", id, step.id);
    for (const id of step.anchorIds) addSource("anchor", id, step.id);
    for (const t of step.themeIds) addSource("theme", t, step.id);
    for (const id of step.personIds) addSource("person", id, step.id);
    for (const id of step.memoryIds) {
      if (!memoryFirstStep.has(id)) memoryFirstStep.set(id, step.id);
      memoryCandidates.add(id);
      const section = sectionOfMemory.get(id);
      if (section) for (const cid of section.chapterIds) addSource("chapter", cid, step.id);
    }
  }
  // Optional: real significant memories are worth including in the source pool.
  for (const sig of input.significantMemories ?? []) {
    if (understandingById.has(sig.id)) memoryCandidates.add(sig.id);
  }
  // Memory sources ranked by real graph connectivity, capped.
  const rankedMemories = [...memoryCandidates]
    .sort((a, b) => (graphDegree.get(b) ?? 0) - (graphDegree.get(a) ?? 0) || (a < b ? -1 : 1))
    .slice(0, MAX_MEMORY_SOURCES);
  for (const id of rankedMemories) addSource("memory", id, memoryFirstStep.get(id) ?? null);
  // Real life-story milestones are a standing part of the source pool.
  for (const milestone of input.lifeStory.milestones) addSource("milestone", milestone.id, null);
  // Optional: real favourite people.
  for (const fav of input.favourites ?? []) addSource("person", fav.id, null);

  // ---- Coverage (from the real distinct ids the steps retrieve) ----
  const distinctMemories = new Set<string>();
  const distinctJourneys = new Set<string>();
  const distinctThemes = new Set<MemoryTheme>();
  const distinctPersons = new Set<string>();
  for (const step of boundedSteps) {
    for (const id of step.memoryIds) distinctMemories.add(id);
    for (const id of step.journeyIds) distinctJourneys.add(id);
    for (const t of step.themeIds) distinctThemes.add(t);
    for (const id of step.personIds) distinctPersons.add(id);
  }
  const totalJourneys = input.journeyAnalysis.journeys.length || 1;
  const coverage: AnswerPlanCoverage = {
    memoryCoverage: clamp100((distinctMemories.size / totalMemories) * 100),
    journeyCoverage: clamp100((distinctJourneys.size / totalJourneys) * 100),
    themeCoverage: clamp100((distinctThemes.size / Math.max(1, input.reasoning.themes.length)) * 100),
    personCoverage: clamp100((distinctPersons.size / Math.max(1, peopleUniverse.size)) * 100),
    timelineCoverage: clamp100(input.lifeStory.story.continuity),
  };

  // ---- Context ----
  const avgConfidence =
    boundedSteps.length > 0
      ? boundedSteps.reduce((s, x) => s + x.confidence, 0) / boundedSteps.length
      : 0;
  const emotionalBoost = input.emotionalProfile ? input.emotionalProfile.memoryPreservation * 0.1 : 0;
  const relationshipBoost = Math.min(5, input.relationshipObservations?.length ?? 0);
  const confidence = clamp100(
    avgConfidence * 0.7 +
      input.conversationFoundation.context.confidence * 0.3 +
      emotionalBoost +
      relationshipBoost,
  );
  const distinctKinds = new Set(boundedSteps.map((s) => s.kind)).size;
  const executionDepth = clamp100(
    Math.min(60, boundedSteps.length * 5) + Math.min(40, distinctKinds * 6),
  );

  const context: AnswerPlanContext = {
    coverage: coverage.memoryCoverage,
    confidence,
    candidateCount: boundedSteps.length,
    sourceCount: sources.length,
    executionDepth,
  };

  // ---- Summary ----
  const summary: AnswerPlanSummary = {
    primaryIntent: boundedSteps[0]?.kind ?? null,
    primaryTheme: dominantTheme,
    primaryAnchor: dominantAnchor,
    coverage: context.coverage,
    confidence: context.confidence,
    planDepth: context.executionDepth,
  };

  return { steps: boundedSteps, sources, context, coverage, summary };
}
