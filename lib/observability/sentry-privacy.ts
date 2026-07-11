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
 *     cookies/headers and redacts email-like substrings from the event message
 *     BEFORE transmission. It NEVER drops the event (returns it, scrubbed), so
 *     error reporting is unaffected.
 *
 * This is redaction-only: it changes no application behaviour and no reminder /
 * OneSignal / Stripe / auth logic.
 */

export const SENTRY_PRIVACY_DEFAULTS = {
  // Do not send IP addresses, cookies, headers or request bodies by default.
  sendDefaultPii: false,
} as const;

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

/**
 * Conservative `beforeSend`: drop request cookies/headers and redact email-like
 * substrings from the outbound event. Returns the (scrubbed) event — never null
 * — so no diagnostics are lost.
 */
export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.data;
  }

  if (typeof event.message === "string") {
    event.message = event.message.replace(EMAIL_RE, "[redacted-email]");
  }

  return event;
}
