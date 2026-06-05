import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { planUserDeletion } from "@/lib/gdpr/plan-user-deletion";

export const dynamic = "force-dynamic";

/**
 * GDPR account deletion — SCAFFOLD (dry-run only).
 *
 * GET    → returns a dry-run deletion plan (read-only; no data modified).
 * DELETE → intentionally disabled (501). Destructive deletion is not built yet;
 *          it depends on unresolved soft-vs-hard (schema) and shared-profile
 *          policy decisions.
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

    const plan = await planUserDeletion(
      user.id,
      user.email ?? null
    );

    return NextResponse.json(plan, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error(
      "[gdpr-deletion] plan failed",
      error
    );
    return NextResponse.json(
      { error: "Failed to build deletion plan" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
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

  // Deletion is not enabled. No data is modified.
  return NextResponse.json(
    {
      error: "Account deletion is not enabled",
      code: "DELETION_NOT_IMPLEMENTED",
      hint: "Use GET on this endpoint for a dry-run deletion plan.",
    },
    { status: 501 }
  );
}
