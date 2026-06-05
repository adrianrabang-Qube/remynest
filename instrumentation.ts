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
