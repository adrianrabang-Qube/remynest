/**
 * RC2 — minimal structured logger.
 *
 * `debug`/`info` are DEV-ONLY (no-op in production) so production logs carry no routine narration; `warn`/
 * `error` always log and remain available to Sentry's console-breadcrumb integration + `captureException`.
 *
 * NEVER pass PHI/PII — no memory content/titles, names, emails, or sensitive identifiers. Pass counts, ids
 * (opaque uuids are acceptable), status codes, and error messages only. For DB errors, prefer `err.message`
 * over the raw object.
 */
const isProd = process.env.NODE_ENV === "production";

/**
 * Extract a safe, PII-minimised string from an unknown thrown/returned error.
 *
 * Prefer this over logging a raw error object: Supabase `PostgrestError`s carry
 * `.details`/`.hint` that can echo ROW VALUES (e.g. an invitee email on a
 * unique-violation), so logging the whole object risks leaking PII/PHI into
 * production logs (Art 5(1)(c) data minimisation). This returns `.message` only.
 */
export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return "unknown";
}

export const logger = {
  debug: (...args: unknown[]): void => {
    if (!isProd) console.debug(...args);
  },
  info: (...args: unknown[]): void => {
    if (!isProd) console.info(...args);
  },
  warn: (...args: unknown[]): void => {
    console.warn(...args);
  },
  error: (...args: unknown[]): void => {
    console.error(...args);
  },
};
