import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/embeddings";

export async function POST(req: Request) {
  try {
    const supabase = createClient();

    // 🔐 Auth
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 📦 Body
    const body = await req.json();

    const query = body.query;

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Query required" },
        { status: 400 }
      );
    }

    // 🧠 Generate embedding from search query
    const embedding = await generateEmbedding(query);

    // 🔎 Semantic search
    const { data, error } = await supabase.rpc(
      "match_memories",
      {
        query_embedding: embedding,
        match_threshold: 0.45,
        match_count: 20,
        user_id_input: user.id,
      }
    );

    if (error) {
      console.log(error);

      return NextResponse.json(
        { error: "Search failed" },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}