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
