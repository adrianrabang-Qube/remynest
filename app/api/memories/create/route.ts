import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateMemoryInsights } from "@/lib/ai-memory";
import { generateEmbedding } from "@/lib/embeddings";
import { getActiveProfile } from "@/lib/active-profile";

export async function POST(req: Request) {
  try {
    const supabase =
      await createClient();

    // =====================================
    // AUTH
    // =====================================

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

    // =====================================
    // ACTIVE PROFILE
    // =====================================

    const activeProfileId =
      await getActiveProfile();

    if (!activeProfileId) {
      return NextResponse.json(
        {
          error:
            "No active profile selected",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================
    // REQUEST BODY
    // =====================================

    const body = await req.json();

    const { title, content } = body;

    if (!content) {
      return NextResponse.json(
        {
          error: "Content required",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================
    // AI MEMORY ANALYSIS
    // =====================================

    let aiTitle =
      title || "Untitled Memory";

    let aiSummary = "";

    let aiTags: string[] = [];

    let aiCategory = "General";

    let aiMood = "Neutral";

    let aiImportance = "Medium";

    let aiConfidence = 85;

    let aiSentiment = "Neutral";

    let aiEmotionalWeight =
      "Light";

    try {
      const ai =
        await generateMemoryInsights(
          content
        );

      aiTitle =
        ai.title ||
        title ||
        "Untitled Memory";

      aiSummary =
        ai.summary || "";

      aiTags =
        ai.tags || [];

      aiCategory =
        ai.category ||
        "General";

      aiMood =
        ai.mood ||
        "Neutral";

      aiImportance =
        ai.importance ||
        "Medium";

      aiConfidence =
        ai.confidence || 85;

      aiSentiment =
        ai.sentiment ||
        "Neutral";

      aiEmotionalWeight =
        ai.emotionalWeight ||
        "Light";

      console.log(
        "✅ AI MEMORY:"
      );

      console.log(ai);

    } catch (aiError) {

      console.log(
        "❌ AI ERROR:"
      );

      console.log(aiError);
    }

    // =====================================
    // EMBEDDING
    // =====================================

    let embedding:
      | number[]
      | null = null;

    try {
      console.log(
        "🚀 GENERATING EMBEDDING"
      );

      embedding =
        await generateEmbedding(
          content
        );

      console.log(
        "✅ EMBEDDING CREATED"
      );

    } catch (
      embeddingError
    ) {

      console.log(
        "❌ EMBEDDING ERROR:"
      );

      console.log(
        embeddingError
      );
    }

    // =====================================
    // INSERT MEMORY
    // =====================================

    const {
      data,
      error,
    } = await supabase
      .from("memories")
      .insert([
        {
          user_id: user.id,

          memory_profile_id:
            activeProfileId,

          title: aiTitle,

          content,

          ai_title: aiTitle,

          ai_summary:
            aiSummary,

          ai_tags: aiTags,

          ai_category:
            aiCategory,

          ai_mood: aiMood,

          ai_importance:
            aiImportance,

          ai_confidence:
            aiConfidence,

          ai_sentiment:
            aiSentiment,

          ai_emotional_weight:
            aiEmotionalWeight,

          embedding,
        },
      ])
      .select()
      .single();

    if (error) {

      console.log(
        "❌ MEMORY CREATE ERROR:"
      );

      console.log(error);

      return NextResponse.json(
        {
          error:
            "Failed to create memory",
        },
        {
          status: 500,
        }
      );
    }

    console.log(
      "✅ Memory created:"
    );

    console.log(data.id);

    return NextResponse.json(
      data
    );

  } catch (error) {

    console.log(
      "❌ CREATE MEMORY ERROR:"
    );

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