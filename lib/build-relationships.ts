import { createClient } from "@/lib/supabase/server";

export async function buildRelationships(
  memoryId: string
) {

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

  if (
    memoryError ||
    !memory
  ) {

    console.log(
      "❌ MEMORY FETCH ERROR"
    );

    console.log(
      memoryError
    );

    return {
      success: false,
      error:
        "Memory not found",
    };
  }

  if (!memory.embedding) {

    console.log(
      "❌ NO EMBEDDING FOUND"
    );

    return {
      success: false,
      error:
        "Memory has no embedding",
    };
  }

  console.log(
    "🚀 BUILDING RELATIONSHIPS FOR:",
    memory.id
  );

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

      match_threshold: 0.15,

      match_count: 10,

      user_id_input:
        memory.user_id,

      memory_id_input:
        memory.id,
    }
  );

  console.log(
    "🧠 RAW MATCHES:"
  );

  console.log(matches);

  console.log(
    "🧠 RAW MATCH ERROR:"
  );

  console.log(matchError);

  if (matchError) {

    console.log(
      "❌ MATCH ERROR"
    );

    console.log(
      matchError
    );

    return {
      success: false,
      error:
        "Failed to match memories",
    };
  }

  console.log(
    "✅ MATCHES FOUND:",
    matches?.length || 0
  );

  if (
    !matches ||
    matches.length === 0
  ) {

    console.log(
      "⚠️ NO RELATIONSHIPS FOUND"
    );

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
    matches.map(
      (match: any) => ({
        memory_id:
          memory.id,

        related_memory_id:
          match.id,

        similarity:
          match.similarity,

        relationship_type:
          "semantic",
      })
    );

  console.log(
    "🧩 RELATIONSHIPS TO INSERT:"
  );

  console.log(
    relationships
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
    .insert(relationships)
    .select();

  console.log(
    "🧩 INSERT RESULT:"
  );

  console.log(
    insertedData
  );

  console.log(
    "🧩 INSERT ERROR:"
  );

  console.log(
    relationshipError
  );

  if (
    relationshipError
  ) {

    console.log(
      "❌ RELATIONSHIP INSERT ERROR"
    );

    console.log(
      relationshipError
    );

    return {
      success: false,
      error:
        "Failed to insert relationships",
    };
  }

  console.log(
    "✅ RELATIONSHIPS INSERTED"
  );

  return {
    success: true,

    inserted:
      relationships.length,

    relationships:
      insertedData,
  };
}