import type { createClient } from "@/utils/supabase/server";
import {
  retrieveMemoryRecords,
  toRetrievalResult,
  type MemoryRecord,
  type RetrievalQuery,
  type RetrievalResult,
} from "@/lib/remy/retrieval";

/**
 * Ask Remy ↔ Retrieval bridge. Turns a free-text Ask request into a deterministic
 * RetrievalQuery (parseRetrievalQuery) and runs it through the Retrieval Engine
 * (retrieveAskResults → retrieveMemories). NOT AI, semantic search, embeddings,
 * vector search, RAG or answer generation — it only returns factual memory
 * candidates from existing data.
 */
type RemySupabase = Awaited<ReturnType<typeof createClient>>;

export type AskRetrievalResult = RetrievalResult;

export interface AskRetrievalResults {
  results: AskRetrievalResult[];
}

/** Words that precede "memories" but aren't a category (e.g. "show my memories"). */
const TERM_STOPWORDS = new Set([
  "my",
  "all",
  "the",
  "a",
  "an",
  "your",
  "our",
  "these",
  "those",
  "some",
  "recent",
  "old",
  "new",
  "more",
  "show",
  "me",
  "view",
  "find",
  "open",
  "see",
  "list",
  "get",
]);

function cleanTerm(raw: string): string {
  return raw.replace(/^(?:the|a|an|my|our)\s+/, "").trim();
}

/**
 * Parse a free-text request into a RetrievalQuery using deterministic patterns.
 * No AI / fuzzy / semantic matching. Precedence: decade → year → "about X"
 * (text) → "tagged X" (tag) → "{X} memories" (category). Returns null when no
 * pattern matches.
 *
 *   "show memories from the 1990s" → { decade: 1990 }
 *   "memories from 2020"           → { year: 2020 }
 *   "memories about galway"        → { text: "galway" }
 *   "memories tagged family"       → { tag: "family" }
 *   "show travel memories"         → { category: "travel" }
 *   (unrecognized)                 → null
 */
export function parseRetrievalQuery(input: string): RetrievalQuery | null {
  const q = input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!q) return null;

  const decade = q.match(/\b((?:19|20)\d0)s\b/);
  if (decade) return { decade: parseInt(decade[1], 10) };

  const year = q.match(/\b((?:19|20)\d{2})\b/);
  if (year) return { year: parseInt(year[1], 10) };

  const about = q.match(
    /\b(?:about|mentioning|mention|mentions|containing|regarding)\s+(.+)$/,
  );
  if (about) {
    const term = cleanTerm(about[1]);
    return term ? { text: term } : null;
  }

  const tag =
    q.match(/\bwith\s+tag\s+(.+)$/) ?? q.match(/\btagged\s+(.+)$/);
  if (tag) {
    const term = cleanTerm(tag[1]);
    return term ? { tag: term } : null;
  }

  const mem = q.match(/\b([a-z]+)\s+memories\b/);
  if (mem && !TERM_STOPWORDS.has(mem[1])) {
    return { category: mem[1] };
  }

  return null;
}

/**
 * Run a parsed query through the Retrieval Engine, returning matched RECORDS. A
 * bare category term (from "{X} memories") is broadened deterministically — tried
 * as category, then tag, then free text, first non-empty tier wins — since a
 * free-text word can't be known to be a category vs a tag without inspecting
 * data. Explicit year/decade/about/tagged queries run once. No ranking, no AI.
 * Shared by the candidate list (Retrieval) and the grounded answer (Intelligence).
 */
export async function retrieveAskRecords(
  supabase: RemySupabase,
  query: RetrievalQuery,
  memoryProfileId: string | null,
): Promise<MemoryRecord[]> {
  const isBareCategory =
    Boolean(query.category) &&
    !query.text &&
    !query.tag &&
    query.year == null &&
    query.decade == null;

  const attempts: RetrievalQuery[] = isBareCategory
    ? [
        { category: query.category },
        { tag: query.category },
        { text: query.category },
      ]
    : [query];

  for (const attempt of attempts) {
    const records = await retrieveMemoryRecords(supabase, attempt, memoryProfileId);
    if (records.length > 0) return records;
  }
  return [];
}

/** Bridge for the candidate list: matched records mapped to lightweight results. */
export async function retrieveAskResults(
  supabase: RemySupabase,
  query: RetrievalQuery,
  memoryProfileId: string | null,
): Promise<AskRetrievalResults> {
  const records = await retrieveAskRecords(supabase, query, memoryProfileId);
  return { results: records.map(toRetrievalResult) };
}
