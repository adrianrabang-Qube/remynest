import { createClient } from "@/lib/supabase/server";

export async function buildClusters(
  memoryId: string
) {

  try {

    console.log(
      "🚀 buildClusters STARTED"
    );

    const supabase =
      await createClient();

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

    console.log(
      "🧠 MEMORY:"
    );

    console.log(memory);

    console.log(
      "🧠 MEMORY ERROR:"
    );

    console.log(memoryError);

    if (
      memoryError ||
      !memory
    ) {
      return;
    }

    if (!memory.embedding) {

      console.log(
        "❌ NO EMBEDDING"
      );

      return;
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

        match_threshold: 0.55,

        match_count: 10,

        user_id_input:
          memory.user_id,

        memory_id_input:
          memory.id,
      }
    );

    console.log(
      "🧠 CLUSTER MATCHES:"
    );

    console.log(matches);

    console.log(
      "🧠 CLUSTER MATCH ERROR:"
    );

    console.log(matchError);

    if (
      matchError ||
      !matches ||
      matches.length === 0
    ) {

      console.log(
        "❌ NO CLUSTER MATCHES"
      );

      return;
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

    console.log(
      "🧩 CLUSTER:"
    );

    console.log(cluster);

    console.log(
      "🧩 CLUSTER ERROR:"
    );

    console.log(clusterError);

    if (
      clusterError ||
      !cluster
    ) {
      return;
    }

    // =====================================
    // BUILD CLUSTER ITEMS
    // =====================================

    const clusterItems =
      matches.map(
        (match: any) => ({
          cluster_id:
            cluster.id,

          memory_id:
            match.id,

          similarity:
            match.similarity,
        })
      );

    clusterItems.push({
      cluster_id:
        cluster.id,

      memory_id:
        memory.id,

      similarity: 1,
    });

    console.log(
      "🧩 CLUSTER ITEMS:"
    );

    console.log(
      clusterItems
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
      .insert(clusterItems)
      .select();

    console.log(
      "🧩 INSERTED ITEMS:"
    );

    console.log(
      insertedItems
    );

    console.log(
      "🧩 INSERT ERROR:"
    );

    console.log(
      insertError
    );

    if (insertError) {
      return;
    }

    console.log(
      "✅ CLUSTERS BUILT SUCCESSFULLY"
    );

  } catch (error) {

    console.log(
      "❌ BUILD CLUSTERS ERROR"
    );

    console.log(error);
  }
}