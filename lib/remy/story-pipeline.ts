/**
 * Remy Platform (v2) — STORY CONVERSATION PIPELINE (Phase 25 — pure orchestrator).
 *
 * A PURE, deterministic orchestrator that runs the EXISTING companion-platform engines, in the EXACT same
 * order RemyRelationship already uses, to produce the three inputs `executeConversation` needs
 * (`{ conversationComposition, conversationRender, answerAssembly }`). This is NOT a new pipeline, a new
 * engine, or new intelligence — it only SEQUENCES the already-shipped engines so the server-side "narrate my
 * story" surface can produce the deterministic inputs WITHOUT touching the app-open path (RemyRelationship
 * keeps its own inline sequence, unchanged).
 *
 * It performs NO intelligence beyond the engines it calls, makes NO network/LLM/DB call, and is fully
 * deterministic (byte-identical output for the same snapshot). The caller (a server action) loads the
 * workspace-scoped snapshot from the database and passes it in — this module never touches IO. The prompt
 * that ultimately reaches the provider is therefore built SERVER-SIDE from real, workspace-scoped data (never
 * supplied by the client).
 *
 * PURE: no React/DOM/Supabase/fetch/timers/clock/Date/Math.random/persistence/network.
 */
import { buildMemoryUnderstanding } from "@/lib/remy/core/memory-understanding-engine";
import { buildMemoryGraph } from "@/lib/remy/core/memory-graph-engine";
import { buildJourneys } from "@/lib/remy/core/journey-engine";
import { buildLifeStory } from "@/lib/remy/core/life-story-engine";
import { buildReasoning } from "@/lib/remy/core/reasoning-engine";
import { buildBiography } from "@/lib/remy/core/biography-engine";
import { buildConversationFoundation } from "@/lib/remy/core/conversation-foundation-engine";
import { buildQuestionUnderstanding } from "@/lib/remy/core/question-understanding-engine";
import { buildAnswerPlan } from "@/lib/remy/core/answer-planning-engine";
import { buildAnswerAssembly } from "@/lib/remy/core/answer-assembly-engine";
import { buildConversationRender } from "@/lib/remy/core/conversation-rendering-engine";
import { buildConversationComposition } from "@/lib/remy/core/conversation-composer-engine";
import type { DatedMemory, FamilyPerson } from "@/lib/remy/core/family-types";
import type { ConversationExecutionInput } from "@/lib/remy/providers/conversation-execution";

/** The real, workspace-scoped data the deterministic pipeline consumes (loaded server-side by the caller). */
export interface StorySnapshot {
  people: FamilyPerson[];
  datedMemories: DatedMemory[];
}

/**
 * Run the existing deterministic companion pipeline (memory-understanding → memory-graph → journey →
 * life-story → reasoning → biography → conversation-foundation → question-understanding → answer-planning →
 * answer-assembly → conversation-rendering → conversation-composer) over the snapshot and return exactly the
 * `{ conversationComposition, conversationRender, answerAssembly }` that `executeConversation` consumes. The
 * order + engine inputs mirror RemyRelationship's inline sequence 1:1 (no divergence, no new intelligence).
 */
export function buildStoryConversationInputs(snapshot: StorySnapshot): ConversationExecutionInput {
  const { people, datedMemories } = snapshot;

  const understandings = buildMemoryUnderstanding(datedMemories, {
    personImportance: new Map(people.map((p) => [p.id, p.memoryCount] as const)),
  });
  const graph = buildMemoryGraph(understandings);
  const journeyAnalysis = buildJourneys({ understandings, graph });
  const lifeStory = buildLifeStory({ journeyAnalysis, graph, understandings });
  const reasoning = buildReasoning({ journeyAnalysis, lifeStory, graph, understandings });
  const biography = buildBiography({ journeyAnalysis, lifeStory, reasoning, graph, understandings });
  const conversationFoundation = buildConversationFoundation({
    journeyAnalysis,
    lifeStory,
    reasoning,
    biography,
    graph,
    understandings,
  });
  const questionUnderstanding = buildQuestionUnderstanding({
    conversationFoundation,
    biography,
    reasoning,
    lifeStory,
    journeyAnalysis,
    graph,
    understandings,
  });
  const answerPlan = buildAnswerPlan({
    questionUnderstanding,
    conversationFoundation,
    biography,
    reasoning,
    lifeStory,
    journeyAnalysis,
    graph,
    understandings,
  });
  const answerAssembly = buildAnswerAssembly({
    answerPlan,
    questionUnderstanding,
    conversationFoundation,
    biography,
    reasoning,
    lifeStory,
    journeyAnalysis,
    graph,
    understandings,
  });
  const conversationRender = buildConversationRender({ answerAssembly });
  const conversationComposition = buildConversationComposition({ conversationRender, answerAssembly });

  return { conversationComposition, conversationRender, answerAssembly };
}
