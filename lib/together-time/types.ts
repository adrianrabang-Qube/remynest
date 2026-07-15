/**
 * Together Time — shared types, limits, and the FIXED prompt set (single
 * source of truth). Pure data: no React/DOM/DB. A Together Time is a PRIVATE
 * reusable set: an ordered view over 3–8 existing memories. Sets only — no
 * session history, scores, timers, or sharing.
 */

export const TOGETHER_MIN_MOMENTS = 3;
export const TOGETHER_MAX_MOMENTS = 8;
export const TOGETHER_TITLE_MAX = 120;

/**
 * THE fixed, non-AI prompt set (operator-approved copy — do not reword or
 * generate). Deterministic: a moment always shows the same prompt
 * (`index % length`), so a set reads identically every time it is opened.
 * Conversational and gentle — never therapy/assessment language.
 */
export const TOGETHER_PROMPTS = [
  "What do you remember about this?",
  "Who else was there?",
  "What would you like to tell someone about this moment?",
  "Does this bring another memory to mind?",
] as const;

export function promptForMoment(index: number): string {
  return TOGETHER_PROMPTS[((index % TOGETHER_PROMPTS.length) + TOGETHER_PROMPTS.length) % TOGETHER_PROMPTS.length];
}

export interface TogetherTimeRecord {
  id: string;
  user_id: string;
  memory_profile_id: string | null;
  title: string;
  /** Ordered memory uuids — the set IS this sequence (3–8 at save time). */
  memory_ids: string[];
  /** Hub ordering only; bumped BEST-EFFORT by write-permitted users. */
  last_opened_at: string | null;
  created_at: string;
  updated_at: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Normalize untrusted memory ids: uuid-shaped, unique, order kept, capped. */
export function normalizeTogetherMemoryIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of value) {
    if (typeof v !== "string" || !UUID_RE.test(v) || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= TOGETHER_MAX_MOMENTS) break;
  }
  return out;
}

export function normalizeTogetherTitle(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, TOGETHER_TITLE_MAX);
}
