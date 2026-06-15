"use server";

import { createClient } from "@/utils/supabase/server";
import { resolveActiveProfileId } from "@/lib/context-resolver";
import {
  retrieveAskResults,
  type AskRetrievalResults,
} from "@/lib/remy/ask-retrieval";
import { retrievePersonAware } from "@/lib/remy/person-retrieval";
import {
  detectRelationshipIntent,
  answerAggregateRelationship,
  buildPersonRelationshipContext,
  formatPersonRelationshipFacts,
} from "@/lib/remy/relationship-intelligence";
import {
  answerAskQuestion,
  buildAskContext,
  contextSize,
} from "@/lib/remy/ask-intelligence";
import type { AskIntent, RemyConversationTurn } from "@/lib/remy/ask-intent";
import type { RetrievalQuery } from "@/lib/remy/retrieval";

const MAX_QUESTION_LENGTH = 500;

/** Grounded answer result. `answer` is null when nothing was retrieved or the AI failed. */
export interface AskAnswer {
  answer: string | null;
  count: number;
  failed: boolean;
  /** People resolved from the query (Phase C4). For logging/explainability/future use — NOT shown in UI yet. */
  matchedPersonIds: string[];
  matchedPersonNames: string[];
}

const EMPTY_ANSWER: AskAnswer = {
  answer: null,
  count: 0,
  failed: false,
  matchedPersonIds: [],
  matchedPersonNames: [],
};

/**
 * Server action: run a parsed RetrievalQuery through the deterministic Retrieval
 * Engine, scoped to the active workspace (RLS scopes by account). Returns factual
 * memory candidates only — no AI, no generation, no summaries. The query fields
 * are used by filterMemories (pure JS) and never interpolated into SQL.
 */
export async function askRemyRetrieval(
  query: RetrievalQuery,
): Promise<AskRetrievalResults> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { results: [] };

  const memoryProfileId = await resolveActiveProfileId();
  return retrieveAskResults(supabase, query, memoryProfileId);
}

/**
 * Server action: answer a question or produce a summary GROUNDED in memories
 * retrieved by the deterministic engine. Safety invariants:
 *   - Retrieval always runs first and is workspace-scoped (no cross-workspace
 *     leakage, no retrieval bypass).
 *   - If retrieval returns nothing, the AI is NOT called (count 0, answer null).
 *   - The model only ever sees the retrieved context (grounded, no fabrication).
 *   - AI failures degrade to a safe message, never an unhandled error.
 */
export async function answerAskRemy(
  question: string,
  query: RetrievalQuery,
  mode: AskIntent,
  options?: { history?: RemyConversationTurn[]; retrievalText?: string },
): Promise<AskAnswer> {
  const trimmed = (question ?? "").trim().slice(0, MAX_QUESTION_LENGTH);
  if (!trimmed) return EMPTY_ANSWER;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY_ANSWER;

  const memoryProfileId = await resolveActiveProfileId();

  // RETRIEVAL HAPPENS EVERY TURN. For a follow-up ("tell me more"), the client
  // passes the prior topic as `retrievalText` so the fresh retrieval is about that
  // topic — history is NEVER the source of facts, only an aid to interpret intent.
  const retrievalText =
    (options?.retrievalText ?? question).trim().slice(0, MAX_QUESTION_LENGTH) || trimmed;

  // RELATIONSHIP INTELLIGENCE (Phase C5). Aggregate questions ("who do I mention
  // most?", "who do I spend the most time with?") get a DETERMINISTIC answer built
  // from real mention/co-occurrence counts + cited memory titles — no LLM, no
  // inference, no profiling. Owner+workspace scoped; read-only.
  const relIntent = detectRelationshipIntent(retrievalText);
  if (relIntent?.kind === "aggregate") {
    const agg = await answerAggregateRelationship(
      supabase,
      { type: relIntent.type },
      user.id,
      memoryProfileId,
    );
    return {
      answer: agg.text,
      count: agg.count,
      failed: false,
      matchedPersonIds: agg.personIds,
      matchedPersonNames: agg.personNames,
    };
  }

  // PERSON-AWARE retrieval (Phase C4): hybrid (semantic + deterministic) UNION
  // person-linked memories, person-boosted. Additive — a query naming no known
  // person returns exactly the hybrid result. Workspace/owner scoped; no new AI call.
  const { records, matchedPersonIds, matchedPersonNames } = await retrievePersonAware(
    supabase,
    retrievalText,
    query,
    user.id,
    memoryProfileId,
  );

  // No memories retrieved → do NOT call the AI (no fabrication possible).
  if (records.length === 0) {
    return { ...EMPTY_ANSWER, matchedPersonIds, matchedPersonNames };
  }

  let context = buildAskContext(records);
  const count = contextSize(records);

  // C5: a single-person relationship question ("tell me about my relationship with
  // Dad") gets its grounded context enriched with FACTUAL metrics (counts/dates/
  // co-occurrence only). Best-effort — never blocks the answer.
  if (relIntent?.kind === "person" && matchedPersonIds.length >= 1) {
    try {
      const relCtx = await buildPersonRelationshipContext(
        supabase,
        matchedPersonIds[0],
        user.id,
        memoryProfileId,
      );
      const facts = formatPersonRelationshipFacts(relCtx);
      if (facts) context = `${context}\n\n${facts}`;
    } catch {
      // relationship enrichment is best-effort; the grounded answer proceeds without it.
    }
  }

  // Explainability/observability (no UI). Log COUNTS only — never the person names
  // (PII) — to keep memory-derived identities out of server logs.
  console.info("[ask-remy] person-aware retrieval", {
    matchedPersonCount: matchedPersonIds.length,
    personLinked: records.filter((r) => r.retrievalReasons?.includes("person_match")).length,
    total: records.length,
  });

  try {
    const answer = await answerAskQuestion(trimmed, context, mode, options?.history ?? []);
    if (!answer) return { answer: null, count, failed: true, matchedPersonIds, matchedPersonNames };
    return { answer, count, failed: false, matchedPersonIds, matchedPersonNames };
  } catch {
    return { answer: null, count, failed: true, matchedPersonIds, matchedPersonNames };
  }
}
