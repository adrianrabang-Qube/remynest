/**
 * Remy Platform (v2) — lightweight client PERSISTENCE (localStorage).
 *
 * The companion remembers a little across sessions — today just the last memory count, so
 * milestone celebrations fire once (on the crossing) and never retroactively. SSR-safe (guards
 * `window`) and failure-tolerant (private-mode / quota errors degrade to "no memory", never throw).
 * Kept tiny + additive; richer state (streaks, last-greeting) plugs in here with no consumer change.
 */
const KEY_LAST_MEMORY_COUNT = "remy.milestones.lastCount";

export function readLastMemoryCount(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY_LAST_MEMORY_COUNT);
    if (raw == null) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function writeLastMemoryCount(count: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY_LAST_MEMORY_COUNT, String(count));
  } catch {
    /* private mode / quota — best-effort only */
  }
}
