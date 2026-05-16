import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/embeddings";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const body = await req.json();

    const query = body.query;

    if (!query) {
      return NextResponse.json(
        {
          error: "Query required",
        },
        {
          status: 400,
        }
      );
    }

    console.log("🔍 SEARCH QUERY:", query);

    // Generate query embedding
    const embedding = await generateEmbedding(query);

    console.log("✅ QUERY EMBEDDING GENERATED");

    // Vector similarity search
    const { data, error } = await supabase.rpc(
      "match_memories",
      {
        query_embedding: embedding,
        match_threshold: 0.3,
        match_count: 10,
        user_id_input: user.id,
      }
    );

    if (error) {
      console.log("❌ SEARCH ERROR:");
      console.log(error);

      return NextResponse.json(
        {
          error: "Search failed",
        },
        {
          status: 500,
        }
      );
    }

    console.log("✅ SEARCH RESULTS:", data?.length);

    return NextResponse.json(data);
  } catch (error) {
    console.log("❌ SEARCH ROUTE ERROR:");
    console.log(error);

    return NextResponse.json(
      {
        error: "Server error",
      },
      {
        status: 500,
      }
    );
  }
}