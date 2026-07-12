import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { collectUserData } from "@/lib/gdpr/collect-user-data";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { logger, errorMessage } from "@/lib/logger";
import { captureError } from "@/lib/observability/capture";

export const dynamic = "force-dynamic";
// RC4: give the full-account data aggregation headroom so a large export returns
// the route's structured error rather than a raw platform timeout.
export const maxDuration = 60;

/**
 * GDPR data export — Art. 15 (access) + Art. 20 (portability). Read-only,
 * export-only (no deletion).
 *
 * Authenticates the caller, then returns ALL of that user's data as a
 * downloadable JSON file. Data is gathered scoped strictly to the authenticated
 * user's id / email. No data is modified.
 *
 * SCOPE INVARIANT: the payload is strictly owner-only and MAY include
 * special-category (health-adjacent) memory content — keep it scoped to the
 * caller and never widen `collectUserData` beyond the authenticated user.
 * Media is exported as REFERENCES only (the private bucket needs signed URLs);
 * delivering the binaries is a tracked Art 20 enhancement.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const limited = enforceRateLimit("export", user.id);
    if (limited) return limited;

    const payload = await collectUserData(
      user.id,
      user.email ?? null
    );

    const filename = `remynest-data-export-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;

    return new NextResponse(
      JSON.stringify(payload, null, 2),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    logger.error(
      "[gdpr-export] export failed",
      errorMessage(error)
    );
    captureError(error, { route: "gdpr.export" });

    return NextResponse.json(
      { error: "Export failed" },
      { status: 500 }
    );
  }
}
