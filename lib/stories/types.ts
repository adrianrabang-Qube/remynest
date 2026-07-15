/**
 * Story Builder — shared types + limits (single source of truth).
 * Pure data: no React/DOM/DB. A story is an ORDERED view over existing
 * memories (2–12 "moments"); nothing is copied, nothing is generated.
 */

export const STORY_MIN_MOMENTS = 2;
export const STORY_MAX_MOMENTS = 12;
export const STORY_TITLE_MAX = 120;

export interface StoryRecord {
  id: string;
  user_id: string;
  memory_profile_id: string | null;
  title: string;
  /** Ordered memory uuids — the story IS this sequence. */
  memory_ids: string[];
  created_at: string;
  updated_at: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Normalize an untrusted memory-id list: strings that look like uuids,
 * de-duplicated, order preserved, capped at the story maximum.
 */
export function normalizeMemoryIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of value) {
    if (typeof v !== "string" || !UUID_RE.test(v) || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= STORY_MAX_MOMENTS) break;
  }
  return out;
}

export function normalizeStoryTitle(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, STORY_TITLE_MAX);
}
