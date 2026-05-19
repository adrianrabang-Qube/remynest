import { NextResponse } from "next/server";

import OpenAI from "openai";

import { createClient } from "@/lib/supabase/server";

import { retrieveMemoryContext } from "@/lib/retrieve-memory-context";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    // REQUEST BODY
    // =====================================

    const body =
      await req.json();

    const query =
      body.query?.trim();

    if (!query) {
      return NextResponse.json(
        {
          error:
            "Query required",
        },
        {
          status: 400,
        }
      );
    }

    console.log(
      "🧠 USER QUERY:"
    );

    console.log(query);

    // =====================================
    // RETRIEVE MEMORY CONTEXT
    // =====================================

    const memoryContext =
      await retrieveMemoryContext(
        query,
        user.id
      );

    console.log(
      "🧠 MEMORY CONTEXT:"
    );

    console.log(
      memoryContext
    );

    // =====================================
    // NO CONTEXT FOUND
    // =====================================

    if (
      !memoryContext ||
      memoryContext.length === 0
    ) {
      return NextResponse.json({
        answer:
          "I could not find relevant memories.",
        memories: [],
      });
    }

    // =====================================
    // BUILD AI PROMPT
    // =====================================

    const prompt = `
You are RemyNest AI.

You are an autobiographical cognitive memory assistant.

Your job is to help users recall memories,
identify emotional patterns,
understand life events,
and provide contextual autobiographical insights.

Use ONLY the provided memory context.

Be emotionally intelligent,
natural,
supportive,
and highly contextual.

If the memories do not contain enough information,
say so honestly.

=====================================

MEMORY CONTEXT:

${memoryContext.join("\n\n")}

=====================================

USER QUESTION:

${query}
`;

    // =====================================
    // AI COMPLETION
    // =====================================

    const completion =
      await openai.chat.completions.create(
        {
          model: "gpt-4o-mini",

          messages: [
            {
              role: "system",
              content:
                "You are RemyNest AI.",
            },

            {
              role: "user",
              content: prompt,
            },
          ],

          temperature: 0.4,
        }
      );

    const answer =
      completion.choices[0]
        .message.content;

    console.log(
      "✅ AI RESPONSE:"
    );

    console.log(answer);

    // =====================================
    // RESPONSE
    // =====================================

    return NextResponse.json({
      answer,

      memories:
        memoryContext,
    });

  } catch (error) {

    console.log(
      "❌ MEMORY CHAT ERROR"
    );

    console.log(error);

    return NextResponse.json(
      {
        error:
          "Server error",
      },
      {
        status: 500,
      }
    );
  }
}