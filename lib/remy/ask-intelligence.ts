import { openai } from "@/lib/openai";
import { PROMPT_SAFETY_PREAMBLE } from "@/lib/constants/disclaimers";
import type { AskIntent } from "@/lib/remy/ask-intent";
import type { MemoryRecord } from "@/lib/remy/retrieval";

/**
 * Ask Remy Intelligence V1 — the grounded answer layer. The FIRST Remy layer to
 * call an LLM. It reuses the EXISTING Remy AI infrastructure (the `openai` client,
 * `gpt-4o-mini`, and the shared `PROMPT_SAFETY_PREAMBLE`) — no new provider, no
 * new prompting system, no custom AI stack.
 *
 * It NEVER retrieves on its own: the caller supplies memories already fetched by
 * the deterministic Retrieval Engine and workspace-scoped, so the model can only
 * answer from those records (no retrieval bypass, no cross-workspace leakage).
 * The grounding prompt forbids fabrication and outside knowledge; if the memories
 * don't answer the request, the model must say so.
 */
const ASK_MODEL = "gpt-4o-mini";
const ASK_TEMPERATURE = 0.3;
const ASK_TIMEOUT_MS = 30_000;

/** Token-protection caps: how many memories and how much of each feed the model. */
const MAX_CONTEXT_MEMORIES = 8;
const MAX_DETAIL_CHARS = 600;

const GROUNDING_SYSTEM = `You are Remy, the RemyNest companion.

Answer using ONLY the memories provided in the user message. Do not use outside knowledge.
Never invent, assume, or add memories, names, dates, places, people, or events that are not present in the provided memories.
If the provided memories do not contain enough to answer, say so plainly (for example: "The memories I found don't cover that.").
Refer to memories by their titles where it helps. Keep replies warm, concise, and non-clinical.
When a memory records an emotional tone (its mood or sentiment), you may gently reflect that recorded tone using the memory's own framing. Never infer, assess, score, or diagnose a person's mood, mental health, or cognitive state — describe only the emotion already recorded with the memory.

${PROMPT_SAFETY_PREAMBLE}`;

/**
 * Build a safe, size-limited textual context from retrieved memory records. Pure
 * and deterministic. Caps the number of memories and truncates each memory's
 * detail so the prompt stays bounded regardless of corpus size.
 */
export function buildAskContext(records: MemoryRecord[]): string {
  return records
    .slice(0, MAX_CONTEXT_MEMORIES)
    .map((record, index) => {
      const title = record.ai_title || record.title || "Untitled memory";
      const date = record.memory_date || "unknown";
      const category = record.ai_category || "uncategorized";
      const detail = (record.ai_summary || record.content || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, MAX_DETAIL_CHARS);
      // Recorded emotional tone (existing enrichment), if any — used non-clinically.
      const tone = [record.ai_mood, record.ai_sentiment]
        .map((v) => (v == null ? "" : String(v).trim()))
        .filter(Boolean)
        .join(", ");
      const lines = [
        `Memory ${index + 1}`,
        `Title: ${title}`,
        `Date: ${date}`,
        `Category: ${category}`,
        `Details: ${detail || "(no details recorded)"}`,
      ];
      if (tone) lines.push(`Recorded tone: ${tone}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

/** How many memories the context actually represents (after the cap). */
export function contextSize(records: MemoryRecord[]): number {
  return Math.min(records.length, MAX_CONTEXT_MEMORIES);
}

/**
 * Generate a grounded answer or summary from the supplied memory context using
 * the existing OpenAI client. The context MUST come from the deterministic
 * Retrieval Engine — callers must not invoke this with an empty context (no
 * memories → no AI call; that is enforced by the server action).
 */
export async function answerAskQuestion(
  question: string,
  context: string,
  mode: AskIntent,
): Promise<string> {
  const task =
    mode === "SUMMARY"
      ? "Summarize these memories in response to the request below. Use only what is written in the memories."
      : "Answer the question using only these memories.";

  const completion = await openai.chat.completions.create(
    {
      model: ASK_MODEL,
      temperature: ASK_TEMPERATURE,
      messages: [
        { role: "system", content: GROUNDING_SYSTEM },
        {
          role: "user",
          content: `${task}\n\nRequest:\n${question}\n\nMemories:\n${context}`,
        },
      ],
    },
    { signal: AbortSignal.timeout(ASK_TIMEOUT_MS) },
  );

  return completion.choices[0]?.message?.content?.trim() ?? "";
}
