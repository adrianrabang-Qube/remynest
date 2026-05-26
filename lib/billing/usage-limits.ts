import {
  BillingPlan,
  getPlan,
} from "./plans";

export interface UsageLimits {
  maxCareProfiles: number | "unlimited";

  maxStorageGB: number | "unlimited";

  semanticSearchEnabled: boolean;

  voiceMemoriesEnabled: boolean;

  caregiverCollaborationEnabled: boolean;
}

export function getUsageLimits(
  plan: BillingPlan = "FREE"
): UsageLimits {
  const config = getPlan(plan);

  return {
    maxCareProfiles:
      config.careProfiles,

    maxStorageGB:
      config.storageGB,

    semanticSearchEnabled:
      config.semanticSearch,

    voiceMemoriesEnabled:
      config.voiceMemories,

    caregiverCollaborationEnabled:
      config.caregiverCollaboration,
  };
}

export function canCreateCareProfile(
  currentProfileCount: number,
  plan: BillingPlan = "FREE"
): boolean {
  const limits =
    getUsageLimits(plan);

  if (
    limits.maxCareProfiles ===
    "unlimited"
  ) {
    return true;
  }

  return (
    currentProfileCount <
    limits.maxCareProfiles
  );
}

export function canUseSemanticSearch(
  plan: BillingPlan = "FREE"
): boolean {
  return getUsageLimits(plan)
    .semanticSearchEnabled;
}

export function canUseVoiceMemories(
  plan: BillingPlan = "FREE"
): boolean {
  return getUsageLimits(plan)
    .voiceMemoriesEnabled;
}