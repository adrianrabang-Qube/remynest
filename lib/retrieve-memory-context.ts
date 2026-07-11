import { createClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/embeddings";
import { logger } from "@/lib/logger";

type MemoryMatch = {
  id: string;
  title?: string;
  content?: string;
  ai_summary?: string;
  ai_category?: string;
  ai_mood?: string;
  similarity?: number;
};

/**
 * Retrieve a user's most-relevant memories for the memory-chat RAG context. Owner-scoped (RLS + an app-layer
 * ownership backstop over the dashboard-managed match_memories RPC). RC2: logging is counts-only + dev-gated —
 * memory content / titles / the built context are NEVER logged (PHI).
 */
export async function retrieveMemoryContext(userId: string, query: string) {
  try {
    const supabase = await createClient();

    // ---- Query embedding + vector match ----
    const queryEmbedding = await generateEmbedding(query);

    const { data: matches, error: matchError } = await supabase.rpc("match_memories", {
      query_embedding: queryEmbedding,
      match_threshold: 0.2,
      match_count: 8,
      user_id_input: userId,
    });

    if (matchError) {
      logger.error("[memory-chat] match_memories failed", matchError.message);
      return [];
    }
    logger.debug("[memory-chat] matches", { count: Array.isArray(matches) ? matches.length : 0 });

    if (!matches || matches.length === 0) {
      return [];
    }

    // ---- APP-LAYER OWNERSHIP BACKSTOP ----
    // Never trust the match_memories RPC's own user filtering (dashboard-managed / unverifiable). Re-scope its
    // output to rows this user owns BEFORE any content is read into the chat context — mirrors
    // /api/memories/search + lib/remy/semantic-retrieval.
    const rpcIds = (matches as MemoryMatch[])
      .map((m) => m.id)
      .filter((v): v is string => typeof v === "string");
    const { data: ownedRows } = await supabase
      .from("memories")
      .select("id")
      .eq("user_id", userId)
      .in("id", rpcIds);
    const ownedIds = new Set((ownedRows ?? []).map((r: { id: string }) => r.id));
    const scopedMatches = (matches as MemoryMatch[]).filter((m) => ownedIds.has(m.id));
    if (scopedMatches.length === 0) {
      return [];
    }

    const memoryIds = scopedMatches.map((memory: MemoryMatch) => memory.id);

    // ---- Related memories (best-effort) ----
    const { error: relationshipError } = await supabase
      .from("memory_relationships")
      .select("memory_id")
      .in("memory_id", memoryIds);
    if (relationshipError) {
      logger.error("[memory-chat] relationship fetch failed", relationshipError.message);
    }

    // ---- Cluster items (best-effort) ----
    const { error: clusterError } = await supabase
      .from("memory_cluster_items")
      .select("memory_id")
      .in("memory_id", memoryIds);
    if (clusterError) {
      logger.error("[memory-chat] cluster fetch failed", clusterError.message);
    }

    logger.debug("[memory-chat] context built", { count: scopedMatches.length });
    return scopedMatches;
  } catch (error) {
    logger.error("[memory-chat] retrieve context failed", error instanceof Error ? error.message : "unknown");
    return [];
  }
}
