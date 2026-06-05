import { supabaseAdmin } from "@/utils/supabase/admin";
import { finalizeAuthDeletion } from "@/lib/gdpr/execute-user-deletion";

/**
 * Failure-recovery hook.
 *
 * If a user's application data + storage were deleted but the final auth-user
 * deletion did not complete (pending_account_deletions row exists), finish it
 * now. Called on authenticated app navigation (next login). Returns true when
 * the account was pending — the caller should sign the user out / redirect.
 *
 * Uses the service-role client (the table is service-role only).
 */
export async function retryPendingDeletionForUser(
  userId: string,
): Promise<boolean> {
  try {
    const { data } = await supabaseAdmin
      .from("pending_account_deletions")
      .select("user_id, email, status")
      .eq("user_id", userId)
      .maybeSingle();

    if (!data) return false;

    await finalizeAuthDeletion(userId, data.email ?? null);
    return true;
  } catch (error) {
    console.error("[delete-account] pending retry failed", { userId, error });
    // Treat as pending so the caller still ends the session safely.
    return true;
  }
}
