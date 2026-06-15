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

export const MEMORY_SELECT_FIELDS =
  "id, title, content, ai_title, ai_summary, ai_category, ai_tags, memory_date, ai_mood, ai_sentiment, ai_emotional_weight, created_at";

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
  // Emotional enrichment (existing columns; surfaced for mood-aware answers).
  ai_mood?: string | null;
  ai_sentiment?: string | null;
  ai_emotional_weight?: number | string | null;
  created_at?: string | null;
  /** Attached by the hybrid retriever (semantic cosine ~[0,1]); 0 for deterministic-only rows. */
  similarity?: number;
}

export function norm(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().trim();
}

function yearOf(memoryDate: string | null | undefined): number | null {
  if (!memoryDate) return null;
  const year = new Date(memoryDate).getFullYear();
  return Number.isNaN(year) ? null : year;
}

/** Escape a string for safe literal use inside a RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Token-aware containment: the term must appear bounded by non-alphanumeric
 * characters (or the string edges), so a query for "son" does NOT match
 * "person"/"reason" and "mary" does NOT match "rosemary". Multi-word terms are
 * matched as a bounded phrase. A term with no alphanumeric character falls back
 * to plain containment. Replaces raw substring matching; all other retrieval
 * semantics (AND, fields searched, case-insensitivity) are unchanged.
 */
export function containsWord(haystack: string, term: string): boolean {
  if (!/[a-z0-9]/i.test(term)) return haystack.includes(term);
  const re = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(term)}(?:[^a-z0-9]|$)`, "i");
  return re.test(haystack);
}

/** True when the query carries at least one filter. */
export function hasAnyFilter(query: RetrievalQuery): boolean {
  return (
    Boolean(norm(query.text)) ||
    Boolean(norm(query.category)) ||
    Boolean(norm(query.tag)) ||
    query.year != null ||
    query.decade != null
  );
}

/** Pure AND-match of one memory row against a query (case-insensitive). */
export function matchesQuery(row: MemoryRecord, query: RetrievalQuery): boolean {
  const text = norm(query.text);
  const category = norm(query.category);
  const tag = norm(query.tag);
  const { year, decade } = query;

  if (text) {
    const haystack = norm(
      [row.title, row.content, row.ai_title, row.ai_summary, row.ai_category, row.ai_mood]
        .filter(Boolean)
        .join(" "),
    );
    if (!containsWord(haystack, text)) return false;
  }
  if (category && norm(row.ai_category) !== category) return false;
  if (tag) {
    const tags = Array.isArray(row.ai_tags) ? row.ai_tags.map((t) => norm(t)) : [];
    if (!tags.includes(tag)) return false;
  }
  if (year != null && yearOf(row.memory_date) !== year) return false;
  if (decade != null) {
    const y = yearOf(row.memory_date);
    if (y == null || Math.floor(y / 10) * 10 !== decade) return false;
  }
  return true;
}

/** Map a matched memory row to a lightweight retrieval result. */
export function toRetrievalResult(row: MemoryRecord): RetrievalResult {
  return {
    memoryId: row.id,
    title: row.ai_title || row.title || "Untitled memory",
    memoryDate: row.memory_date ?? null,
    category: row.ai_category ?? null,
  };
}

/**
 * Pure deterministic filter. Applies every provided filter with AND semantics.
 * A query with no recognized filter returns nothing (never the whole corpus).
 */
export function filterMemories(
  rows: MemoryRecord[],
  query: RetrievalQuery,
): RetrievalResult[] {
  if (!hasAnyFilter(query)) return [];
  return rows.filter((row) => matchesQuery(row, query)).map(toRetrievalResult);
}

// ---------------------------------------------------------------------------
// Hybrid ranking (pure). Used by the hybrid semantic retriever to order a merged
// set of semantic + deterministic candidates. No AI, no IO. Semantic-primary so
// recall leads; recency + metadata break ties and respect explicit intent.
// ---------------------------------------------------------------------------

export const RANK_W_SEMANTIC = 0.65;
export const RANK_W_RECENCY = 0.2;
export const RANK_W_METADATA = 0.15;
/** Recency half-life of 5 years — long, so decades-old life memories aren't buried. */
export const RECENCY_HALF_LIFE_DAYS = 1825;

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Exponential recency decay from memory_date (fallback created_at); 0 when undated. */
export function recencyScore(row: MemoryRecord, now: number = Date.now()): number {
  const iso = row.memory_date || row.created_at;
  if (!iso) return 0;
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return 0;
  const ageDays = (now - ts) / 86_400_000;
  if (ageDays <= 0) return 1; // today/future-dated → most recent
  return Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);
}

/** Fraction of the query's structured constraints this row satisfies (0 when none). */
export function metadataScore(row: MemoryRecord, query: RetrievalQuery): number {
  let total = 0;
  let parts = 0;
  if (norm(query.category)) {
    total++;
    if (norm(row.ai_category) === norm(query.category)) parts++;
  }
  if (norm(query.tag)) {
    total++;
    const tags = Array.isArray(row.ai_tags) ? row.ai_tags.map((t) => norm(t)) : [];
    if (tags.includes(norm(query.tag))) parts++;
  }
  if (query.year != null || query.decade != null) {
    total++;
    if (matchesQuery(row, { year: query.year, decade: query.decade })) parts++;
  }
  return total === 0 ? 0 : parts / total;
}

/** Blended 0..1 relevance: semantic similarity + recency + metadata. Pure. */
export function blendedScore(
  row: MemoryRecord,
  query: RetrievalQuery,
  now: number = Date.now(),
): number {
  return (
    RANK_W_SEMANTIC * clamp01(row.similarity ?? 0) +
    RANK_W_RECENCY * recencyScore(row, now) +
    RANK_W_METADATA * metadataScore(row, query)
  );
}

/** Order rows by blended score, descending; stable on ties. Pure. */
export function rankRecords(
  rows: MemoryRecord[],
  query: RetrievalQuery,
  now: number = Date.now(),
): MemoryRecord[] {
  return rows
    .map((row, index) => ({ row, index, score: blendedScore(row, query, now) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.row);
}

/** Only absolute time (year/decade) is a HARD constraint that filters semantic hits. */
export function hasHardTimeConstraint(query: RetrievalQuery): boolean {
  return query.year != null || query.decade != null;
}

/**
 * Pure hybrid merge: hard-time-filter the semantic set (a year/decade query must
 * not surface other years), union with the deterministic set (semantic wins;
 * deterministic-only rows get similarity 0), then blended-rank. Returns [] when
 * both inputs are empty — preserving the no-AI-on-empty guarantee downstream.
 * Category/tag stay SOFT (they shape ranking via metadataScore, never exclude).
 */
export function mergeAndRankCandidates(
  semantic: MemoryRecord[],
  deterministic: MemoryRecord[],
  query: RetrievalQuery,
  now: number = Date.now(),
): MemoryRecord[] {
  const scopedSemantic = hasHardTimeConstraint(query)
    ? semantic.filter((row) =>
        matchesQuery(row, { year: query.year, decade: query.decade }),
      )
    : semantic;

  const byId = new Map<string, MemoryRecord>();
  for (const row of scopedSemantic) byId.set(row.id, row);
  for (const row of deterministic) {
    if (!byId.has(row.id)) byId.set(row.id, { ...row, similarity: 0 });
  }

  const union = [...byId.values()];
  if (union.length === 0) return [];
  return rankRecords(union, query, now);
}

/**
 * Retrieve matched memory RECORDS (full existing columns, incl. content/summary)
 * for the active workspace via deterministic filtering. RLS scopes by account;
 * this narrows to the active workspace. Returns nothing for a filterless query —
 * never the whole corpus — so callers cannot accidentally dump every memory.
 */
export async function retrieveMemoryRecords(
  supabase: RemySupabase,
  query: RetrievalQuery,
  memoryProfileId: string | null,
): Promise<MemoryRecord[]> {
  if (!hasAnyFilter(query)) return [];

  let dbQuery = supabase
    .from("memories")
    .select(MEMORY_SELECT_FIELDS)
    .order("created_at", { ascending: false })
    .limit(RETRIEVAL_CAP);
  dbQuery = memoryProfileId
    ? dbQuery.eq("memory_profile_id", memoryProfileId)
    : dbQuery.is("memory_profile_id", null);

  const { data } = await dbQuery;
  return ((data ?? []) as MemoryRecord[]).filter((row) => matchesQuery(row, query));
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
  const records = await retrieveMemoryRecords(supabase, query, memoryProfileId);
  return { results: records.map(toRetrievalResult) };
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
