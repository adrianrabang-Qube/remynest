import type { ProfileSummary } from "../types";

export function useProfileAccess(
  profile: ProfileSummary,
) {
  const isPremium =
    profile.isPremium ||
    profile.plan === "premium" ||
    profile.plan === "admin";

  const isCaregiver =
    profile.role === "caregiver";

  const isAdmin =
    profile.role === "admin";

  const canAccessVault =
    isPremium;

  const canManageCaregiving =
    isCaregiver || isAdmin;

  const canManageBilling =
    true;

  const canManageGDPR =
    true;

  return {
    isPremium,
    isCaregiver,
    isAdmin,

    canAccessVault,
    canManageCaregiving,
    canManageBilling,
    canManageGDPR,
  };
}
