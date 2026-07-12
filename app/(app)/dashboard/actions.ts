"use server";

import { revalidatePath } from "next/cache";

import { logger, errorMessage } from "@/lib/logger";
import { checkPremium } from "@/lib/premium";

import type { BillingPlan } from "@/lib/billing/plans";
import {
  canCreateCareProfile,
  getUsageLimits,
} from "@/lib/billing/usage-limits";

import {
  userOwnsProfile,
} from "@/lib/profile-ownership";
import { supabaseAdmin } from "@/utils/supabase/admin";

import {
  normalizeFormValue,
  requireDashboardUser,
} from "./lib/dashboard-guards";

import {
  logProfileCreation,
  logDashboardEvent,
} from "./lib/dashboard-telemetry";

const DASHBOARD_PATH = "/dashboard";

/**
 * Discriminated result for care-profile creation. A plan limit is EXPECTED
 * business logic, not a system failure — Server Actions must NOT throw for it
 * (Next.js redacts thrown Server Action messages in production, which both hides
 * the reason and surfaces a generic "Server Components render" error dialog).
 * The client switches on `code` and renders the upgrade flow.
 */
export type CreateProfileResult =
  | { ok: true; profileId: string }
  | {
      ok: false;
      code: "CARE_PROFILE_LIMIT_REACHED";
      plan: BillingPlan;
      limit: number;
      currentCount: number;
    }
  | { ok: false; code: "VALIDATION"; message: string }
  | { ok: false; code: "SERVER_ERROR"; message: string };

export async function createProfile(
  formData: FormData
): Promise<CreateProfileResult> {
  // NOTE: requireDashboardUser() may redirect() — keep it OUT of try/catch so the
  // Next redirect signal is never swallowed.
  const { supabase, user } =
    await requireDashboardUser();

  const profileName = normalizeFormValue(
    formData.get("profile_name")
  );
  const preferredName = normalizeFormValue(
    formData.get("preferred_name")
  );

  if (!profileName) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Profile name is required.",
    };
  }

  const { plan } = await checkPremium();

  const {
    count: currentProfileCount,
    error: countError,
  } = await supabase
    .from("memory_profiles")
    .select("id", { count: "exact", head: true })
    .eq("created_by_account_id", user.id);

  if (countError) {
    logger.error(
      "[createProfile] limit count failed",
      errorMessage(countError)
    );
    return {
      ok: false,
      code: "SERVER_ERROR",
      message:
        "We couldn't verify your plan limits. Please try again.",
    };
  }

  const currentCount = currentProfileCount ?? 0;

  // EXPECTED business rule — return structured response, never throw.
  if (!canCreateCareProfile(currentCount, plan)) {
    const max = getUsageLimits(plan).maxCareProfiles;
    const limit =
      max === "unlimited" ? Number.MAX_SAFE_INTEGER : max;

    // High-intent upgrade signal (logged for conversion analytics).
    console.info("[dashboard] care_profile_limit_reached", {
      userId: user.id,
      plan,
      currentCount,
    });

    return {
      ok: false,
      code: "CARE_PROFILE_LIMIT_REACHED",
      plan: plan as BillingPlan,
      limit,
      currentCount,
    };
  }

  const { data: profile, error } = await supabase
    .from("memory_profiles")
    .insert({
      profile_name: profileName,
      preferred_name: preferredName,
      created_by_account_id: user.id,
      subscription_status: "free",
    })
    .select("id")
    .single();

  if (error || !profile) {
    logger.error("[createProfile] insert failed", errorMessage(error));
    return {
      ok: false,
      code: "SERVER_ERROR",
      message:
        "We couldn't create the profile. Please try again.",
    };
  }

  const { error: relationshipError } = await supabase
    .from("profile_relationships")
    .insert({
      memory_profile_id: profile.id,
      caregiver_account_id: user.id,
      relationship_type: "owner",
      access_level: "admin",
      invite_status: "accepted",
      invited_by_account_id: user.id,
    });

  if (relationshipError) {
    logger.error(
      "[createProfile] relationship failed",
      errorMessage(relationshipError)
    );
    // Roll back the orphaned profile so the count stays consistent.
    await supabase
      .from("memory_profiles")
      .delete()
      .eq("id", profile.id);
    return {
      ok: false,
      code: "SERVER_ERROR",
      message:
        "We couldn't finish setting up the profile. Please try again.",
    };
  }

  logProfileCreation({
    userId: user.id,
    profileId: profile.id,
  });

  revalidatePath(DASHBOARD_PATH);

  return { ok: true, profileId: profile.id };
}

interface InviteCaregiverInput {
  email: string;
  relationshipType: string;
  accessLevel: string;
  memoryProfileId: string;
}

/**
 * Caregiver collaboration is a FAMILY-tier entitlement. Like createProfile's
 * limit, a blocked invite is EXPECTED business logic, not a system failure — so
 * we return a structured result and NEVER throw (Next.js redacts thrown Server
 * Action messages in production). The client switches on `code` to open the
 * upgrade flow.
 */
export type InviteCaregiverResult =
  | { success: true }
  | { error: string }
  | {
      error: string;
      code: "UPGRADE_REQUIRED";
      plan: BillingPlan;
    };

export async function inviteCaregiver({
  email,
  relationshipType,
  accessLevel,
  memoryProfileId,
}: InviteCaregiverInput): Promise<InviteCaregiverResult> {
  const { supabase, user } =
    await requireDashboardUser();

  // Entitlement gate (server-enforced, single source of truth = BILLING_PLANS).
  // FREE/PREMIUM: caregiver collaboration disabled → UPGRADE_REQUIRED.
  // FAMILY (and above): enabled → proceed.
  const { plan } = await checkPremium();

  if (!getUsageLimits(plan).caregiverCollaborationEnabled) {
    console.info(
      "[dashboard] caregiver_collaboration_upgrade_required",
      {
        userId: user.id,
        plan,
      }
    );

    return {
      error:
        "Caregiver collaboration is available on the Family plan. Upgrade to invite caregivers and family members.",
      code: "UPGRADE_REQUIRED",
      plan: plan as BillingPlan,
    };
  }

  // Authorization: only the OWNER of the target care profile may invite
  // caregivers to it (never trust a client-supplied memoryProfileId).
  if (
    !(await userOwnsProfile(
      user.id,
      memoryProfileId
    ))
  ) {
    console.warn(
      "[dashboard] invite_forbidden_not_owner",
      { userId: user.id, memoryProfileId }
    );
    return {
      error:
        "You don't have permission to invite caregivers to this profile.",
    };
  }

  // RC2: resolve the invitee by email SERVER-SIDE (scoped query, not a full-table fetch) — never pull the
  // whole user directory into the action, regardless of how broad the profiles SELECT policy is. LIKE
  // metacharacters are escaped so `.ilike` stays an EXACT (case-insensitive) match, not a wildcard pattern.
  const escapedEmail = email.trim().replace(/[\\%_]/g, (m) => `\\${m}`);
  const { data: caregiver, error: profilesError } =
    await supabase
      .from("profiles")
      .select("id,email")
      .ilike("email", escapedEmail)
      .limit(1)
      .maybeSingle();

  if (profilesError) {
    logger.error("[dashboard] invite profiles lookup failed", errorMessage(profilesError));

    return {
      error:
        "Failed to fetch profiles",
    };
  }

  if (!caregiver) {
    return {
      error:
        "No account found with that email",
    };
  }

  // LA5.1 (Apple 1.2): a block in EITHER direction between the owner and the invitee
  // prevents a NEW caregiver invitation — the concrete "prevent further interaction"
  // enforcement. Existing care access is untouched (block never removes a relationship;
  // that is the explicit revoke/leave path). Fail-OPEN if the moderation table isn't
  // applied yet (no blocks can exist pre-activation), so this can never break invites.
  const { data: blocks } = await supabaseAdmin
    .from("user_blocks")
    .select("id")
    .or(
      `and(blocker_account_id.eq.${user.id},blocked_account_id.eq.${caregiver.id}),` +
        `and(blocker_account_id.eq.${caregiver.id},blocked_account_id.eq.${user.id})`,
    )
    .limit(1);

  if (blocks && blocks.length > 0) {
    console.warn("[dashboard] invite_blocked_by_block", {
      userId: user.id,
      memoryProfileId,
    });
    // Neutral phrasing: don't confirm to the inviter that the OTHER party blocked them
    // (an owner who didn't create the block could otherwise infer it). If they blocked
    // the invitee, the conditional hint lets them resolve it.
    return {
      error:
        "This invitation can't be completed right now. If you've blocked this person, remove the block from Settings → Safety to invite them.",
    };
  }

  const { error: inviteError } =
    await supabase
      .from("caregiver_invites")
      .insert({
        email,
        memory_profile_id:
          memoryProfileId,
        invited_by_account_id:
          user.id,
        relationship_type:
          relationshipType,
        access_level: accessLevel,
        status: "pending",
      });

  if (inviteError) {
    logger.error("[dashboard] invite insert failed", errorMessage(inviteError));

    return {
      error:
        "Failed to create invite",
    };
  }

  logDashboardEvent(
    "invite_sent",
    {
      userId: user.id,
      profileId:
        memoryProfileId,
    }
  );

  revalidatePath(
    DASHBOARD_PATH
  );

  return {
    success: true,
  };
}

// =====================================
// CAREGIVER MANAGEMENT — list + revoke (owner-only)
// =====================================

/** One accepted caregiver on an owned care profile (for the management UI). */
export type CaregiverSummary = {
  caregiverAccountId: string;
  name: string;
  email: string;
  accessLevel: string | null;
  relationshipType: string | null;
};

export type ListCaregiversResult =
  | { success: true; caregivers: CaregiverSummary[] }
  | { error: string };

/**
 * List the accepted caregivers on a care profile — OWNER ONLY. Returns a structured
 * result (never throws). Uses the service-role client so it can read other users'
 * account rows for the name/email join, but ONLY after `userOwnsProfile` proves the
 * caller owns this profile, and scoped strictly to that profile's accepted, non-owner
 * relationships. A non-owner (e.g. a caregiver viewing a shared profile) gets `{ error }`
 * and the UI renders nothing.
 */
export async function listProfileCaregivers(
  memoryProfileId: string
): Promise<ListCaregiversResult> {
  const { user } = await requireDashboardUser();

  const profileId = (memoryProfileId ?? "").trim();
  if (!profileId) {
    return { error: "Profile is required." };
  }

  if (!(await userOwnsProfile(user.id, profileId))) {
    return {
      error:
        "You don't have permission to manage this profile's caregivers.",
    };
  }

  const { data: rows, error: relError } = await supabaseAdmin
    .from("profile_relationships")
    .select("caregiver_account_id, access_level, relationship_type")
    .eq("memory_profile_id", profileId)
    .eq("invite_status", "accepted");

  if (relError) {
    logger.error("[dashboard] list_caregivers_error", errorMessage(relError));
    return { error: "We couldn't load caregivers. Please try again." };
  }

  // Exclude the owner's own relationship row (relationship_type 'owner') and any row that
  // points back at the acting owner — those are never "caregivers" to remove.
  const caregiverRows = (rows ?? []).filter(
    (r) =>
      r.relationship_type !== "owner" &&
      typeof r.caregiver_account_id === "string" &&
      r.caregiver_account_id &&
      r.caregiver_account_id !== user.id
  );

  if (caregiverRows.length === 0) {
    return { success: true, caregivers: [] };
  }

  const ids = caregiverRows.map(
    (r) => r.caregiver_account_id as string
  );

  const { data: accounts } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .in("id", ids);

  const byId = new Map(
    (accounts ?? []).map((a: Record<string, unknown>) => [
      a.id as string,
      a,
    ])
  );

  const caregivers: CaregiverSummary[] = caregiverRows.map((r) => {
    const acc = byId.get(r.caregiver_account_id as string) as
      | Record<string, unknown>
      | undefined;
    const email =
      typeof acc?.email === "string" ? (acc.email as string) : "";
    const pick = (key: string) =>
      typeof acc?.[key] === "string" && (acc[key] as string).trim()
        ? (acc[key] as string).trim()
        : "";
    const name =
      pick("preferred_name") ||
      pick("full_name") ||
      pick("first_name") ||
      pick("name") ||
      pick("profile_name") ||
      (email ? email.split("@")[0] : "Caregiver");

    return {
      caregiverAccountId: r.caregiver_account_id as string,
      name,
      email,
      accessLevel:
        typeof r.access_level === "string" ? r.access_level : null,
      relationshipType:
        typeof r.relationship_type === "string"
          ? r.relationship_type
          : null,
    };
  });

  return { success: true, caregivers };
}

export type RevokeCaregiverResult =
  | { success: true }
  | { error: string };

/**
 * Revoke a caregiver's access to a care profile — OWNER ONLY. Deleting the accepted
 * `profile_relationships` row immediately removes access: `getAccessibleProfiles` and
 * `userCanAccessProfile` both require an ACCEPTED relationship, and `getActiveContext`
 * re-validates the active-workspace cookie on every read (a revoked caregiver falls back
 * to My Nest on their next request). Returns a structured result and NEVER throws.
 *
 * Deliberately NOT entitlement-gated: revoking access must always work, including after a
 * FAMILY->FREE downgrade (this is how an owner reclaims access from caregivers who
 * retained it). Authorization is `userOwnsProfile` only; the client-supplied ids are never
 * trusted for the authorization decision.
 */
export async function revokeCaregiver({
  memoryProfileId,
  caregiverAccountId,
}: {
  memoryProfileId: string;
  caregiverAccountId: string;
}): Promise<RevokeCaregiverResult> {
  const { user } = await requireDashboardUser();

  const profileId = (memoryProfileId ?? "").trim();
  const caregiverId = (caregiverAccountId ?? "").trim();

  if (!profileId || !caregiverId) {
    return { error: "Missing profile or caregiver." };
  }

  // A user can never remove themselves via the owner action (protects the owner's own
  // relationship row from being deleted through this path).
  if (caregiverId === user.id) {
    return {
      error: "You can't remove yourself from a profile you own.",
    };
  }

  // OWNER-ONLY. Non-owners (including accepted caregivers) can never revoke.
  if (!(await userOwnsProfile(user.id, profileId))) {
    console.warn("[dashboard] revoke_forbidden_not_owner", {
      userId: user.id,
      memoryProfileId: profileId,
    });
    return {
      error:
        "You don't have permission to manage this profile's caregivers.",
    };
  }

  // Verify the relationship exists and is not the owner row (never remove the owner).
  const { data: rel, error: relError } = await supabaseAdmin
    .from("profile_relationships")
    .select("relationship_type")
    .eq("memory_profile_id", profileId)
    .eq("caregiver_account_id", caregiverId)
    .maybeSingle();

  if (relError) {
    logger.error("[dashboard] revoke_lookup_error", errorMessage(relError));
    return { error: "We couldn't remove this caregiver. Please try again." };
  }

  if (!rel) {
    return {
      error: "This caregiver no longer has access to this profile.",
    };
  }

  if (rel.relationship_type === "owner") {
    return { error: "The profile owner can't be removed." };
  }

  // Remove the access grant — scoped to this owned profile + this caregiver, and never the
  // owner row (defense in depth on top of the checks above).
  const { error: deleteError } = await supabaseAdmin
    .from("profile_relationships")
    .delete()
    .eq("memory_profile_id", profileId)
    .eq("caregiver_account_id", caregiverId)
    .neq("relationship_type", "owner");

  if (deleteError) {
    logger.error("[dashboard] revoke_delete_error", errorMessage(deleteError));
    return { error: "We couldn't remove this caregiver. Please try again." };
  }

  logDashboardEvent("caregiver_revoked", {
    userId: user.id,
    profileId,
  });

  revalidatePath(DASHBOARD_PATH);

  return { success: true };
}

export async function acceptInvite(
  formData: FormData
) {
  const { supabase, user } =
    await requireDashboardUser();

  const inviteId = formData.get(
    "invite_id"
  ) as string;

  const {
    data: invite,
    error: inviteFetchError,
  } = await supabase
    .from("caregiver_invites")
    .select("*")
    .eq("id", inviteId)
    .single();

  if (inviteFetchError || !invite) {
    logger.error("[dashboard] invite fetch failed", errorMessage(inviteFetchError));

    throw new Error(
      "Invite not found"
    );
  }

  // Authorization: only the addressed recipient may accept, and only while the
  // invite is still pending. Prevents accepting invitations meant for others.
  const inviteEmail = (
    invite.email ?? ""
  ).toLowerCase();
  const userEmail = (
    user.email ?? ""
  ).toLowerCase();

  if (
    !inviteEmail ||
    inviteEmail !== userEmail ||
    invite.status !== "pending"
  ) {
    console.warn(
      "[dashboard] accept_invite_forbidden",
      {
        userId: user.id,
        inviteId,
        status: invite.status,
      }
    );
    throw new Error(
      "This invitation is not addressed to you."
    );
  }

  // LA5.1 (Apple 1.2): also enforce the block at ACCEPT time, not just at invite
  // creation — a pending invite that predates a block must not become interaction.
  // A block in EITHER direction between the accepter and the inviter blocks it.
  // Fail-OPEN if the moderation table isn't applied yet.
  const inviterId = invite.invited_by_account_id;
  if (typeof inviterId === "string" && inviterId) {
    const { data: blocks } = await supabaseAdmin
      .from("user_blocks")
      .select("id")
      .or(
        `and(blocker_account_id.eq.${user.id},blocked_account_id.eq.${inviterId}),` +
          `and(blocker_account_id.eq.${inviterId},blocked_account_id.eq.${user.id})`,
      )
      .limit(1);
    if (blocks && blocks.length > 0) {
      console.warn("[dashboard] accept_invite_blocked_by_block", {
        userId: user.id,
        inviteId,
      });
      throw new Error(
        "This invitation can't be accepted while a block is in place between your accounts.",
      );
    }
  }

  const { error: relationshipError } =
    await supabase
      .from("profile_relationships")
      .insert({
        memory_profile_id:
          invite.memory_profile_id,
        caregiver_account_id:
          user.id,
        relationship_type:
          invite.relationship_type,
        access_level:
          invite.access_level,
        invite_status: "accepted",
        invited_by_account_id:
          invite.invited_by_account_id,
      });

  if (relationshipError) {
    logger.error("[dashboard] invite accept relationship failed", errorMessage(relationshipError));

    throw new Error(
      "Failed to create relationship"
    );
  }

  const { error: updateError } =
    await supabase
      .from("caregiver_invites")
      .update({
        status: "accepted",
        accepted_by_account_id:
          user.id,
      })
      .eq("id", inviteId);

  if (updateError) {
    logger.error("[dashboard] invite status update failed", errorMessage(updateError));

    throw new Error(
      "Failed to update invite"
    );
  }

  revalidatePath(
    DASHBOARD_PATH
  );
}

export async function declineInvite(
  formData: FormData
) {
  const { supabase, user } =
    await requireDashboardUser();

  const inviteId = formData.get(
    "invite_id"
  ) as string;

  // Authorization (app-layer — do NOT rely on RLS alone): only the ADDRESSED recipient
  // (by verified session email) or the INVITER may decline, and only while pending. Without
  // this, a client-supplied invite_id lets any user decline anyone's invitation (IDOR).
  const {
    data: invite,
    error: fetchError,
  } = await supabase
    .from("caregiver_invites")
    .select(
      "email, invited_by_account_id, status"
    )
    .eq("id", inviteId)
    .single();

  if (fetchError || !invite) {
    throw new Error("Invite not found");
  }

  const inviteEmail = (
    invite.email ?? ""
  ).toLowerCase();
  const userEmail = (
    user.email ?? ""
  ).toLowerCase();
  const authorized =
    (Boolean(inviteEmail) && inviteEmail === userEmail) ||
    invite.invited_by_account_id === user.id;

  if (!authorized || invite.status !== "pending") {
    console.warn(
      "[dashboard] decline_invite_forbidden",
      {
        userId: user.id,
        inviteId,
        status: invite.status,
      }
    );
    throw new Error(
      "This invitation is not addressed to you."
    );
  }

  const { error } = await supabase
    .from("caregiver_invites")
    .update({
      status: "declined",
    })
    .eq("id", inviteId);

  if (error) {
    logger.error("[dashboard] invite decline failed", errorMessage(error));

    throw new Error(
      "Failed to decline invite"
    );
  }

  revalidatePath(
    DASHBOARD_PATH
  );
}