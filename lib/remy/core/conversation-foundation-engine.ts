/**
 * Remy Platform (v2) — CONVERSATION FOUNDATION ENGINE (pure).
 *
 * This is NOT chat, NOT GPT, NOT an AI response, NOT generated text. It builds the deterministic,
 * structured FOUNDATION a future conversational layer will consume: the REAL recurring subjects a
 * family's memories are about (topics), the real memory collections behind each subject grouped by
 * chapter (threads), pointers to the real entities involved (references), and structured coverage
 * metrics — all derived from the journey / life-story / reasoning / biography / graph / understanding
 * layers. No prompts, no narration, no generated sentences, no fabricated topics/memories/people.
 *
 * REQUIRED inputs are the journey / life-story / reasoning / biography / graph / understanding layers;
 * the favourite / relationship / significant / emotional outputs are OPTIONAL refinements. Internal
 * only — nothing renders. PURE: no React/DOM/Supabase/fetch/timers/clock/Date/Math.random/persistence/
 * network/LLM.
 */
import type {
  BiographyAnalysis,
  BiographySection,
  ConversationContext,
  ConversationFoundation,
  ConversationReference,
  ConversationSummary,
  ConversationThread,
  ConversationTopic,
  EmotionalProfile,
  FavouritePerson,
  JourneyAnalysis,
  LifeStage,
  LifeStoryAnalysis,
  MemoryGraph,
  MemoryTheme,
  MemoryUnderstanding,
  ReasoningAnalysis,
  RelationshipObservation,
  SignificantMemory,
} from "./family-types";

export interface ConversationFoundationInput {
  journeyAnalysis: JourneyAnalysis;
  lifeStory: LifeStoryAnalysis;
  reasoning: ReasoningAnalysis;
  biography: BiographyAnalysis;
  graph: MemoryGraph;
  understandings: MemoryUnderstanding[];
  // --- Optional refinements (the foundation is complete from the required layers alone) ---
  favourites?: FavouritePerson[];
  relationshipObservations?: RelationshipObservation[];
  significantMemories?: SignificantMemory[];
  emotionalProfile?: EmotionalProfile | null;
}

/** A subject must recur across at least this many real memories to be a topic. */
const MIN_TOPIC_MEMORIES = 3;
/** A topic must touch a chapter with at least this many shared memories to open a thread. */
const MIN_THREAD_MEMORIES = 2;
const MAX_TOPICS = 16;
const MAX_THREADS = 40;
const MAX_PEOPLE_TOPICS = 8;
const MAX_MEMORY_REFS = 24;
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

function emptyFoundation(
  dominantTheme: MemoryTheme,
  dominantAnchor: string | null,
): ConversationFoundation {
  return {
    topics: [],
    threads: [],
    references: [],
    context: {
      topicCount: 0,
      threadCount: 0,
      memoryCoverage: 0,
      journeyCoverage: 0,
      conversationDepth: 0,
      confidence: 0,
    },
    summary: { dominantTopic: null, dominantAnchor, dominantTheme, coverage: 0, confidence: 0 },
  };
}

export function buildConversationFoundation(
  input: ConversationFoundationInput,
): ConversationFoundation {
  const journeys = input.journeyAnalysis.journeys;
  const sections = input.biography.sections;
  const dominantTheme = input.reasoning.summary.dominantTheme;
  const dominantAnchor = input.reasoning.summary.dominantAnchor;
  if (journeys.length === 0 || sections.length === 0) {
    return emptyFoundation(dominantTheme, dominantAnchor);
  }

  const understandingById = new Map<string, MemoryUnderstanding>();
  for (const u of input.understandings) understandingById.set(u.id, u);
  const totalMemories = input.understandings.length || 1;

  const journeyOfMemory = new Map<string, string>();
  for (const j of journeys) for (const id of j.memoryIds) journeyOfMemory.set(id, j.id);
  const totalJourneyMemories = journeys.reduce((s, j) => s + j.memoryIds.length, 0) || 1;

  // A memory belongs to exactly one biography section (sections partition the chaptered journeys).
  const sectionOfMemory = new Map<string, BiographySection>();
  for (const section of sections) {
    for (const id of section.memoryIds) sectionOfMemory.set(id, section);
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
  const journeyIdsFor = (memoryIds: string[]): string[] => {
    const set = new Set<string>();
    for (const id of memoryIds) {
      const jid = journeyOfMemory.get(id);
      if (jid) set.add(jid);
    }
    return [...set].sort();
  };

  // ---- Topics: real recurring subjects (anchor / theme / person / life-stage) ----
  const topics: ConversationTopic[] = [];
  const anchorThemes = new Set<MemoryTheme>();

  // Anchors (structural pillars — already ranked by strength).
  for (const anchor of input.reasoning.anchors) {
    anchorThemes.add(anchor.theme);
    const memoryIds = [...anchor.memoryIds].sort();
    topics.push({
      id: `topic-anchor-${anchor.id}`,
      kind: "anchor",
      refId: anchor.id,
      memoryIds,
      journeyIds: [...anchor.journeyIds].sort(),
      weight: anchor.strength,
      confidence: anchor.confidence,
    });
  }

  // Themes that did not reach anchor status but still recur (real journey distribution).
  const byTheme = new Map<MemoryTheme, Set<string>>();
  const journeysByTheme = new Map<MemoryTheme, Set<string>>();
  for (const j of journeys) {
    let mem = byTheme.get(j.dominantTheme);
    if (!mem) {
      mem = new Set<string>();
      byTheme.set(j.dominantTheme, mem);
    }
    for (const id of j.memoryIds) mem.add(id);
    let js = journeysByTheme.get(j.dominantTheme);
    if (!js) {
      js = new Set<string>();
      journeysByTheme.set(j.dominantTheme, js);
    }
    js.add(j.id);
  }
  for (const theme of [...byTheme.keys()].sort()) {
    if (theme === "other" || anchorThemes.has(theme)) continue;
    const memSet = byTheme.get(theme)!;
    if (memSet.size < MIN_TOPIC_MEMORIES) continue;
    const memoryIds = [...memSet].sort();
    topics.push({
      id: `topic-theme-${theme}`,
      kind: "theme",
      refId: theme,
      memoryIds,
      journeyIds: [...(journeysByTheme.get(theme) ?? new Set<string>())].sort(),
      weight: clamp100((memSet.size / totalJourneyMemories) * 100),
      confidence: confidenceOf(memoryIds),
    });
  }

  // People (greatest real influence) — reasoning.influences is already ranked; favourites augment.
  const personMemories = new Map<string, Set<string>>();
  for (const u of input.understandings) {
    for (const p of peopleOf(u)) {
      let set = personMemories.get(p);
      if (!set) {
        set = new Set<string>();
        personMemories.set(p, set);
      }
      set.add(u.id);
    }
  }
  const personTopicIds = new Set<string>();
  const addPersonTopic = (personId: string, weight: number): void => {
    if (personTopicIds.size >= MAX_PEOPLE_TOPICS || personTopicIds.has(personId)) return;
    const memSet = personMemories.get(personId);
    if (!memSet || memSet.size < MIN_TOPIC_MEMORIES) return;
    personTopicIds.add(personId);
    const memoryIds = [...memSet].sort();
    topics.push({
      id: `topic-person-${personId}`,
      kind: "person",
      refId: personId,
      memoryIds,
      journeyIds: journeyIdsFor(memoryIds),
      weight,
      confidence: confidenceOf(memoryIds),
    });
  };
  for (const influence of input.reasoning.influences) addPersonTopic(influence.personId, influence.influence);
  for (const fav of input.favourites ?? []) addPersonTopic(fav.id, clamp100(fav.score));

  // Life stages present (real understanding distribution).
  const stageMemories = new Map<LifeStage, string[]>();
  for (const u of input.understandings) {
    if (u.lifeStage === "unknown") continue;
    const list = stageMemories.get(u.lifeStage);
    if (list) list.push(u.id);
    else stageMemories.set(u.lifeStage, [u.id]);
  }
  for (const stage of LIFE_STAGE_ORDER) {
    const list = stageMemories.get(stage);
    if (!list || list.length < MIN_TOPIC_MEMORIES) continue;
    const memoryIds = [...list].sort();
    topics.push({
      id: `topic-stage-${stage}`,
      kind: "life-stage",
      refId: stage,
      memoryIds,
      journeyIds: journeyIdsFor(memoryIds),
      weight: clamp100((list.length / totalMemories) * 100),
      confidence: confidenceOf(memoryIds),
    });
  }

  topics.sort((a, b) => b.weight - a.weight || (a.id < b.id ? -1 : 1));
  const boundedTopics = topics.slice(0, MAX_TOPICS);

  // ---- Threads: a topic's memories grouped by the real chapter they live in ----
  const threads: ConversationThread[] = [];
  for (const topic of boundedTopics) {
    const bySection = new Map<string, { section: BiographySection; memoryIds: string[] }>();
    for (const id of topic.memoryIds) {
      const section = sectionOfMemory.get(id);
      if (!section) continue;
      let bucket = bySection.get(section.id);
      if (!bucket) {
        bucket = { section, memoryIds: [] };
        bySection.set(section.id, bucket);
      }
      bucket.memoryIds.push(id);
    }
    const topicMemCount = topic.memoryIds.length || 1;
    for (const sectionId of [...bySection.keys()].sort()) {
      const bucket = bySection.get(sectionId)!;
      if (bucket.memoryIds.length < MIN_THREAD_MEMORIES) continue;
      const memoryIds = [...bucket.memoryIds].sort();
      threads.push({
        id: `thread-${topic.id}-${bucket.section.id}`,
        topicId: topic.id,
        memoryIds,
        journeyIds: journeyIdsFor(memoryIds),
        chapterIds: bucket.section.chapterIds,
        lifeStage: bucket.section.lifeStage,
        confidence: bucket.section.confidence,
        coverage: clamp100((memoryIds.length / topicMemCount) * 100),
      });
    }
  }
  threads.sort((a, b) => b.coverage - a.coverage || (a.id < b.id ? -1 : 1));
  const boundedThreads = threads.slice(0, MAX_THREADS);

  // ---- References: pointers to real entities (dedup, deterministic order) ----
  const references: ConversationReference[] = [];
  for (const topic of boundedTopics) {
    if (topic.kind === "anchor") references.push({ kind: "anchor", refId: topic.refId, topicId: topic.id });
    else if (topic.kind === "theme") references.push({ kind: "theme", refId: topic.refId, topicId: topic.id });
    else if (topic.kind === "person") references.push({ kind: "person", refId: topic.refId, topicId: topic.id });
  }
  const seenJourney = new Set<string>();
  const seenChapter = new Set<string>();
  const seenMemory = new Set<string>();
  for (const thread of boundedThreads) {
    for (const jid of thread.journeyIds) {
      if (seenJourney.has(jid)) continue;
      seenJourney.add(jid);
      references.push({ kind: "journey", refId: jid, topicId: thread.topicId });
    }
    for (const cid of thread.chapterIds) {
      if (seenChapter.has(cid)) continue;
      seenChapter.add(cid);
      references.push({ kind: "chapter", refId: cid, topicId: thread.topicId });
    }
    for (const mid of thread.memoryIds) {
      if (seenMemory.size >= MAX_MEMORY_REFS || seenMemory.has(mid)) continue;
      seenMemory.add(mid);
      references.push({ kind: "memory", refId: mid, topicId: thread.topicId });
    }
  }
  for (const sig of input.significantMemories ?? []) {
    if (seenMemory.size >= MAX_MEMORY_REFS || seenMemory.has(sig.id)) continue;
    seenMemory.add(sig.id);
    references.push({ kind: "memory", refId: sig.id, topicId: null });
  }

  // ---- Context ----
  const memoriesInThreads = new Set<string>();
  for (const thread of boundedThreads) for (const id of thread.memoryIds) memoriesInThreads.add(id);
  const journeysInTopics = new Set<string>();
  for (const topic of boundedTopics) for (const jid of topic.journeyIds) journeysInTopics.add(jid);

  const avgTopicConfidence =
    boundedTopics.length > 0
      ? boundedTopics.reduce((s, t) => s + t.confidence, 0) / boundedTopics.length
      : 0;
  const emotionalBoost = input.emotionalProfile ? input.emotionalProfile.relationshipHealth * 0.15 : 0;
  const relationshipBoost = Math.min(6, input.relationshipObservations?.length ?? 0);
  const confidence = clamp100(avgTopicConfidence + emotionalBoost + relationshipBoost);

  const conversationDepth = clamp100(
    Math.min(55, boundedTopics.length * 7) + Math.min(45, boundedThreads.length * 4),
  );

  const context: ConversationContext = {
    topicCount: boundedTopics.length,
    threadCount: boundedThreads.length,
    memoryCoverage: clamp100((memoriesInThreads.size / totalMemories) * 100),
    journeyCoverage: clamp100((journeysInTopics.size / journeys.length) * 100),
    conversationDepth,
    confidence,
  };

  // ---- Summary ----
  const summary: ConversationSummary = {
    dominantTopic: boundedTopics[0]?.id ?? null,
    dominantAnchor,
    dominantTheme,
    coverage: context.memoryCoverage,
    confidence: context.confidence,
  };

  return { topics: boundedTopics, threads: boundedThreads, references, context, summary };
}
