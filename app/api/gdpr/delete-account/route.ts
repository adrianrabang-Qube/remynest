import { NextResponse } from "next/server";
import { createClient as createAnonClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { planUserDeletion } from "@/lib/gdpr/plan-user-deletion";
import { executeUserDeletion } from "@/lib/gdpr/execute-user-deletion";
import { logger, errorMessage } from "@/lib/logger";
import { captureError } from "@/lib/observability/capture";

export const dynamic = "force-dynamic";
// RC4: cascading deletes + recursive storage cleanup can run long on large accounts.
export const maxDuration = 60;

/**
 * GDPR account deletion.
 *
 * GET    → read-only dry-run deletion plan (counts, shared profiles to transfer,
 *          cross-contributed memories).
 * DELETE → executes deletion. Requires re-authentication:
 *            - email users: current password (verified server-side),
 *            - OAuth users: a recent sign-in (within REAUTH_WINDOW_MS).
 *          Body: { password?: string, deleteContributed?: boolean }.
 */

const REAUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const plan = await planUserDeletion(user.id, user.email ?? null);
    return NextResponse.json(plan, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logger.error("[gdpr-deletion] plan failed", errorMessage(error));
    captureError(error, { route: "gdpr.delete-account.plan" });
    return NextResponse.json(
      { error: "Failed to build deletion plan" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = enforceRateLimit("deleteAccount", user.id);
    if (limited) return limited;

    let body: { password?: unknown; deleteContributed?: unknown } = {};
    try {
      body = await request.json();
    } catch {
      // empty body is allowed (defaults)
    }

    const deleteContributed = body.deleteContributed === true;
    const provider =
      (user.app_metadata?.provider as string | undefined) ?? "email";

    // ---- Re-authentication gate -------------------------------------
    if (provider === "email") {
      const password =
        typeof body.password === "string" ? body.password : "";
      if (!password) {
        return NextResponse.json(
          { error: "Password required", code: "REAUTH_REQUIRED" },
          { status: 401 },
        );
      }
      // Verify against a throwaway client so the live session is untouched.
      const verifier = createAnonClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { error: pwError } = await verifier.auth.signInWithPassword({
        email: user.email ?? "",
        password,
      });
      if (pwError) {
        return NextResponse.json(
          { error: "Incorrect password", code: "REAUTH_FAILED" },
          { status: 401 },
        );
      }
    } else {
      // OAuth: require a recent sign-in.
      const lastSignIn = user.last_sign_in_at
        ? new Date(user.last_sign_in_at).getTime()
        : 0;
      if (Date.now() - lastSignIn > REAUTH_WINDOW_MS) {
        return NextResponse.json(
          {
            error: "Please sign in again to confirm deletion",
            code: "REAUTH_REQUIRED",
          },
          { status: 401 },
        );
      }
    }

    // ---- Execute -----------------------------------------------------
    const result = await executeUserDeletion({
      userId: user.id,
      userEmail: user.email ?? null,
      deleteContributed,
    });

    return NextResponse.json(
      {
        status: result.status,
        removedFiles: result.removedFiles,
        keptFiles: result.keptFiles,
      },
      { status: result.status === "completed" ? 200 : 202 },
    );
  } catch (error) {
    logger.error("[gdpr-deletion] delete failed", errorMessage(error));
    captureError(error, { route: "gdpr.delete-account" });
    return NextResponse.json(
      { error: "Account deletion failed" },
      { status: 500 },
    );
  }
}
