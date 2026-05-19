import { NextResponse } from "next/server";

import OpenAI from "openai";

import { createClient } from "@/lib/supabase/server";
import { retrieveMemoryContext } from "@/lib/retrieve-memory-context";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // =========================================
    // AUTH
    // =========================================

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

    // =========================================
    // BODY
    // =========================================

    const body = await req.json();

    const query = body.query?.trim();

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

    // =========================================
    // RETRIEVE MEMORY CONTEXT
    // =========================================

    const memories =
      await retrieveMemoryContext(
        user.id,
        query
      );

    console.log(
      "🧠 MEMORY CONTEXT:",
      memories?.length || 0
    );

    if (
      !memories ||
      memories.length === 0
    ) {
      return NextResponse.json({
        answer:
          "I could not find relevant memories.",
        memories: [],
      });
    }

    // =========================================
    // BUILD MEMORY CONTEXT
    // =========================================

    const memoryContext =
      memories
        .map(
          (
            memory: any,
            index: number
          ) => `
Memory ${index + 1}

Title:
${memory.title}

Summary:
${memory.summary}

Category:
${memory.category}

Mood:
${memory.mood}

Importance:
${memory.importance}

Similarity:
${Math.round(
  memory.similarity * 100
)}%
`
        )
        .join("\n\n");

    // =========================================
    // AI RESPONSE
    // =========================================

    const completion =
      await openai.chat.completions.create(
        {
          model: "gpt-4o-mini",

          temperature: 0.4,

          messages: [
            {
              role: "system",
              content: `
You are RemyNest AI.

You help users retrieve memories from their cognitive timeline.

Use ONLY the provided memories.

Be intelligent,
emotionally aware,
and conversational.

If memories are unrelated,
say so honestly.
`,
            },

            {
              role: "user",
              content: `
User Question:
${query}

Relevant Memories:
${memoryContext}
`,
            },
          ],
        }
      );

    const answer =
      completion.choices[0]
        .message.content;

    // =========================================
    // RESPONSE
    // =========================================

    return NextResponse.json({
      answer,
      memories,
    });
  } catch (error) {
    console.log(
      "❌ MEMORY CHAT ERROR"
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