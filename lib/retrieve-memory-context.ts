import { createClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/embeddings";

type MemoryMatch = {
  id: string;
  title?: string;
  content?: string;
  ai_summary?: string;
  ai_category?: string;
  ai_mood?: string;
  similarity?: number;
};

export async function retrieveMemoryContext(
  userId: string,
  query: string
) {
  try {

    const supabase =
      await createClient();

    // =====================================
    // GENERATE QUERY EMBEDDING
    // =====================================

    console.log(
      "🧠 GENERATING QUERY EMBEDDING"
    );

    const queryEmbedding =
      await generateEmbedding(
        query
      );

    // =====================================
    // MATCH MEMORIES
    // =====================================

    const {
      data: matches,
      error: matchError,
    } = await supabase.rpc(
      "match_memories",
      {
        query_embedding:
          queryEmbedding,

        match_threshold: 0.2,

        match_count: 8,

        user_id_input:
          userId,
      }
    );

    if (matchError) {

      console.log(
        "❌ MEMORY MATCH ERROR"
      );

      console.log(
        matchError
      );

      return [];
    }

    console.log(
      "✅ MEMORY MATCHES:"
    );

    console.log(matches);

    if (
      !matches ||
      matches.length === 0
    ) {
      return [];
    }

    // =====================================
    // APP-LAYER OWNERSHIP BACKSTOP
    // =====================================
    // Never trust the match_memories RPC's own user filtering (dashboard-managed /
    // unverifiable). Re-scope its output to rows this user owns BEFORE any content is read
    // into the chat context — mirrors /api/memories/search + lib/remy/semantic-retrieval.
    const rpcIds = (matches as MemoryMatch[])
      .map((m) => m.id)
      .filter((v): v is string => typeof v === "string");
    const { data: ownedRows } = await supabase
      .from("memories")
      .select("id")
      .eq("user_id", userId)
      .in("id", rpcIds);
    const ownedIds = new Set(
      (ownedRows ?? []).map((r: { id: string }) => r.id)
    );
    const scopedMatches = (matches as MemoryMatch[]).filter((m) =>
      ownedIds.has(m.id)
    );
    if (scopedMatches.length === 0) {
      return [];
    }

    // =====================================
    // GET MEMORY IDS
    // =====================================

    const memoryIds =
      scopedMatches.map(
        (memory: MemoryMatch) =>
          memory.id
      );

    // =====================================
    // GET RELATED MEMORIES
    // =====================================

    const {
      data: relationships,
      error:
        relationshipError,
    } = await supabase
      .from(
        "memory_relationships"
      )
      .select("*")
      .in(
        "memory_id",
        memoryIds
      );

    if (
      relationshipError
    ) {

      console.log(
        "❌ RELATIONSHIP FETCH ERROR"
      );

      console.log(
        relationshipError
      );
    }

    console.log(
      "✅ RELATIONSHIPS:"
    );

    console.log(
      relationships
    );

    // =====================================
    // GET CLUSTER ITEMS
    // =====================================

    const {
      data: clusterItems,
      error: clusterError,
    } = await supabase
      .from(
        "memory_cluster_items"
      )
      .select("*")
      .in(
        "memory_id",
        memoryIds
      );

    if (clusterError) {

      console.log(
        "❌ CLUSTER FETCH ERROR"
      );

      console.log(
        clusterError
      );
    }

    console.log(
      "✅ CLUSTER ITEMS:"
    );

    console.log(
      clusterItems
    );

    // =====================================
    // BUILD CONTEXT
    // =====================================

    const context =
      scopedMatches.map(
        (memory: MemoryMatch) => {

          return `
TITLE:
${memory.title}

CONTENT:
${memory.content}

SUMMARY:
${memory.ai_summary}

CATEGORY:
${memory.ai_category}

MOOD:
${memory.ai_mood}

SIMILARITY:
${memory.similarity}
`;
        }
      );

    console.log(
      "✅ FINAL CONTEXT:"
    );

    console.log(context);

    return scopedMatches;

  } catch (error) {

    console.log(
      "❌ RETRIEVE CONTEXT ERROR"
    );

    console.log(error);

    return [];
  }
}