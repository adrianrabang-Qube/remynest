import {
  BillingPlan,
} from "./plans";

import {
  getUsageLimits,
  canUseSemanticSearch,
  canUseVoiceMemories,
} from "./usage-limits";

export function isPaidPlan(
  plan: BillingPlan
): boolean {
  return (
    plan === "PREMIUM" ||
    plan === "FAMILY" ||
    plan === "ENTERPRISE"
  );
}

export function requirePaidPlan(
  plan: BillingPlan
) {
  if (!isPaidPlan(plan)) {
    throw new Error(
      "Premium subscription required."
    );
  }
}

export function requireSemanticSearch(
  plan: BillingPlan
) {
  if (
    !canUseSemanticSearch(
      plan
    )
  ) {
    throw new Error(
      "Semantic search requires an upgraded plan."
    );
  }
}

export function requireVoiceMemories(
  plan: BillingPlan
) {
  if (
    !canUseVoiceMemories(
      plan
    )
  ) {
    throw new Error(
      "Voice memories require an upgraded plan."
    );
  }
}

export function requireCaregiverCollaboration(
  plan: BillingPlan
) {
  const limits =
    getUsageLimits(plan);

  if (
    !limits
      .caregiverCollaborationEnabled
  ) {
    throw new Error(
      "Caregiver collaboration requires Family or Enterprise."
    );
  }
}