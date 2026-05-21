import { createClient } from "@/lib/supabase/server";

const CLUSTER_TAG =
  "memory-cluster-engine";

const CLUSTER_MATCH_THRESHOLD =
  0.55;

const CLUSTER_MATCH_COUNT =
  10;

const MAX_CLUSTER_ITEMS =
  15;

function logClusterStage(
  stage: string,
  metadata?: unknown
) {
  console.info(
    `[${CLUSTER_TAG}] ${stage}`,
    metadata || {}
  );
}

function logClusterError(
  stage: string,
  error: unknown
) {
  console.error(
    `[${CLUSTER_TAG}] ${stage}`,
    error
  );
}

function createClusterRequestId() {
  return crypto.randomUUID();
}

function validateClusterMatch(
  match: any
) {
  return (
    match &&
    typeof match.id ===
      "string" &&
    typeof match.similarity ===
      "number"
  );
}

function normalizeClusterMatches(
  matches: any[]
) {
  return matches
    .filter(
      validateClusterMatch
    )
    .sort(
      (a, b) =>
        b.similarity -
        a.similarity
    )
    .slice(
      0,
      MAX_CLUSTER_ITEMS
    );
}

function buildClusterItems(
  clusterId: string,
  memoryId: string,
  matches: any[]
) {
  const items = matches.map(
    (match) => ({
      cluster_id:
        clusterId,

      memory_id:
        match.id,

      similarity:
        match.similarity,
    })
  );

  items.push({
    cluster_id:
      clusterId,

    memory_id:
      memoryId,

    similarity: 1,
  });

  return items;
}

export async function buildClusters(
  memoryId: string
) {
  const requestId =
    createClusterRequestId();

  const start =
    performance.now();

  try {
    const supabase =
      await createClient();

    logClusterStage(
      "cluster-build-started",
      {
        requestId,

        memoryId,
      }
    );

    // =====================================
    // FETCH MEMORY
    // =====================================

    const {
      data: memory,
      error: memoryError,
    } = await supabase
      .from("memories")
      .select("*")
      .eq("id", memoryId)
      .single();

    if (
      memoryError ||
      !memory
    ) {
      logClusterError(
        "cluster-memory-fetch-error",
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
      logClusterStage(
        "cluster-skipped",
        {
          requestId,

          reason:
            "missing-embedding",
        }
      );

      return {
        success: false,
        error:
          "Missing embedding",
      };
    }

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
          memory.embedding,

        match_threshold:
          CLUSTER_MATCH_THRESHOLD,

        match_count:
          CLUSTER_MATCH_COUNT,

        user_id_input:
          memory.user_id,

        memory_id_input:
          memory.id,
      }
    );

    if (matchError) {
      logClusterError(
        "cluster-match-error",
        {
          requestId,

          matchError,
        }
      );

      return {
        success: false,
        error:
          "Cluster matching failed",
      };
    }

    const normalizedMatches =
      normalizeClusterMatches(
        matches || []
      );

    logClusterStage(
      "cluster-matches-found",
      {
        requestId,

        totalMatches:
          normalizedMatches.length,
      }
    );

    if (
      normalizedMatches.length ===
      0
    ) {
      return {
        success: true,
        inserted: 0,
      };
    }

    // =====================================
    // CREATE CLUSTER
    // =====================================

    const {
      data: cluster,
      error: clusterError,
    } = await supabase
      .from("memory_clusters")
      .insert([
        {
          user_id:
            memory.user_id,

          title:
            memory.ai_title ||
            "Memory Cluster",

          summary:
            memory.ai_summary ||
            "",

          category:
            memory.ai_category ||
            "General",

          emotional_theme:
            memory.ai_mood ||
            "Neutral",
        },
      ])
      .select()
      .single();

    if (
      clusterError ||
      !cluster
    ) {
      logClusterError(
        "cluster-create-error",
        {
          requestId,

          clusterError,
        }
      );

      return {
        success: false,
        error:
          "Cluster creation failed",
      };
    }

    logClusterStage(
      "cluster-created",
      {
        requestId,

        clusterId:
          cluster.id,
      }
    );

    // =====================================
    // BUILD ITEMS
    // =====================================

    const clusterItems =
      buildClusterItems(
        cluster.id,
        memory.id,
        normalizedMatches
      );

    // =====================================
    // INSERT ITEMS
    // =====================================

    const {
      data: insertedItems,
      error: insertError,
    } = await supabase
      .from(
        "memory_cluster_items"
      )
      .upsert(clusterItems, {
        onConflict:
          "cluster_id,memory_id",

        ignoreDuplicates: false,
      })
      .select();

    if (insertError) {
      logClusterError(
        "cluster-item-insert-error",
        {
          requestId,

          insertError,
        }
      );

      return {
        success: false,
        error:
          "Cluster item insert failed",
      };
    }

    const durationMs = Number(
      (
        performance.now() -
        start
      ).toFixed(2)
    );

    logClusterStage(
      "cluster-build-completed",
      {
        requestId,

        clusterId:
          cluster.id,

        inserted:
          insertedItems?.length || 0,

        durationMs,
      }
    );

    return {
      success: true,

      clusterId:
        cluster.id,

      inserted:
        insertedItems?.length || 0,

      items:
        insertedItems || [],
    };
  } catch (error) {
    logClusterError(
      "cluster-engine-error",
      {
        requestId,

        error,
      }
    );

    return {
      success: false,
      error:
        "Cluster engine failure",
    };
  }
}