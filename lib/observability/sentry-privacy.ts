import type { ErrorEvent } from "@sentry/nextjs";

/**
 * RC3 — Sentry privacy defaults + PII scrubbing.
 *
 * RemyNest handles health-adjacent, special-category personal data, and Sentry
 * is a US-based processor. These helpers pin the privacy-relevant Sentry
 * settings so error diagnostics carry as little personal data as possible
 * (Art 5(1)(c) data minimisation, Art 32 security, Art 44 transfers):
 *
 *   - `sendDefaultPii: false` — never auto-attach IP / cookies / headers /
 *     request bodies (this is the SDK default; we pin it so a future SDK/config
 *     change can't silently flip it on for a health-adjacent app).
 *   - `scrubSentryEvent` — a conservative `beforeSend` hook that strips request
 *     cookies/headers/body and redacts email-like substrings BEFORE transmission,
 *     across the event message, captured exception values, AND console
 *     breadcrumbs (RC4: the SDK's Breadcrumbs integration captures console.*, so
 *     any email/PII in a log line would otherwise ride to Sentry un-redacted).
 *     It NEVER drops the event (returns it, scrubbed), so error reporting is
 *     unaffected.
 *
 * This is redaction-only: it changes no application behaviour and no reminder /
 * OneSignal / Stripe / auth logic. It is defence-in-depth on top of keeping PHI/PII
 * out of logs at the source (lib/logger.ts + the callers).
 */

export const SENTRY_PRIVACY_DEFAULTS = {
  // Do not send IP addresses, cookies, headers or request bodies by default.
  sendDefaultPii: false,
} as const;

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const redact = (value: unknown): string | undefined =>
  typeof value === "string" ? value.replace(EMAIL_RE, "[redacted-email]") : undefined;

/**
 * Conservative `beforeSend`: drop request cookies/headers/body and redact
 * email-like substrings from the message, exception values, and console
 * breadcrumbs. Returns the (scrubbed) event — never null — so no diagnostics
 * are lost.
 */
export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.data;
  }

  const scrubbedMessage = redact(event.message);
  if (scrubbedMessage !== undefined) event.message = scrubbedMessage;

  // Captured exceptions: redact the thrown value's message (e.g. "…email x@y.com…").
  if (event.exception?.values) {
    for (const ex of event.exception.values) {
      const scrubbed = redact(ex.value);
      if (scrubbed !== undefined) ex.value = scrubbed;
    }
  }

  // Console breadcrumbs (the SDK captures console.*): redact the message and any
  // stringified data so a log line carrying PII does not leak through the trail.
  if (event.breadcrumbs) {
    for (const crumb of event.breadcrumbs) {
      const scrubbed = redact(crumb.message);
      if (scrubbed !== undefined) crumb.message = scrubbed;
      if (crumb.data) {
        for (const key of Object.keys(crumb.data)) {
          const s = redact(crumb.data[key]);
          if (s !== undefined) crumb.data[key] = s;
        }
      }
    }
  }

  return event;
}
