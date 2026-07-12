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
 * LA4 — capture server request errors (App Router route handlers, Server
 * Components, and nested React server rendering) to Sentry. Next.js calls this on
 * an UNCAUGHT server error; without it those errors reach the error boundary but
 * never become Sentry events. Env-gated + PII-scrubbed like all other captures.
 */
export const onRequestError = Sentry.captureRequestError;
