import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { collectUserData } from "@/lib/gdpr/collect-user-data";

export const dynamic = "force-dynamic";

/**
 * GDPR data export (read-only, export-only — no deletion).
 *
 * Authenticates the caller, then returns ALL of that user's data as a
 * downloadable JSON file. Data is gathered scoped strictly to the authenticated
 * user's id / email. No data is modified.
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
    console.error(
      "[gdpr-export] export failed",
      error
    );

    return NextResponse.json(
      { error: "Export failed" },
      { status: 500 }
    );
  }
}
