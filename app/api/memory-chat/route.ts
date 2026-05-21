import { NextResponse } from "next/server";

import OpenAI from "openai";

import { createClient } from "@/lib/supabase/server";
import { retrieveMemoryContext } from "@/lib/retrieve-memory-context";

const MEMORY_CHAT_TAG =
  "memory-chat-engine";

const MAX_QUERY_LENGTH =
  1_000;

const MAX_CONTEXT_MEMORIES =
  8;

const OPENAI_TIMEOUT_MS =
  30_000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function logMemoryChatStage(
  stage: string,
  metadata?: unknown
) {
  console.info(
    `[${MEMORY_CHAT_TAG}] ${stage}`,
    metadata || {}
  );
}

function logMemoryChatError(
  stage: string,
  error: unknown
) {
  console.error(
    `[${MEMORY_CHAT_TAG}] ${stage}`,
    error
  );
}

function createMemoryChatRequestId() {
  return crypto.randomUUID();
}

function normalizeQuery(
  value: string
) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
}

function buildMemoryContext(
  memories: any[]
) {
  return memories
    .slice(0, MAX_CONTEXT_MEMORIES)
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
}

export async function POST(req: Request) {
  const requestId =
    createMemoryChatRequestId();

  const start =
    performance.now();

  try {
    logMemoryChatStage(
      "memory-chat-started",
      {
        requestId,
      }
    );

    const supabase = await createClient();

    // =========================================
    // AUTH
    // =========================================

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      logMemoryChatError(
        "auth-error",
        {
          requestId,

          authError,
        }
      );
    }

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

    logMemoryChatStage(
      "memory-chat-authenticated",
      {
        requestId,

        userId: user.id,
      }
    );

    // =========================================
    // BODY
    // =========================================

    const body = await req.json();

    const query = normalizeQuery(
      body.query || ""
    );

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

    logMemoryChatStage(
      "memory-chat-query-received",
      {
        requestId,

        queryLength:
          query.length,
      }
    );

    // =========================================
    // RETRIEVE MEMORY CONTEXT
    // =========================================

    const retrievalStart =
      performance.now();

    const memories =
      await retrieveMemoryContext(
        user.id,
        query
      );

    const retrievalDurationMs =
      Number(
        (
          performance.now() -
          retrievalStart
        ).toFixed(2)
      );

    logMemoryChatStage(
      "memory-context-retrieved",
      {
        requestId,

        memories:
          memories?.length || 0,

        retrievalDurationMs,
      }
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
      buildMemoryContext(memories);

    // =========================================
    // AI RESPONSE
    // =========================================

    const completionStart =
      performance.now();

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
        },
        {
          signal: AbortSignal.timeout(
            OPENAI_TIMEOUT_MS
          ),
        }
      );

    const completionDurationMs =
      Number(
        (
          performance.now() -
          completionStart
        ).toFixed(2)
      );

    const answer =
      completion.choices[0]
        .message.content;

    logMemoryChatStage(
      "memory-chat-completed",
      {
        requestId,

        completionDurationMs,

        totalDurationMs: Number(
          (
            performance.now() -
            start
          ).toFixed(2)
        ),
      }
    );

    // =========================================
    // RESPONSE
    // =========================================

    return NextResponse.json({
      answer,
      memories,
    });
  } catch (error) {
    logMemoryChatError(
      "memory-chat-engine-error",
      error
    );

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