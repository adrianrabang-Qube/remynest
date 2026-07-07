import { createClient } from "@/lib/supabase/server";

const RELATIONSHIP_TAG =
  "memory-relationship-engine";

const RELATIONSHIP_MATCH_THRESHOLD =
  0.15;

const RELATIONSHIP_MATCH_COUNT =
  10;

const MAX_RELATIONSHIPS_PER_MEMORY =
  25;

function logRelationshipStage(
  stage: string,
  metadata?: unknown
) {
  console.info(
    `[${RELATIONSHIP_TAG}] ${stage}`,
    metadata || {}
  );
}

function logRelationshipError(
  stage: string,
  error: unknown
) {
  console.error(
    `[${RELATIONSHIP_TAG}] ${stage}`,
    error
  );
}

function createRelationshipRequestId() {
  return crypto.randomUUID();
}

interface RelationshipMatch {
  id: string
  similarity: number
}

function validateRelationshipMatch(
  match: unknown
): match is RelationshipMatch {
  return (
    typeof match === "object" &&
    match !== null &&
    typeof (match as { id?: unknown }).id ===
      "string" &&
    typeof (
      match as { similarity?: unknown }
    ).similarity === "number"
  );
}

function normalizeRelationshipMatches(
  matches: unknown[]
): RelationshipMatch[] {
  return matches
    .filter(
      validateRelationshipMatch
    )
    .sort(
      (a, b) =>
        b.similarity -
        a.similarity
    )
    .slice(
      0,
      MAX_RELATIONSHIPS_PER_MEMORY
    );
}

function buildRelationshipPayload(
  memoryId: string,
  matches: RelationshipMatch[]
) {
  return matches.map(
    (match) => ({
      memory_id:
        memoryId,

      related_memory_id:
        match.id,

      similarity:
        match.similarity,

      relationship_type:
        "semantic",
    })
  );
}

export async function buildRelationships(
  memoryId: string
) {
  const requestId =
    createRelationshipRequestId();

  const start =
    performance.now();

  try {
    const supabase =
      await createClient();

    logRelationshipStage(
      "relationship-build-started",
      {
        requestId,

        memoryId,
      }
    );

    // =====================================
    // FETCH MEMORY
    // =====================================

    // Owner-scope the fetch (app-layer enforcement — never rely on RLS alone): a memoryId
    // the caller does not own returns nothing, so no foreign memory / relationship graph
    // can be read or written.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const {
      data: memory,
      error: memoryError,
    } = await supabase
      .from("memories")
      .select("*")
      .eq("id", memoryId)
      .eq("user_id", user.id)
      .single();

    if (
      memoryError ||
      !memory
    ) {
      logRelationshipError(
        "memory-fetch-error",
        {
          requestId,

          memoryError,
        }
      );

      return {
        success: false,
        error:
          "Memory not found",
      };
    }

    if (!memory.embedding) {
      logRelationshipStage(
        "relationship-skipped",
        {
          requestId,

          reason:
            "missing-embedding",
        }
      );

      return {
        success: false,
        error:
          "Memory has no embedding",
      };
    }

    // =====================================
    // FIND MATCHES
    // =====================================

    const {
      data: matches,
      error: matchError,
    } = await supabase.rpc(
      "match_memories",
      {
        query_embedding:
          memory.embedding,

        match_threshold:
          RELATIONSHIP_MATCH_THRESHOLD,

        match_count:
          RELATIONSHIP_MATCH_COUNT,

        user_id_input:
          memory.user_id,

        memory_id_input:
          memory.id,
      }
    );

    if (matchError) {
      logRelationshipError(
        "relationship-match-error",
        {
          requestId,

          matchError,
        }
      );

      return {
        success: false,
        error:
          "Failed to match memories",
      };
    }

    const normalizedMatches =
      normalizeRelationshipMatches(
        matches || []
      );

    // App-layer ownership backstop — do not trust match_memories output; keep only matched
    // memories this owner actually owns before creating relationship edges.
    const matchIds = normalizedMatches.map(
      (m) => m.id
    );
    const { data: ownedMatchRows } =
      matchIds.length > 0
        ? await supabase
            .from("memories")
            .select("id")
            .eq("user_id", memory.user_id)
            .in("id", matchIds)
        : { data: [] as { id: string }[] };
    const ownedMatchIds = new Set(
      (ownedMatchRows ?? []).map(
        (r: { id: string }) => r.id
      )
    );
    const scopedMatches = normalizedMatches.filter(
      (m) => ownedMatchIds.has(m.id)
    );

    logRelationshipStage(
      "relationship-matches-found",
      {
        requestId,

        totalMatches:
          scopedMatches.length,
      }
    );

    if (
      scopedMatches.length ===
      0
    ) {
      return {
        success: true,
        inserted: 0,
        relationships: [],
      };
    }

    // =====================================
    // BUILD RELATIONSHIPS
    // =====================================

    const relationships =
      buildRelationshipPayload(
        memory.id,
        scopedMatches
      );

    // =====================================
    // INSERT RELATIONSHIPS
    // =====================================

    const {
      data: insertedData,
      error:
        relationshipError,
    } = await supabase
      .from(
        "memory_relationships"
      )
      .upsert(relationships, {
        onConflict:
          "memory_id,related_memory_id",

        ignoreDuplicates: false,
      })
      .select();

    if (
      relationshipError
    ) {
      logRelationshipError(
        "relationship-insert-error",
        {
          requestId,

          relationshipError,
        }
      );

      return {
        success: false,
        error:
          "Failed to insert relationships",
      };
    }

    const durationMs = Number(
      (
        performance.now() -
        start
      ).toFixed(2)
    );

    logRelationshipStage(
      "relationship-build-completed",
      {
        requestId,

        memoryId,

        inserted:
          insertedData?.length || 0,

        durationMs,
      }
    );

    return {
      success: true,

      inserted:
        insertedData?.length || 0,

      relationships:
        insertedData || [],
    };
  } catch (error) {
    logRelationshipError(
      "relationship-engine-error",
      {
        requestId,

        error,
      }
    );

    return {
      success: false,
      error:
        "Relationship engine failure",
    };
  }
}