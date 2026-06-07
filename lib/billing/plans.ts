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

    monthlyPriceId:
      process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,

    yearlyPriceId:
      process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID,

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

/**
 * SINGLE SOURCE OF TRUTH for human-readable monthly price labels shown in the
 * UI (Account Status, Billing modal, Billing section). Display-only — checkout
 * still resolves real prices from Stripe price ids via getPriceId(). Keep these
 * in sync with Stripe; do not hardcode prices in components.
 */
export const PLAN_PRICE_LABELS: Partial<Record<BillingPlan, string>> = {
  PREMIUM: "€9.99/mo",
  FAMILY: "€19.99/mo",
};

export function getPlanPriceLabel(
  plan: BillingPlan
): string {
  return PLAN_PRICE_LABELS[plan] ?? "";
}

/**
 * Canonical reverse lookup: Stripe price id → BillingPlan, using the same
 * BILLING_PLANS config that getPriceId() reads. Returns null for an unknown
 * price id (e.g. unconfigured/legacy). FREE has no price ids and never matches.
 */
export function planFromPriceId(
  priceId: string | null | undefined
): BillingPlan | null {
  if (!priceId) return null;

  for (const config of Object.values(BILLING_PLANS)) {
    if (
      config.monthlyPriceId === priceId ||
      config.yearlyPriceId === priceId
    ) {
      return config.name;
    }
  }

  return null;
}

export function getPriceId(
  plan: BillingPlan,
  interval: BillingInterval = "monthly"
) {
  const config = getPlan(plan);

  const priceId =
    interval === "yearly"
      ? config.yearlyPriceId
      : config.monthlyPriceId;

  console.info("[billing] price lookup", {
    plan,
    interval,
    resolved: !!priceId,
    envKey:
      interval === "yearly"
        ? `STRIPE_${plan}_YEARLY_PRICE_ID`
        : `STRIPE_${plan}_MONTHLY_PRICE_ID`,
  });

  if (!priceId) {
    console.error(
      `[billing] Missing Stripe price id for ${plan} (${interval})`,
      {
        monthly: config.monthlyPriceId ?? null,
        yearly: config.yearlyPriceId ?? null,
        availableEnv: {
          premiumMonthly:
            !!process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
          premiumYearly:
            !!process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID,
          familyMonthly:
            !!process.env.STRIPE_FAMILY_MONTHLY_PRICE_ID,
          familyYearly:
            !!process.env.STRIPE_FAMILY_YEARLY_PRICE_ID,
        },
      }
    );

    throw new Error(
      `Missing Stripe price id for ${plan} (${interval})`
    );
  }

  return priceId;
}