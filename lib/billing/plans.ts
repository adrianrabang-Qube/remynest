export type BillingInterval = "monthly" | "yearly";

export type BillingPlan =
  | "FREE"
  | "PREMIUM"
  | "FAMILY"
  | "ENTERPRISE";

export interface PlanConfig {
  name: BillingPlan;

  displayName: string;

  monthlyPriceId?: string;
  yearlyPriceId?: string;

  careProfiles: number | "unlimited";

  storageGB: number | "unlimited";

  aiEnabled: boolean;

  semanticSearch: boolean;

  voiceMemories: boolean;

  caregiverCollaboration: boolean;

  enterpriseFeatures: boolean;
}

export const BILLING_PLANS: Record<
  BillingPlan,
  PlanConfig
> = {
  FREE: {
    name: "FREE",

    displayName: "Free",

    careProfiles: 1,

    storageGB: 1,

    aiEnabled: true,

    semanticSearch: false,

    voiceMemories: false,

    caregiverCollaboration: false,

    enterpriseFeatures: false,
  },

  PREMIUM: {
    name: "PREMIUM",

    displayName: "Premium",

    monthlyPriceId:
      process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,

    yearlyPriceId:
      process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID,

    careProfiles: 3,

    storageGB: 10,

    aiEnabled: true,

    semanticSearch: true,

    voiceMemories: true,

    caregiverCollaboration: false,

    enterpriseFeatures: false,
  },

  FAMILY: {
    name: "FAMILY",

    displayName: "Family",

    monthlyPriceId:
      process.env.STRIPE_FAMILY_MONTHLY_PRICE_ID,

    yearlyPriceId:
      process.env.STRIPE_FAMILY_YEARLY_PRICE_ID,

    careProfiles: 5,

    storageGB: 50,

    aiEnabled: true,

    semanticSearch: true,

    voiceMemories: true,

    caregiverCollaboration: true,

    enterpriseFeatures: false,
  },

  ENTERPRISE: {
    name: "ENTERPRISE",

    displayName: "Enterprise",

    careProfiles: "unlimited",

    storageGB: "unlimited",

    aiEnabled: true,

    semanticSearch: true,

    voiceMemories: true,

    caregiverCollaboration: true,

    enterpriseFeatures: true,
  },
};

export function getPlan(
  plan: BillingPlan = "FREE"
) {
  return BILLING_PLANS[plan];
}