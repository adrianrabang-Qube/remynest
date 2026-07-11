import * as Sentry from "@sentry/nextjs";

import {
  SENTRY_PRIVACY_DEFAULTS,
  scrubSentryEvent,
} from "@/lib/observability/sentry-privacy";

const dsn =
  process.env.SENTRY_DSN ||
  process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  // No-op until a DSN is configured in the deployment environment.
  enabled: Boolean(dsn),
  environment:
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  // RC3 — pin PII off + scrub events for a health-adjacent app (see helper).
  ...SENTRY_PRIVACY_DEFAULTS,
  beforeSend: scrubSentryEvent,
});
