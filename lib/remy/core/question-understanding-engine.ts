/**
 * Remy Platform (v2) — QUESTION UNDERSTANDING ENGINE (pure).
 *
 * This is NOT chat, NOT GPT, NOT an LLM, and it takes NO free-text question. It builds the
 * deterministic layer that a FUTURE conversational layer will use to convert a parsed user question
 * into structured RETRIEVAL INTENT over the existing Remy intelligence stack. It enumerates the
 * answerable retrieval intents (person / journey / theme / life-stage / relationship / timeline /
 * event / date / comparison / summary / memory / reference) and their REAL focus (structured ids),
 * structured constraints, and pointers to real entities — all derived from the conversation-foundation
 * / biography / reasoning / life-story / journey / graph / understanding layers.
 *
 * No natural language, no generated text, no prompts, no invented ids. A supported intent kind with no
 * real backing data (e.g. "place" — the schema stores no locations) simply yields ZERO intents rather
 * than a fabricated one. Internal only. PURE: no React/DOM/Supabase/fetch/timers/clock/Date/Math.random/
 * persistence/network/LLM.
 */
import type {
  BiographyAnalysis,
  ConversationFoundation,
  EmotionalProfile,
  FavouritePerson,
  Journey,
  JourneyAnalysis,
  LifeAnchor,
  LifeStage,
  LifeStoryAnalysis,
  LifeStoryChapter,
  MemoryGraph,
  MemoryTheme,
  MemoryUnderstanding,
  QuestionConstraint,
  QuestionContext,
  QuestionFocus,
  QuestionIntent,
  QuestionIntentKind,
  QuestionReference,
  QuestionSummary,
  QuestionUnderstanding,
  ReasoningAnalysis,
  RelationshipObservation,
  SignificantMemory,
} from "./family-types";

export interface QuestionUnderstandingInput {
  conversationFoundation: ConversationFoundation;
  biography: BiographyAnalysis;
  reasoning: ReasoningAnalysis;
  lifeStory: LifeStoryAnalysis;
  journeyAnalysis: JourneyAnalysis;
  graph: MemoryGraph;
  understandings: MemoryUnderstanding[];
  // --- Optional refinements (the layer is complete from the required layers alone) ---
  favourites?: FavouritePerson[];
  relationshipObservations?: RelationshipObservation[];
  significantMemories?: SignificantMemory[];
  emotionalProfile?: EmotionalProfile | null;
}

const MAX_PER_KIND = 4;
const MAX_INTENTS = 48;
const MAX_CONSTRAINTS = 24;
const MAX_MEMORY_REFS = 24;

const clamp100 = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

function emptyFocus(): QuestionFocus {
  return {
    memoryIds: [],
    journeyIds: [],
    chapterIds: [],
    anchorIds: [],
    themeIds: [],
    personIds: [],
    lifeStages: [],
  };
}

function makeFocus(partial: Partial<QuestionFocus>): QuestionFocus {
  return {
    memoryIds: [...new Set(partial.memoryIds ?? [])].sort(),
    journeyIds: [...new Set(partial.journeyIds ?? [])].sort(),
    chapterIds: [...new Set(partial.chapterIds ?? [])].sort(),
    anchorIds: [...new Set(partial.anchorIds ?? [])].sort(),
    themeIds: [...new Set(partial.themeIds ?? [])].sort(),
    personIds: [...new Set(partial.personIds ?? [])].sort(),
    lifeStages: [...new Set(partial.lifeStages ?? [])].sort(),
  };
}

function emptyUnderstanding(
  dominantTheme: MemoryTheme,
  dominantAnchor: string | null,
): QuestionUnderstanding {
  return {
    intents: [],
    focus: emptyFocus(),
    constraints: [],
    references: [],
    context: {
      focusCoverage: 0,
      confidence: 0,
      candidateCount: 0,
      referenceCount: 0,
      contextDepth: 0,
    },
    summary: { dominantIntent: null, dominantTheme, dominantAnchor, coverage: 0, confidence: 0 },
  };
}

export function buildQuestionUnderstanding(
  input: QuestionUnderstandingInput,
): QuestionUnderstanding {
  const journeys = input.journeyAnalysis.journeys;
  const topics = input.conversationFoundation.topics;
  const dominantTheme = input.reasoning.summary.dominantTheme;
  const dominantAnchor = input.reasoning.summary.dominantAnchor;
  if (journeys.length === 0 || topics.length === 0) {
    return emptyUnderstanding(dominantTheme, dominantAnchor);
  }

  const understandingById = new Map<string, MemoryUnderstanding>();
  for (const u of input.understandings) understandingById.set(u.id, u);
  const totalMemories = input.understandings.length || 1;

  const anchorById = new Map<string, LifeAnchor>();
  for (const a of input.reasoning.anchors) anchorById.set(a.id, a);
  const chapterById = new Map<string, LifeStoryChapter>();
  for (const c of input.lifeStory.chapters) chapterById.set(c.id, c);
  const journeyById = new Map<string, Journey>();
  for (const j of journeys) journeyById.set(j.id, j);

  const graphDegree = new Map<string, number>();
  for (const edge of input.graph.edges) {
    graphDegree.set(edge.source, (graphDegree.get(edge.source) ?? 0) + 1);
    graphDegree.set(edge.target, (graphDegree.get(edge.target) ?? 0) + 1);
  }

  const confidenceOf = (memoryIds: string[]): number => {
    let dated = 0;
    let withMedia = 0;
    let peopled = 0;
    for (const id of memoryIds) {
      const u = understandingById.get(id);
      if (!u) continue;
      if (u.historical) dated += 1;
      if (u.attachmentRichness > 0) withMedia += 1;
      if (u.relationship.participants > 0) peopled += 1;
    }
    const known = memoryIds.length || 1;
    return clamp100((dated / known) * 50 + (withMedia / known) * 30 + (peopled / known) * 20);
  };

  const intents: QuestionIntent[] = [];
  const perKind = new Map<QuestionIntentKind, number>();
  const push = (
    kind: QuestionIntentKind,
    idSlug: string,
    refId: string | null,
    focus: QuestionFocus,
    weight: number,
    confidence: number,
  ): void => {
    const used = perKind.get(kind) ?? 0;
    if (used >= (kind === "life-stage" ? 5 : MAX_PER_KIND)) return;
    perKind.set(kind, used + 1);
    intents.push({ id: `intent-${kind}-${idSlug}`, kind, refId, focus, weight, confidence });
  };

  // ---- Person / theme / life-stage intents from the real conversation topics ----
  const personTopics = topics.filter((t) => t.kind === "person");
  const themeTopicIntents: { theme: MemoryTheme; memoryIds: string[]; weight: number }[] = [];
  for (const topic of topics) {
    if (topic.kind === "person") {
      push(
        "person",
        topic.refId,
        topic.refId,
        makeFocus({ personIds: [topic.refId], memoryIds: topic.memoryIds, journeyIds: topic.journeyIds }),
        topic.weight,
        topic.confidence,
      );
    } else if (topic.kind === "theme") {
      push(
        "theme",
        topic.refId,
        topic.refId,
        makeFocus({ themeIds: [topic.refId as MemoryTheme], memoryIds: topic.memoryIds, journeyIds: topic.journeyIds }),
        topic.weight,
        topic.confidence,
      );
      themeTopicIntents.push({ theme: topic.refId as MemoryTheme, memoryIds: topic.memoryIds, weight: topic.weight });
    } else if (topic.kind === "anchor") {
      const anchor = anchorById.get(topic.refId);
      const theme = anchor ? anchor.theme : dominantTheme;
      push(
        "theme",
        theme,
        theme,
        makeFocus({
          themeIds: [theme],
          anchorIds: [topic.refId],
          memoryIds: topic.memoryIds,
          journeyIds: topic.journeyIds,
        }),
        topic.weight,
        topic.confidence,
      );
      themeTopicIntents.push({ theme, memoryIds: topic.memoryIds, weight: topic.weight });
    } else if (topic.kind === "life-stage") {
      push(
        "life-stage",
        topic.refId,
        topic.refId,
        makeFocus({
          lifeStages: [topic.refId as LifeStage],
          memoryIds: topic.memoryIds,
          journeyIds: topic.journeyIds,
        }),
        topic.weight,
        topic.confidence,
      );
    }
  }

  // ---- Relationship intents (structured relationship importance) ----
  for (const rel of input.reasoning.relationshipStrengths.slice(0, MAX_PER_KIND)) {
    push(
      "relationship",
      rel.personId,
      rel.personId,
      makeFocus({ personIds: [rel.personId] }),
      rel.strength,
      confidenceOf([]),
    );
  }

  // ---- Journey intents (top by significance) ----
  const journeysBySignificance = [...journeys].sort(
    (a, b) => b.significance - a.significance || (a.id < b.id ? -1 : 1),
  );
  for (const j of journeysBySignificance.slice(0, MAX_PER_KIND)) {
    push(
      "journey",
      j.id,
      j.id,
      makeFocus({ journeyIds: [j.id], memoryIds: j.memoryIds, themeIds: [j.dominantTheme], lifeStages: [j.lifeStage] }),
      j.significance,
      confidenceOf(j.memoryIds),
    );
  }

  // ---- Timeline intent (global) ----
  const allJourneyIds = journeys.map((j) => j.id);
  const allTimelineMemories: string[] = [];
  for (const j of journeys) for (const id of j.memoryIds) allTimelineMemories.push(id);
  push(
    "timeline",
    "all",
    null,
    makeFocus({ journeyIds: allJourneyIds, memoryIds: allTimelineMemories }),
    clamp100(input.lifeStory.story.continuity),
    confidenceOf(allTimelineMemories),
  );

  // ---- Date intents (real chapter year spans) ----
  const datedChapters = input.lifeStory.chapters
    .filter((c) => c.startYear > 0 && c.endYear > 0)
    .sort((a, b) => b.centrality - a.centrality || (a.id < b.id ? -1 : 1));
  for (const c of datedChapters.slice(0, MAX_PER_KIND)) {
    push(
      "date",
      `${c.startYear}-${c.endYear}`,
      `${c.startYear}-${c.endYear}`,
      makeFocus({ chapterIds: [c.id], memoryIds: c.memoryIds, lifeStages: [c.lifeStage] }),
      c.centrality,
      confidenceOf(c.memoryIds),
    );
  }

  // ---- Event intents (real life-story milestones) ----
  for (const milestone of input.lifeStory.milestones.slice(0, MAX_PER_KIND)) {
    const chapter = chapterById.get(milestone.chapterId);
    const memoryIds = milestone.memoryId ? [milestone.memoryId] : chapter ? chapter.memoryIds : [];
    push(
      "event",
      milestone.id,
      milestone.chapterId,
      makeFocus({ chapterIds: [milestone.chapterId], memoryIds, journeyIds: [milestone.journeyId] }),
      chapter ? chapter.centrality : 40,
      confidenceOf(memoryIds),
    );
  }

  // ---- Memory intents (real significant memories first, then the most-connected memories) ----
  const significantSet = new Set<string>();
  const memoryCandidates: string[] = [];
  for (const sig of input.significantMemories ?? []) {
    if (!understandingById.has(sig.id) || significantSet.has(sig.id)) continue;
    significantSet.add(sig.id);
    memoryCandidates.push(sig.id);
  }
  const seenMemoryCandidate = new Set<string>(memoryCandidates);
  const connectedMemories = [...graphDegree.entries()]
    .filter(([id]) => understandingById.has(id))
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  for (const [id] of connectedMemories) {
    if (seenMemoryCandidate.has(id)) continue;
    seenMemoryCandidate.add(id);
    memoryCandidates.push(id);
  }
  for (const memoryId of memoryCandidates.slice(0, MAX_PER_KIND)) {
    const degree = graphDegree.get(memoryId) ?? 0;
    const base = significantSet.has(memoryId) ? 45 : 25;
    push(
      "memory",
      memoryId,
      memoryId,
      makeFocus({ memoryIds: [memoryId] }),
      clamp100(base + Math.min(40, degree * 4)),
      confidenceOf([memoryId]),
    );
  }

  // ---- Comparison intents (top-2 people, top-2 themes) — deterministic ----
  if (personTopics.length >= 2) {
    const a = personTopics[0];
    const b = personTopics[1];
    push(
      "comparison",
      "people",
      null,
      makeFocus({
        personIds: [a.refId, b.refId],
        memoryIds: [...a.memoryIds, ...b.memoryIds],
      }),
      clamp100((a.weight + b.weight) / 2),
      confidenceOf([...a.memoryIds, ...b.memoryIds]),
    );
  }
  if (themeTopicIntents.length >= 2) {
    const sorted = [...themeTopicIntents].sort((x, y) => y.weight - x.weight || (x.theme < y.theme ? -1 : 1));
    const a = sorted[0];
    const b = sorted[1];
    push(
      "comparison",
      "themes",
      null,
      makeFocus({ themeIds: [a.theme, b.theme], memoryIds: [...a.memoryIds, ...b.memoryIds] }),
      clamp100((a.weight + b.weight) / 2),
      confidenceOf([...a.memoryIds, ...b.memoryIds]),
    );
  }

  // ---- Reference intents (pointers to the real structural anchors) ----
  for (const anchor of input.reasoning.anchors.slice(0, MAX_PER_KIND)) {
    push(
      "reference",
      anchor.id,
      anchor.id,
      makeFocus({
        anchorIds: [anchor.id],
        themeIds: [anchor.theme],
        memoryIds: anchor.memoryIds,
        journeyIds: anchor.journeyIds,
      }),
      anchor.strength,
      anchor.confidence,
    );
  }

  // ---- Summary intent (global) ----
  push(
    "summary",
    "all",
    null,
    makeFocus({ journeyIds: allJourneyIds, themeIds: input.reasoning.themes.map((t) => t.theme) }),
    clamp100(input.reasoning.summary.confidence),
    clamp100(input.reasoning.summary.confidence),
  );

  intents.sort((a, b) => b.weight - a.weight || (a.id < b.id ? -1 : 1));
  const boundedIntents = intents.slice(0, MAX_INTENTS);

  // ---- Aggregate focus across the retained intents ----
  const agg = {
    memoryIds: new Set<string>(),
    journeyIds: new Set<string>(),
    chapterIds: new Set<string>(),
    anchorIds: new Set<string>(),
    themeIds: new Set<MemoryTheme>(),
    personIds: new Set<string>(),
    lifeStages: new Set<LifeStage>(),
  };
  for (const intent of boundedIntents) {
    for (const id of intent.focus.memoryIds) agg.memoryIds.add(id);
    for (const id of intent.focus.journeyIds) agg.journeyIds.add(id);
    for (const id of intent.focus.chapterIds) agg.chapterIds.add(id);
    for (const id of intent.focus.anchorIds) agg.anchorIds.add(id);
    for (const t of intent.focus.themeIds) agg.themeIds.add(t);
    for (const id of intent.focus.personIds) agg.personIds.add(id);
    for (const s of intent.focus.lifeStages) agg.lifeStages.add(s);
  }
  const focus = makeFocus({
    memoryIds: [...agg.memoryIds],
    journeyIds: [...agg.journeyIds],
    chapterIds: [...agg.chapterIds],
    anchorIds: [...agg.anchorIds],
    themeIds: [...agg.themeIds],
    personIds: [...agg.personIds],
    lifeStages: [...agg.lifeStages],
  });

  // ---- Constraints (structured only) ----
  const constraints: QuestionConstraint[] = [];
  if (input.lifeStory.story.startYear > 0 && input.lifeStory.story.endYear > 0) {
    constraints.push({
      kind: "date-range",
      startYear: input.lifeStory.story.startYear,
      endYear: input.lifeStory.story.endYear,
      lifeStage: null,
      refId: null,
    });
  }
  for (const stage of focus.lifeStages) {
    constraints.push({ kind: "life-stage", startYear: 0, endYear: 0, lifeStage: stage, refId: null });
  }
  for (const personId of focus.personIds.slice(0, MAX_PER_KIND)) {
    constraints.push({ kind: "person", startYear: 0, endYear: 0, lifeStage: null, refId: personId });
  }
  for (const theme of focus.themeIds.slice(0, MAX_PER_KIND)) {
    constraints.push({ kind: "theme", startYear: 0, endYear: 0, lifeStage: null, refId: theme });
  }
  for (const journeyId of focus.journeyIds.slice(0, MAX_PER_KIND)) {
    constraints.push({ kind: "journey", startYear: 0, endYear: 0, lifeStage: null, refId: journeyId });
  }
  const boundedConstraints = constraints.slice(0, MAX_CONSTRAINTS);

  // ---- References (pointers to real entities) ----
  const references: QuestionReference[] = [];
  const referencedPeople = new Set<string>();
  for (const id of focus.personIds) {
    referencedPeople.add(id);
    references.push({ kind: "person", refId: id, intentId: null });
  }
  // Real favourite people are always worth referencing (deduped against the focus set).
  for (const fav of input.favourites ?? []) {
    if (referencedPeople.has(fav.id)) continue;
    referencedPeople.add(fav.id);
    references.push({ kind: "person", refId: fav.id, intentId: null });
  }
  for (const t of focus.themeIds) references.push({ kind: "theme", refId: t, intentId: null });
  for (const id of focus.anchorIds) references.push({ kind: "anchor", refId: id, intentId: null });
  for (const id of focus.journeyIds) references.push({ kind: "journey", refId: id, intentId: null });
  for (const id of focus.chapterIds) references.push({ kind: "chapter", refId: id, intentId: null });
  for (const id of focus.memoryIds.slice(0, MAX_MEMORY_REFS)) {
    references.push({ kind: "memory", refId: id, intentId: null });
  }

  // ---- Context + Summary ----
  const avgConfidence =
    boundedIntents.length > 0
      ? boundedIntents.reduce((s, i) => s + i.confidence, 0) / boundedIntents.length
      : 0;
  const emotionalBoost = input.emotionalProfile ? input.emotionalProfile.memoryPreservation * 0.1 : 0;
  const relationshipBoost = Math.min(5, input.relationshipObservations?.length ?? 0);
  const confidence = clamp100(avgConfidence + emotionalBoost + relationshipBoost);
  const distinctKinds = new Set(boundedIntents.map((i) => i.kind)).size;
  const contextDepth = clamp100(
    Math.min(60, boundedIntents.length * 4) + Math.min(40, distinctKinds * 6),
  );

  const context: QuestionContext = {
    focusCoverage: clamp100((focus.memoryIds.length / totalMemories) * 100),
    confidence,
    candidateCount: boundedIntents.length,
    referenceCount: references.length,
    contextDepth,
  };

  const summary: QuestionSummary = {
    dominantIntent: boundedIntents[0]?.kind ?? null,
    dominantTheme,
    dominantAnchor,
    coverage: context.focusCoverage,
    confidence: context.confidence,
  };

  return { intents: boundedIntents, focus, constraints: boundedConstraints, references, context, summary };
}
