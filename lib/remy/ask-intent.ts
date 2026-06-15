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

/** A single conversational turn (bounded client-side history; never persisted). */
export interface RemyConversationTurn {
  role: "user" | "assistant";
  text: string;
}

/** Max turns of history carried into a prompt (oldest dropped first). */
export const MAX_CONVERSATION_TURNS = 6;

/**
 * Follow-up phrases that have NO subject of their own and refer back to the prior
 * topic ("tell me more", "what happened after that?"). Detected so the caller can
 * reuse the previous turn's retrieval anchor — retrieval still runs every turn;
 * history never becomes a source of facts. Anchored (^…$) so phrasings that DO
 * carry a subject ("tell me more about Galway") are NOT treated as follow-ups.
 */
const FOLLOW_UP_PATTERNS: RegExp[] = [
  /^tell me more( about (that|it|them|him|her|this))?$/,
  /^(tell me )?more( about (that|it|them|him|her|this))?$/,
  /^(can you )?expand( on (that|it|this))?$/,
  /^what happened (after that|next|then)$/,
  /^(and )?then( what)?$/,
  /^what else( do you remember)?$/,
  /^(is there )?anything else$/,
  /^continue$/,
  /^go on$/,
  /^keep going$/,
];

export function isFollowUp(input: string): boolean {
  const q = input
    .toLowerCase()
    .replace(/[?.!,]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!q) return false;
  return FOLLOW_UP_PATTERNS.some((re) => re.test(q));
}

/** The retrieval anchor — the prior real topic, reused by follow-ups. */
export interface AskAnchor {
  text: string;
  query: RetrievalQuery;
}

/** How a turn resolves: a memory turn (retrieve+answer), a no-anchor follow-up, or non-memory. */
export type ResolvedAskTurn =
  | {
      kind: "memory";
      retrievalText: string;
      query: RetrievalQuery;
      mode: AskIntent;
      isFollowUp: boolean;
    }
  | { kind: "needs-anchor" }
  | { kind: "none" };

/**
 * Resolve one Ask turn deterministically (pure). Follow-up phrases are checked
 * FIRST (they have no subject of their own, so extraction would mis-handle them):
 * a follow-up reuses the anchor's retrieval query/text; otherwise the turn's own
 * extracted query is used; otherwise it's not a memory turn (caller navigates).
 * Follow-ups always run as a grounded QUESTION. Every "memory" result carries a
 * real RetrievalQuery, so retrieval-before-generation can never be bypassed.
 */
export function resolveAskTurn(text: string, anchor: AskAnchor | null): ResolvedAskTurn {
  if (isFollowUp(text)) {
    if (!anchor) return { kind: "needs-anchor" };
    return {
      kind: "memory",
      retrievalText: anchor.text,
      query: anchor.query,
      mode: "QUESTION",
      isFollowUp: true,
    };
  }
  const own = extractAskQuery(text);
  if (own) {
    return {
      kind: "memory",
      retrievalText: text,
      query: own,
      mode: classifyAskIntent(text),
      isFollowUp: false,
    };
  }
  return { kind: "none" };
}

/** History caps: assistant snippets kept short so prior prose can't pose as fact. */
export const MAX_ASSISTANT_SNIPPET = 200;
export const MAX_USER_SNIPPET = 500;

/**
 * Convert bounded client history into chat messages. Keeps only the last
 * MAX_CONVERSATION_TURNS, truncates assistant turns hard (so a prior answer can't
 * masquerade as a memory), collapses whitespace, and drops empties. Pure.
 */
export function buildHistoryMessages(
  history: RemyConversationTurn[],
): { role: "user" | "assistant"; content: string }[] {
  return history
    .slice(-MAX_CONVERSATION_TURNS)
    .map((turn) => ({
      role: turn.role,
      content: (turn.text ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, turn.role === "assistant" ? MAX_ASSISTANT_SNIPPET : MAX_USER_SNIPPET),
    }))
    .filter((message) => message.content.length > 0);
}

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
  /^(tell me about|tell me|what happened in|what happened|what do you know about|what about|what were|what was|who was|who were|who is|who are|who s|when did|when was|where did|where was|summari[sz]e|sum up|summary of|give me a summary of|recap)\s+/;

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
