import type { createClient } from "@/utils/supabase/server";

/**
 * Memory Search Health — deterministic, factual reporting on how discoverable the
 * existing memory corpus is. No AI, no scoring, no inference: just counts over
 * fields that already exist (title/content/memory_date/ai_category/ai_tags).
 * `buildSearchHealth` is pure; `getSearchHealth` is the workspace-scoped loader.
 */
type RemySupabase = Awaited<ReturnType<typeof createClient>>;

/** Up to this many memories are sampled for health counts (keeps one query cheap). */
const SEARCH_HEALTH_CAP = 5000;

export interface SearchHealthRow {
  title?: string | null;
  content?: string | null;
  memory_date?: string | null;
  ai_category?: string | null;
  ai_tags?: string[] | null;
}

export interface SearchHealth {
  total: number;
  /** Has searchable text (title or content). */
  searchable: number;
  dated: number;
  categorized: number;
  tagged: number;
  missingDates: number;
  missingCategories: number;
  missingTags: number;
  searchablePercentage: number;
  datedPercentage: number;
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function buildSearchHealth(rows: SearchHealthRow[]): SearchHealth {
  const total = rows.length;
  let searchable = 0;
  let dated = 0;
  let categorized = 0;
  let tagged = 0;

  for (const row of rows) {
    if (hasText(row.title) || hasText(row.content)) searchable += 1;
    if (hasText(row.memory_date)) dated += 1;
    if (hasText(row.ai_category)) categorized += 1;
    if (Array.isArray(row.ai_tags) && row.ai_tags.length > 0) tagged += 1;
  }

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return {
    total,
    searchable,
    dated,
    categorized,
    tagged,
    missingDates: total - dated,
    missingCategories: total - categorized,
    missingTags: total - tagged,
    searchablePercentage: pct(searchable),
    datedPercentage: pct(dated),
  };
}

/**
 * Load search health for the active workspace (care profile or My Nest). RLS
 * scopes by account; this narrows to the active workspace, matching how the
 * keyword search itself is scoped.
 */
export async function getSearchHealth(
  supabase: RemySupabase,
  memoryProfileId: string | null,
): Promise<SearchHealth> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return buildSearchHealth([]);

  let query = supabase
    .from("memories")
    .select("title, content, memory_date, ai_category, ai_tags")
    .limit(SEARCH_HEALTH_CAP);
  query = memoryProfileId
    ? query.eq("memory_profile_id", memoryProfileId)
    : query.is("memory_profile_id", null).eq("user_id", user.id);

  const { data } = await query;
  return buildSearchHealth((data ?? []) as SearchHealthRow[]);
}
