/**
 * Storage plan abstraction (infrastructure only — NO pricing / checkout / billing).
 *
 * Limits live here as configuration so a future subscription layer can map a
 * billing subscription -> a storage tier without redesign. This is intentionally
 * SEPARATE from `lib/billing/plans.ts` (which is frozen): the bridge between them
 * is `resolveStorageTier()` in `./usage`, not a shared config.
 *
 * FAMILY is `pooled` — its limit applies to a SHARED pool summed across all
 * member users, not to each member individually.
 */
export type StoragePlanTier = "FREE" | "STARTER" | "PREMIUM" | "FAMILY";

export const BYTES_PER_GB = 1024 * 1024 * 1024;

export interface StoragePlanConfig {
  tier: StoragePlanTier;
  displayName: string;
  /** Hard storage ceiling for this tier, in bytes. Placeholder values — not pricing. */
  limitBytes: number;
  /** When true the limit is a SHARED pool across member users (family). */
  pooled: boolean;
}

export const STORAGE_PLANS: Record<StoragePlanTier, StoragePlanConfig> = {
  FREE: {
    tier: "FREE",
    displayName: "Free",
    limitBytes: 1 * BYTES_PER_GB,
    pooled: false,
  },
  STARTER: {
    tier: "STARTER",
    displayName: "Starter",
    limitBytes: 20 * BYTES_PER_GB,
    pooled: false,
  },
  PREMIUM: {
    tier: "PREMIUM",
    displayName: "Premium",
    limitBytes: 100 * BYTES_PER_GB,
    pooled: false,
  },
  FAMILY: {
    tier: "FAMILY",
    displayName: "Family",
    limitBytes: 100 * BYTES_PER_GB,
    pooled: true,
  },
};

export const DEFAULT_STORAGE_TIER: StoragePlanTier = "FREE";

export function getStoragePlan(tier: StoragePlanTier): StoragePlanConfig {
  return STORAGE_PLANS[tier] ?? STORAGE_PLANS[DEFAULT_STORAGE_TIER];
}
