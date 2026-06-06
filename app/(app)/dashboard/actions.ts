"use server";

import { revalidatePath } from "next/cache";

import { checkPremium } from "@/lib/premium";

import type { BillingPlan } from "@/lib/billing/plans";
import {
  canCreateCareProfile,
  getUsageLimits,
} from "@/lib/billing/usage-limits";

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
    console.error(
      "[createProfile] limit count failed",
      countError
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
    console.error("[createProfile] insert failed", error);
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
    console.error(
      "[createProfile] relationship failed",
      relationshipError
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

export async function inviteCaregiver({
  email,
  relationshipType,
  accessLevel,
  memoryProfileId,
}: InviteCaregiverInput) {
  const { supabase, user } =
    await requireDashboardUser();

  const { data: profiles, error: profilesError } =
    await supabase
      .from("profiles")
      .select("id,email");

  if (profilesError) {
    console.error(profilesError);

    return {
      error:
        "Failed to fetch profiles",
    };
  }

  const caregiver = profiles?.find(
    (
      p: {
        id: string;
        email: string | null;
      }
    ) =>
      p.email?.toLowerCase() ===
      email.toLowerCase()
  );

  if (!caregiver) {
    return {
      error:
        "No account found with that email",
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
    console.error(inviteError);

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
    console.error(inviteFetchError);

    throw new Error(
      "Invite not found"
    );
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
    console.error(relationshipError);

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
    console.error(updateError);

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
  const { supabase } =
    await requireDashboardUser();

  const inviteId = formData.get(
    "invite_id"
  ) as string;

  const { error } = await supabase
    .from("caregiver_invites")
    .update({
      status: "declined",
    })
    .eq("id", inviteId);

  if (error) {
    console.error(error);

    throw new Error(
      "Failed to decline invite"
    );
  }

  revalidatePath(
    DASHBOARD_PATH
  );
}