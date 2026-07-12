import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { logger, errorMessage } from "@/lib/logger";
import { captureError } from "@/lib/observability/capture";

export const dynamic = "force-dynamic";

/**
 * Account profile update (Phase 1).
 *
 * PATCH updates the authenticated user's own `profiles` row — first name and
 * preferred name only. The update is scoped to `id = user.id` and runs through
 * the SSR (anon, RLS-enforced) client, so a user can only modify their own row.
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { firstName, preferredName } = (body ?? {}) as {
      firstName?: unknown;
      preferredName?: unknown;
    };

    if (typeof firstName !== "string" || typeof preferredName !== "string") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const trimmedFirst = firstName.trim().slice(0, 100);
    const trimmedPreferred = preferredName.trim().slice(0, 100);

    if (!trimmedFirst) {
      return NextResponse.json(
        { error: "First name is required" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: trimmedFirst,
        preferred_name: trimmedPreferred || trimmedFirst,
      })
      .eq("id", user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[profile-update] failed", errorMessage(error));
    captureError(error, { route: "profile.update" });
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}
