import { NextResponse } from "next/server";

/**
 * RC2 — production API rate limiting (dependency-free, in-memory sliding window).
 *
 * A per-key sliding-window counter that throttles abusive bursts (loops running up OpenAI cost, upload/checkout
 * spam) WITHOUT false positives on normal use. Node-runtime only (in-memory state persists per warm serverless
 * instance). This stops naive single-client abuse immediately with no new dependency or env; a DISTRIBUTED
 * store (Upstash/Redis) keyed the same way is the production upgrade for multi-instance guarantees (operator
 * step, documented). Fail-OPEN: if anything unexpected happens it allows the request (never breaks the API).
 *
 * Limits live in ONE place (`RATE_LIMITS`). Keys are the session user id when available (fair per-user), else
 * the client IP.
 */

/** Central limit presets: { limit, windowMs }. Generous enough to avoid false positives. */
export const RATE_LIMITS = {
  /** Interactive AI/LLM calls (memory chat, story narration). */
  ai: { limit: 15, windowMs: 60_000 },
  /** Memory create (writes + triggers deferred AI). */
  memoryCreate: { limit: 20, windowMs: 60_000 },
  /** Deferred, fire-and-forget enrichment — kept ABOVE `memoryCreate` so bulk memory-add never drops it. */
  enrich: { limit: 30, windowMs: 60_000 },
  /** Signed-URL minting for uploads (batches allowed). */
  upload: { limit: 40, windowMs: 60_000 },
  /** Stripe checkout / portal (low legitimate frequency). */
  billing: { limit: 10, windowMs: 60_000 },
  /** GDPR export (heavy, rare). */
  export: { limit: 5, windowMs: 300_000 },
  /** Account deletion (rare, destructive). */
  deleteAccount: { limit: 5, windowMs: 300_000 },
  /** Moderation report submissions (LA5.1) — low legitimate frequency; throttles report spam. */
  report: { limit: 8, windowMs: 300_000 },
} as const;

export type RateLimitPreset = keyof typeof RATE_LIMITS;

interface Bucket {
  hits: number[]; // request timestamps (ms) within the window
}

const store = new Map<string, Bucket>();
const MAX_KEYS = 50_000; // hard cap so the map can't grow unbounded

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/** Core sliding-window check for a key. Prunes expired hits on access. Fail-open on error. */
export function rateLimit(key: string, limit: number, windowMs: number, now: number = Date.now()): RateLimitResult {
  try {
    const cutoff = now - windowMs;
    const bucket = store.get(key) ?? { hits: [] };
    // Drop timestamps outside the window.
    const hits = bucket.hits.filter((t) => t > cutoff);

    if (hits.length >= limit) {
      const oldest = hits[0];
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
      // Persist the pruned bucket (no new hit recorded on a denial).
      store.set(key, { hits });
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }

    hits.push(now);
    // Cheap eviction if the map grows too large (avoid unbounded memory).
    if (!store.has(key) && store.size >= MAX_KEYS) {
      const firstKey = store.keys().next().value;
      if (firstKey) store.delete(firstKey);
    }
    store.set(key, { hits });
    return { allowed: true, remaining: Math.max(0, limit - hits.length), retryAfterSeconds: 0 };
  } catch {
    return { allowed: true, remaining: limit, retryAfterSeconds: 0 };
  }
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Enforce a preset for an identifier. Returns a 429 `NextResponse` (with `Retry-After`) when over the limit, or
 * null to proceed. The response body is generic (no internal detail). Use the session user id as `identifier`
 * when authenticated (fair per-user), else the client IP.
 */
export function enforceRateLimit(preset: RateLimitPreset, identifier: string): NextResponse | null {
  const { limit, windowMs } = RATE_LIMITS[preset];
  const result = rateLimit(`${preset}:${identifier}`, limit, windowMs);
  if (result.allowed) return null;
  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
  );
}

/** Boolean-only check for non-route callers (e.g. server actions that return a structured result). */
export function isRateLimited(preset: RateLimitPreset, identifier: string): boolean {
  const { limit, windowMs } = RATE_LIMITS[preset];
  return !rateLimit(`${preset}:${identifier}`, limit, windowMs).allowed;
}
