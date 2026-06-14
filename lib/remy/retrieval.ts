import type { createClient } from "@/utils/supabase/server";
import { buildSearchHealth, type SearchHealthRow } from "@/lib/remy/search-health";

/**
 * Remy Memory Retrieval Engine V1 — deterministic retrieval of memory CANDIDATES
 * using existing metadata and dates. NOT AI, embeddings, semantic/vector search,
 * RAG or an LLM. It does not generate answers; it only filters existing memory
 * data. This is the retrieval foundation Ask Remy V2 will build on.
 *
 * `filterMemories` is pure and deterministic (the heart of the engine);
 * `retrieveMemories` / `getRetrievalHealth` are the workspace-scoped loaders.
 */
type RemySupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * The most-recent N memories (by capture date) scanned per workspace — keeps one
 * query cheap and the sample deterministic. Results are not exhaustive beyond
 * this cap; the loaders order by created_at so the sample is stable/repeatable.
 */
const RETRIEVAL_CAP = 2000;

const SELECT_FIELDS =
  "id, title, content, ai_title, ai_summary, ai_category, ai_tags, memory_date";

export interface RetrievalQuery {
  text?: string;
  category?: string;
  tag?: string;
  year?: number;
  decade?: number;
}

export interface RetrievalResult {
  memoryId: string;
  title: string;
  memoryDate?: string | null;
  category?: string | null;
}

export interface RetrievalResults {
  results: RetrievalResult[];
}

export interface RetrievalHealth {
  total: number;
  retrievable: number;
  categoryRetrievable: number;
  tagRetrievable: number;
  dateRetrievable: number;
}

/** A memory row as fetched for retrieval (existing columns only). */
export interface MemoryRecord {
  id: string;
  title?: string | null;
  content?: string | null;
  ai_title?: string | null;
  ai_summary?: string | null;
  ai_category?: string | null;
  ai_tags?: string[] | null;
  memory_date?: string | null;
}

function norm(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().trim();
}

function yearOf(memoryDate: string | null | undefined): number | null {
  if (!memoryDate) return null;
  const year = new Date(memoryDate).getFullYear();
  return Number.isNaN(year) ? null : year;
}

/**
 * Pure deterministic filter. Applies every provided filter with AND semantics
 * over existing memory fields (case-insensitive). No AI, scoring or ranking. A
 * query with no recognized filter returns nothing (never the whole corpus), and
 * unmatched filters return an empty list (no fabricated results).
 */
export function filterMemories(
  rows: MemoryRecord[],
  query: RetrievalQuery,
): RetrievalResult[] {
  const text = norm(query.text);
  const category = norm(query.category);
  const tag = norm(query.tag);
  const { year, decade } = query;

  const hasFilter =
    Boolean(text) ||
    Boolean(category) ||
    Boolean(tag) ||
    year != null ||
    decade != null;
  if (!hasFilter) return [];

  return rows
    .filter((row) => {
      if (text) {
        const haystack = norm(
          [row.title, row.content, row.ai_title, row.ai_summary, row.ai_category]
            .filter(Boolean)
            .join(" "),
        );
        if (!haystack.includes(text)) return false;
      }
      if (category && norm(row.ai_category) !== category) return false;
      if (tag) {
        const tags = Array.isArray(row.ai_tags)
          ? row.ai_tags.map((t) => norm(t))
          : [];
        if (!tags.includes(tag)) return false;
      }
      if (year != null && yearOf(row.memory_date) !== year) return false;
      if (decade != null) {
        const y = yearOf(row.memory_date);
        if (y == null || Math.floor(y / 10) * 10 !== decade) return false;
      }
      return true;
    })
    .map((row) => ({
      memoryId: row.id,
      title: row.ai_title || row.title || "Untitled memory",
      memoryDate: row.memory_date ?? null,
      category: row.ai_category ?? null,
    }));
}

/**
 * Retrieve memory candidates for the active workspace via deterministic
 * filtering. RLS scopes by account; this narrows to the active workspace.
 */
export async function retrieveMemories(
  supabase: RemySupabase,
  query: RetrievalQuery,
  memoryProfileId: string | null,
): Promise<RetrievalResults> {
  let dbQuery = supabase
    .from("memories")
    .select(SELECT_FIELDS)
    .order("created_at", { ascending: false })
    .limit(RETRIEVAL_CAP);
  dbQuery = memoryProfileId
    ? dbQuery.eq("memory_profile_id", memoryProfileId)
    : dbQuery.is("memory_profile_id", null);

  const { data } = await dbQuery;
  return { results: filterMemories((data ?? []) as MemoryRecord[], query) };
}

/** Factual retrieval-health (reuses the search-health counts; no duplication). */
export function buildRetrievalHealth(rows: SearchHealthRow[]): RetrievalHealth {
  const health = buildSearchHealth(rows);
  return {
    total: health.total,
    retrievable: health.searchable,
    categoryRetrievable: health.categorized,
    tagRetrievable: health.tagged,
    dateRetrievable: health.dated,
  };
}

export async function getRetrievalHealth(
  supabase: RemySupabase,
  memoryProfileId: string | null,
): Promise<RetrievalHealth> {
  let dbQuery = supabase
    .from("memories")
    .select("title, content, memory_date, ai_category, ai_tags")
    .order("created_at", { ascending: false })
    .limit(RETRIEVAL_CAP);
  dbQuery = memoryProfileId
    ? dbQuery.eq("memory_profile_id", memoryProfileId)
    : dbQuery.is("memory_profile_id", null);

  const { data } = await dbQuery;
  return buildRetrievalHealth((data ?? []) as SearchHealthRow[]);
}
