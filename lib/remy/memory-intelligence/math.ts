/**
 * Memory Intelligence V2 — shared pure math helpers. Deterministic; no clock/DB/randomness (callers pass `now`).
 */

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Saturating 0..1 curve for an unbounded count: n / (n + k). */
export function saturate(n: number, k: number): number {
  const v = Math.max(0, n);
  return v / (v + Math.max(1e-9, k));
}

/** Age in days between an ISO date and `now` (ms). Returns 0 for missing/invalid/future dates. */
export function ageDaysOf(iso: string | null | undefined, now: number): number {
  if (!iso) return 0;
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return 0;
  return Math.max(0, (now - ts) / 86_400_000);
}

/** Exponential half-life decay to 0..1: 0.5^(ageDays / halfLifeDays). */
export function halfLifeDecay(ageDays: number, halfLifeDays: number): number {
  if (ageDays <= 0) return 1;
  return Math.pow(0.5, ageDays / Math.max(1e-9, halfLifeDays));
}
