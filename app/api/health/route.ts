import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Liveness health check for uptime monitors.
 *
 * Public + unauthenticated, dependency-free (no external calls), so it reflects
 * whether the app process is up and serving — not downstream service health.
 * Returns 200 with a small status payload.
 */
export async function GET() {
  // RC2: the public liveness probe does NOT disclose the deployed commit SHA (revision fingerprinting).
  return NextResponse.json(
    {
      status: "ok",
      service: "remynest",
      timestamp: new Date().toISOString(),
    },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}
