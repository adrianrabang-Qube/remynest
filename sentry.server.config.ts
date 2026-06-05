import * as Sentry from "@sentry/nextjs";

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
  // Release is auto-detected from VERCEL_GIT_COMMIT_SHA when available.
});
