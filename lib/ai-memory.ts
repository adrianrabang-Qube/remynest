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

  people: [] as ExtractedPerson[],
};

/**
 * A candidate person mention proposed by the AI (Phase C2). UNTRUSTED — every
 * candidate must pass the server-side grounding gate (verbatim, word-boundary
 * match against the memory content) in lib/build-people.ts before it is persisted.
 */
export interface ExtractedPerson {
  /** Canonical name, e.g. "Dad" or "John Smith". */
  name: string;
  /** Relationship if explicitly stated (e.g. "father"); omitted otherwise. Never inferred. */
  role?: string;
  /** The EXACT words copied verbatim from the memory (grounding evidence). */
  mention: string;
  /** 0-100. */
  confidence: number;
}

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

  /** Candidate people mentions (UNTRUSTED; grounded + persisted in Phase C2). */
  people: ExtractedPerson[];
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

/** Clamp an AI confidence to an integer 0-100 (floats <=1 are treated as 0-1 scale). */
function clampConfidence(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  const scaled = n > 0 && n <= 1 ? n * 100 : n;
  return Math.max(0, Math.min(100, Math.round(scaled)));
}

/**
 * Sanitize the UNTRUSTED people array from the model into well-formed candidates.
 * Drops anything without a non-empty name AND mention. Does NOT ground them —
 * grounding (verbatim match vs memory content) happens in lib/build-people.ts.
 */
function sanitizePeople(value: unknown): ExtractedPerson[] {
  if (!Array.isArray(value)) return [];
  const out: ExtractedPerson[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const candidate = raw as Record<string, unknown>;
    const name =
      typeof candidate.name === "string" ? candidate.name.trim().slice(0, 120) : "";
    const mention =
      typeof candidate.mention === "string"
        ? candidate.mention.trim().slice(0, 200)
        : "";
    if (!name || !mention) continue;
    const role =
      typeof candidate.role === "string" && candidate.role.trim()
        ? candidate.role.trim().slice(0, 60)
        : undefined;
    out.push({ name, mention, role, confidence: clampConfidence(candidate.confidence) });
  }
  return out;
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

    people: sanitizePeople(payload.people),
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

For "people": list ONLY real human individuals or relationships actually named in the memory
(e.g. "Dad", "Mary", "John Smith"). NEVER include places, organizations, animals, events, or
things. For each person: "name" = the canonical name; "role" = the relationship ONLY if the
memory states it (else omit); "mention" = the EXACT words copied verbatim from the memory above;
"confidence" = 0-100. If you are unsure whether something is a person, leave it out. Prefer an
empty array over guessing.

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
  "emotionalWeight": "",
  "people": [{ "name": "", "role": "", "mention": "", "confidence": 0 }]
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