import type { createClient } from "@/utils/supabase/server";
import { generateEmbedding } from "@/lib/embeddings";
import {
  mergeAndRankCandidates,
  MEMORY_SELECT_FIELDS,
  type MemoryRecord,
  type RetrievalQuery,
} from "@/lib/remy/retrieval";
import { retrieveAskRecords } from "@/lib/remy/ask-retrieval";

/**
 * Ask Remy Intelligence V1.3 — hybrid semantic retrieval (SERVER ONLY).
 *
 * Semantic recall is the PRIMARY mechanism; the deterministic engine
 * (retrieveAskRecords) remains the fallback floor. This module imports the
 * OpenAI-backed embeddings client, so it must never be imported by a client
 * component — only the "use server" action app/(app)/remy/ask-action.ts uses it.
 *
 * Workspace isolation is enforced exactly like the production semantic-search
 * path (app/api/memories/search/route.ts:265-340): match_memories is used ONLY
 * for vector ranking (it is account-scoped and cannot scope to a workspace), then
 * candidate ids are re-fetched with the active memory_profile_id scope, dropping
 * any out-of-workspace rows. No RPC/schema change.
 */
type RemySupabase = Awaited<ReturnType<typeof createClient>>;

/** Mirror the production semantic-search tuning. */
const SEMANTIC_MATCH_THRESHOLD = 0.2;
/** Over-fetch account-wide candidates, then scope down to the workspace. */
const SEMANTIC_RANK_CANDIDATES = 100;

/**
 * Semantically rank the account's memories, then re-fetch the candidates scoped
 * to the active workspace (memory_profile_id). Returns workspace-scoped records
 * with `similarity` attached. Returns [] (so the caller falls back) when the
 * query can't be embedded, the RPC errors, or nothing matches — never throws.
 */
export async function semanticRetrieveScoped(
  supabase: RemySupabase,
  question: string,
  userId: string,
  memoryProfileId: string | null,
): Promise<MemoryRecord[]> {
  const embedding = await generateEmbedding(question);
  if (!embedding || embedding.length === 0) return [];

  // 1) Rank only — account-scoped; cannot scope to a workspace.
  const { data: ranked, error } = await supabase.rpc("match_memories", {
    query_embedding: embedding,
    match_threshold: SEMANTIC_MATCH_THRESHOLD,
    match_count: SEMANTIC_RANK_CANDIDATES,
    user_id_input: userId,
  });
  if (error) return [];

  const rankedRows = Array.isArray(ranked)
    ? (ranked as Array<{ id?: string; similarity?: number }>)
    : [];
  const similarityById = new Map<string, number>();
  for (const row of rankedRows) {
    if (typeof row.id === "string") {
      similarityById.set(row.id, typeof row.similarity === "number" ? row.similarity : 0);
    }
  }
  const ids = [...similarityById.keys()];
  if (ids.length === 0) return [];

  // 2) Scope to the active workspace — the single authoritative discriminator.
  //    Drops every out-of-workspace candidate (personal <-> care, care <-> care).
  let scoped = supabase
    .from("memories")
    .select(MEMORY_SELECT_FIELDS)
    .eq("user_id", userId)
    .in("id", ids);
  scoped = memoryProfileId
    ? scoped.eq("memory_profile_id", memoryProfileId)
    : scoped.is("memory_profile_id", null);

  const { data: rows } = await scoped;
  return ((rows ?? []) as MemoryRecord[]).map((row) => ({
    ...row,
    similarity: similarityById.get(row.id) ?? 0,
  }));
}

/**
 * Hybrid retrieval: semantic recall (primary) UNION deterministic (fallback +
 * coverage for un-embedded memories), blended-ranked. Identical contract to
 * retrieveAskRecords (Promise<MemoryRecord[]>), so all downstream behavior —
 * buildAskContext, contextSize, and the no-AI-on-empty guard in ask-action — is
 * unchanged. When semantic adds nothing (no embedding/RPC error/no matches), the
 * result is exactly the deterministic set, preserving current Ask Remy behavior.
 */
export async function retrieveAskRecordsHybrid(
  supabase: RemySupabase,
  question: string,
  query: RetrievalQuery,
  userId: string,
  memoryProfileId: string | null,
): Promise<MemoryRecord[]> {
  const [semantic, deterministic] = await Promise.all([
    semanticRetrieveScoped(supabase, question, userId, memoryProfileId),
    retrieveAskRecords(supabase, query, memoryProfileId),
  ]);

  // Pure merge + blended rank (unit-tested in retrieval.ts). Returns [] when both
  // are empty → ask-action returns count 0 and never calls the AI.
  return mergeAndRankCandidates(semantic, deterministic, query);
}
