import { parseRetrievalQuery } from "@/lib/remy/ask-retrieval";
import type { RetrievalQuery } from "@/lib/remy/retrieval";

/**
 * Ask Remy Intelligence V1 — deterministic intent classification. Decides, with
 * pure string rules (no AI), whether an Ask request wants:
 *   - RETRIEVE: list factual memory candidates ("show travel memories").
 *   - QUESTION: a grounded answer synthesized from memories ("what happened in 2020?").
 *   - SUMMARY:  a grounded summary of memories ("summarize our family trips").
 *
 * `extractAskQuery` derives the deterministic RetrievalQuery that scopes WHICH
 * memories feed the answer. It returns null for non-memory phrasings (e.g.
 * "open timeline") so the caller can fall through to navigation — classification
 * never invents a memory query out of an arbitrary command.
 */
export type AskIntent = "RETRIEVE" | "QUESTION" | "SUMMARY";

const SUMMARY_RE = /\b(summari[sz]e|summari[sz]ing|summary|recap|sum up)\b/;

const QUESTION_LEAD_RE =
  /^(what|when|where|who|whose|whom|why|how|which|tell me|did|was|were|do|does|is|are|can|could|would|should)\b/;

const QUESTION_CUE_RE = /\b(happened|mention|mentions|tell me about)\b/;

/**
 * Phrases that unambiguously signal a memory QUESTION or SUMMARY. Deliberately
 * excludes ambiguous commands like "show me" / "give me" / "list" so navigation
 * intents ("show me the timeline") still route to navigation, not retrieval.
 */
const LEAD_STRIP_RE =
  /^(tell me about|tell me|what happened in|what happened|what do you know about|what about|what were|what was|who was|who were|when did|when was|where did|where was|summari[sz]e|sum up|summary of|give me a summary of|recap)\s+/;

/** Filler removed when picking the subject term from a stripped phrase. */
const FALLBACK_FILLER = new Set([
  "memories",
  "memory",
  "about",
  "our",
  "my",
  "the",
  "a",
  "an",
  "all",
  "some",
  "any",
  "of",
  "for",
  "on",
  "in",
  "with",
]);

/** Deterministically classify an Ask request. SUMMARY wins over QUESTION. */
export function classifyAskIntent(input: string): AskIntent {
  const q = input.toLowerCase().trim();
  if (!q) return "RETRIEVE";
  if (SUMMARY_RE.test(q)) return "SUMMARY";
  if (q.endsWith("?") || QUESTION_LEAD_RE.test(q) || QUESTION_CUE_RE.test(q)) {
    return "QUESTION";
  }
  return "RETRIEVE";
}

/**
 * Derive the deterministic RetrievalQuery that scopes an Ask request. Reuses the
 * structured parser (year/decade/about/mention/tagged/"{X} memories") first; for
 * question/summary phrasings it strips the leading cue and uses the LAST subject
 * word as a (cascade-broadened) category term — in natural questions the subject
 * trails the cue ("visit Dublin", "with Mary", "after retirement", "moved house"),
 * so the last content word is the subject far more often than the first. Returns
 * null when the text carries no memory-query signal, so navigation phrasings fall
 * through untouched.
 */
export function extractAskQuery(input: string): RetrievalQuery | null {
  const direct = parseRetrievalQuery(input);
  if (direct) return direct;

  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const stripped = normalized.replace(LEAD_STRIP_RE, "");
  // No question/summary cue was present → not a memory query (let navigation handle it).
  if (stripped === normalized) return null;

  const words = stripped
    .trim()
    .split(" ")
    .filter((w) => w && !FALLBACK_FILLER.has(w));
  return words.length ? { category: words[words.length - 1] } : null;
}
