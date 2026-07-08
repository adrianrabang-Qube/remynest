import { supabaseAdmin } from "@/utils/supabase/admin";
import type { BillingPlan } from "@/lib/billing/plans";
import { getUsageLimits } from "@/lib/billing/usage-limits";

export type EntitlementReconcileResult =
  | { success: true; revokedRelationships: number }
  | { error: string };

/**
 * Reconcile PERSISTED entitlements after a subscription DOWNGRADE. Runs in the Stripe webhook
 * (service-role, no session).
 *
 * The only persisted grant that outlives an entitlement is caregiver ACCESS
 * (`profile_relationships`). Every other premium capability — semantic search, storage quota,
 * care-profile creation limit, voice memories — is derived at READ TIME from the persisted
 * plan (`resolveSubscription` / `getUsageLimits`), so it auto-reconciles the moment the webhook
 * writes the new plan; there is no stored state to correct for those, and existing over-limit
 * care profiles are intentionally NOT deleted (the repository enforces the limit at CREATION
 * time only — removing existing profiles/memories would be destructive data loss, not a
 * repository rule).
 *
 * So this reconciles exactly one thing: when the NEW plan lacks the caregiver-collaboration
 * entitlement (the single source of truth = `getUsageLimits(plan).caregiverCollaborationEnabled`
 * -> `BILLING_PLANS[plan].caregiverCollaboration`), it withdraws every accepted, non-owner
 * caregiver relationship on the profiles this user OWNS. It NEVER deletes a care profile,
 * memory, or reminder — only the access grant the owner is no longer entitled to extend. This
 * mirrors the manual owner-only revoke primitive (delete the accepted `profile_relationships`
 * row; access is accepted-row-gated), applied in bulk on the entitlement boundary.
 *
 * Returns a structured result and NEVER throws. Idempotent (a re-run deletes nothing new), so
 * a Stripe webhook retry is safe.
 */
export async function reconcileEntitlementsForUser(
  userId: string,
  plan: BillingPlan
): Promise<EntitlementReconcileResult> {
  if (!userId) {
    return { error: "Missing user id." };
  }

  // A plan that still grants caregiver collaboration needs no reconciliation (this also makes
  // the call a cheap no-op on upgrades/renewals to FAMILY).
  if (getUsageLimits(plan).caregiverCollaborationEnabled) {
    return { success: true, revokedRelationships: 0 };
  }

  // Profiles this user OWNS — mirrors userOwnsProfile's ownership definition
  // (memory_profiles.created_by_account_id). We never touch a profile they merely have
  // caregiver access to.
  const { data: owned, error: ownedError } = await supabaseAdmin
    .from("memory_profiles")
    .select("id")
    .eq("created_by_account_id", userId);

  if (ownedError) {
    console.error("[entitlement-reconcile] owned_profiles_error", ownedError);
    return { error: "Failed to load owned profiles for reconciliation." };
  }

  const ownedIds = (owned ?? [])
    .map((p) => (p as { id?: unknown }).id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (ownedIds.length === 0) {
    return { success: true, revokedRelationships: 0 };
  }

  // Withdraw every accepted, NON-owner caregiver relationship on the owner's profiles. The
  // `.neq('relationship_type','owner')` preserves the owner's own access row; access is
  // gated on an ACCEPTED row, so deleting these denies access on the caregiver's next request.
  const { data: removed, error: deleteError } = await supabaseAdmin
    .from("profile_relationships")
    .delete()
    .in("memory_profile_id", ownedIds)
    .eq("invite_status", "accepted")
    .neq("relationship_type", "owner")
    .select("memory_profile_id");

  if (deleteError) {
    console.error("[entitlement-reconcile] revoke_error", deleteError);
    return { error: "Failed to reconcile caregiver access." };
  }

  const revokedRelationships = removed?.length ?? 0;

  if (revokedRelationships > 0) {
    console.info("[entitlement-reconcile] caregivers_revoked_on_downgrade", {
      userId,
      plan,
      revokedRelationships,
    });
  }

  return { success: true, revokedRelationships };
}
