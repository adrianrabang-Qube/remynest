import { openai } from "@/lib/openai";

const AI_MEMORY_MODEL =
  "gpt-4.1-mini";

const AI_MEMORY_TAG =
  "ai-memory-engine";

const AI_TIMEOUT_MS = 15_000;

const AI_MAX_CONTENT_LENGTH =
  8_000;

const DEFAULT_MEMORY_RESPONSE = {
  title: "Untitled Memory",

  summary: "",

  tags: [],

  category: "General",

  mood: "Neutral",

  importance: "Medium",

  confidence: 85,

  sentiment: "Neutral",

  emotionalWeight: "Light",
};

export interface MemoryInsightResponse {
  title: string;

  summary: string;

  tags: string[];

  category: string;

  mood: string;

  importance: string;

  confidence: number;

  sentiment: string;

  emotionalWeight: string;
}

function logAIStage(
  stage: string,
  metadata?: unknown
) {
  console.info(
    `[${AI_MEMORY_TAG}] ${stage}`,
    metadata || {}
  );
}

function logAIError(
  stage: string,
  error: unknown
) {
  console.error(
    `[${AI_MEMORY_TAG}] ${stage}`,
    error
  );
}

function normalizeMemoryContent(
  content: string
) {
  return content
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, AI_MAX_CONTENT_LENGTH);
}

function createAIRequestId() {
  return crypto.randomUUID();
}

function validateAIResponse(
  payload: unknown
): payload is MemoryInsightResponse {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const result =
    payload as MemoryInsightResponse;

  return (
    typeof result.title ===
      "string" &&
    typeof result.summary ===
      "string" &&
    Array.isArray(result.tags) &&
    typeof result.category ===
      "string"
  );
}

function createAIAbortSignal() {
  return AbortSignal.timeout(
    AI_TIMEOUT_MS
  );
}

function safelyParseAIResponse(
  content: string
) {
  try {
    return JSON.parse(content);
  } catch (error) {
    logAIError(
      "json-parse-error",
      error
    );

    return null;
  }
}

function normalizeAIResponse(
  payload: Partial<MemoryInsightResponse>
): MemoryInsightResponse {
  return {
    title:
      payload.title ||
      DEFAULT_MEMORY_RESPONSE.title,

    summary:
      payload.summary ||
      DEFAULT_MEMORY_RESPONSE.summary,

    tags: Array.isArray(payload.tags)
      ? payload.tags
      : DEFAULT_MEMORY_RESPONSE.tags,

    category:
      payload.category ||
      DEFAULT_MEMORY_RESPONSE.category,

    mood:
      payload.mood ||
      DEFAULT_MEMORY_RESPONSE.mood,

    importance:
      payload.importance ||
      DEFAULT_MEMORY_RESPONSE.importance,

    confidence:
      typeof payload.confidence ===
      "number"
        ? payload.confidence
        : DEFAULT_MEMORY_RESPONSE.confidence,

    sentiment:
      payload.sentiment ||
      DEFAULT_MEMORY_RESPONSE.sentiment,

    emotionalWeight:
      payload.emotionalWeight ||
      DEFAULT_MEMORY_RESPONSE.emotionalWeight,
  };
}

async function executeAIRequest(
  normalizedContent: string
) {
  return openai.chat.completions.create(
    {
      model: AI_MEMORY_MODEL,

      temperature: 0.2,

      messages: [
        {
          role: "system",
          content:
            "You are a healthcare-adjacent cognition analysis engine. Analyze user memories conservatively and return stable structured JSON only. Never hallucinate details. Keep summaries concise and semantically useful.",
        },
        {
          role: "user",
          content: `
Analyze this memory:

${normalizedContent}

Return valid JSON:
{
  "title": "",
  "summary": "",
  "tags": [],
  "category": "",
  "mood": "",
  "importance": "",
  "confidence": 0,
  "sentiment": "",
  "emotionalWeight": ""
}
`,
        },
      ],

      response_format: {
        type: "json_object",
      },
    },
    {
      signal:
        createAIAbortSignal(),
    }
  );
}

export async function generateMemoryInsights(
  content: string
): Promise<MemoryInsightResponse> {
  const requestId =
    createAIRequestId();

  const start =
    performance.now();

  try {
    const normalizedContent =
      normalizeMemoryContent(
        content
      );

    logAIStage(
      "ai-request-started",
      {
        requestId,

        contentLength:
          normalizedContent.length,

        model:
          AI_MEMORY_MODEL,
      }
    );

    const completion =
      await executeAIRequest(
        normalizedContent
      );

    const result =
      completion.choices[0]
        ?.message?.content;

    if (!result) {
      throw new Error(
        "No AI response"
      );
    }

    const parsed =
      safelyParseAIResponse(
        result
      );

    if (!parsed) {
      throw new Error(
        "Invalid AI JSON"
      );
    }

    const normalized =
      normalizeAIResponse(parsed);

    if (
      !validateAIResponse(
        normalized
      )
    ) {
      throw new Error(
        "AI response schema invalid"
      );
    }

    const durationMs = Number(
      (
        performance.now() -
        start
      ).toFixed(2)
    );

    logAIStage(
      "ai-request-completed",
      {
        requestId,

        durationMs,

        usage:
          completion.usage || null,
      }
    );

    return normalized;
  } catch (error) {
    logAIError(
      "ai-request-error",
      {
        requestId,

        error,
      }
    );

    return DEFAULT_MEMORY_RESPONSE;
  }
}