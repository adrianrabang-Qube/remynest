import * as Sentry from "@sentry/nextjs";

/**
 * LA4 — capture a HANDLED server error to Sentry as a real error EVENT.
 *
 * Why this exists: API-route catch blocks log via `logger.error(errorMessage(e))`,
 * which only produces a Sentry *console breadcrumb* (attached to some later captured
 * event) — NOT an error event of its own. So handled 500s (DB errors, provider
 * failures, unexpected exceptions that the route catches and turns into a graceful
 * 500) were effectively invisible in Sentry: no aggregation, no alerting, no stack.
 * This sends them as proper events, correlated by `route` + `requestId` tags.
 *
 * Safety invariants (this must never change request behaviour):
 *  - ENV-GATED: Sentry is a no-op until a DSN is configured, so this is a no-op then.
 *  - PII-SCRUBBED: the outbound event still passes the `beforeSend` scrubber
 *    (sendDefaultPii:false; message/exception/breadcrumb email redaction). Pass ONLY
 *    ids/route strings as tags — never PHI/PII (memory content/titles, names, emails).
 *  - NEVER THROWS / NEVER BLOCKS: wrapped in try/catch so an observability failure can
 *    never break the request path. `captureException` is fire-and-forget (non-blocking).
 *
 * Pair it WITH the existing `logger.error(errorMessage(e))` (log + capture); it does
 * not replace logging. Use `errorMessage` for the log line and pass the RAW error here
 * so Sentry gets the real stack trace.
 */
export function captureError(
  error: unknown,
  tags?: { route?: string; requestId?: string }
): void {
  try {
    Sentry.captureException(error, tags ? { tags } : undefined);
  } catch {
    // Observability must never break the request path.
  }
}
