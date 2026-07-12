import * as Sentry from "@sentry/nextjs";

/**
 * Next.js instrumentation hook — initializes Sentry on the server and edge
 * runtimes. The client is initialized via sentry.client.config.ts (injected by
 * withSentryConfig). All init is a no-op until a DSN is set in the environment.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

/**
 * Sentry's App-Router server-error hook. Next.js calls `onRequestError` on an
 * UNCAUGHT server error (route handlers / Server Components / nested server
 * rendering) so it can become a Sentry event.
 *
 * NOTE (LA4 review): `onRequestError` was introduced in Next.js 15 — the deployed
 * runtime is Next 14.2.5, which NEVER invokes this export, so it is currently INERT
 * (harmless: it never throws, it silences the Sentry build warning, and it
 * auto-activates on a future Next 15 upgrade). Until then, the ACTUAL server-error
 * coverage is the explicit `captureError(...)` calls in the API route catch blocks
 * (see lib/observability/capture.ts). Env-gated + PII-scrubbed like all captures.
 */
export const onRequestError = Sentry.captureRequestError;
