import { BILLING_PLANS, type BillingPlan } from "@/lib/billing/plans";

/**
 * Storage capacity — COMPOSED ENTITLEMENT model (authoritative, 2026-07-13).
 *
 * Capacity is the SUM OF GRANTS, resolved in exactly ONE place (this file), not a
 * single hardcoded plan lookup. Today there is exactly one grant per user — the
 * subscription plan's included storage (`BILLING_PLANS[tier].storageGB`) — so
 * behaviour is byte-identical to the previous direct lookup. The composition
 * layer exists so every future capacity source is a GRANT, not a redesign:
 *
 *  - "storage-pack"  → a paid booster add-on (e.g. +100 GB). DELIBERATELY NOT
 *    SHIPPED: launching a second purchasable product dimension is a deferred
 *    product decision (operator approval + real usage data required — see the
 *    CLAUDE.md storage-model note). When approved, the future wiring is:
 *    Stripe add-on price → webhook writes a grant row → `getStorageUsage`
 *    fetches the user's grant rows in its existing Promise.all → passes them
 *    here as `extraGrants`. Nothing else changes — enforcement, the ledger,
 *    the usage API, and the UI meter all read the composed total.
 *  - "promotion"     → time-boxed marketing grants (e.g. +5 GB launch bonus).
 *  - "grandfathered" → preserved capacity across future plan re-pricing, so a
 *    tier change never strands existing users' data.
 *
 * Family pooling note: grants attach to the PLAN OWNER's account (the payer);
 * pool capacity = the owner's composed total, while pool USAGE is already
 * summed across `memberUserIds` in `getStorageUsage`. Never attach capacity
 * grants to individual family members.
 *
 * INVARIANTS: pure + synchronous (no DB/clock — callers supply any future grant
 * rows); never throws; a lapsed/absent grant simply doesn't appear (capacity
 * degrades to the plan base — never below it); "unlimited" short-circuits the
 * sum (no MAX_SAFE_INTEGER arithmetic overflow).
 */

export const BYTES_PER_GB = 1024 * 1024 * 1024;

export type StorageGrantSource =
  | "plan"
  | "storage-pack"
  | "promotion"
  | "grandfathered";

export interface StorageCapacityGrant {
  source: StorageGrantSource;
  /** Human label for the capacity breakdown UI ("Included with Premium", "+100 GB pack"). */
  label: string;
  /** Grant size in bytes; Number.MAX_SAFE_INTEGER represents unlimited. */
  bytes: number;
}

export interface StorageCapacity {
  /** The enforceable limit: sum of all grants (MAX_SAFE_INTEGER when unlimited). */
  totalBytes: number;
  /** Every capacity source, plan base first — the future usage-UI breakdown. */
  grants: StorageCapacityGrant[];
  unlimited: boolean;
}

export function storageGbToBytes(gb: number | "unlimited"): number {
  return gb === "unlimited" ? Number.MAX_SAFE_INTEGER : gb * BYTES_PER_GB;
}

/** The plan's included-storage grant — the base every user always has. */
export function planStorageGrant(tier: BillingPlan): StorageCapacityGrant {
  const plan = BILLING_PLANS[tier];
  return {
    source: "plan",
    label: `Included with ${plan.displayName}`,
    bytes: storageGbToBytes(plan.storageGB),
  };
}

/**
 * Resolve a user's total storage capacity from their plan plus any additional
 * grants. `extraGrants` is empty today (no storage-pack SKUs exist); it is the
 * single seam future grant sources plug into.
 */
export function resolveStorageCapacity(
  tier: BillingPlan,
  extraGrants: StorageCapacityGrant[] = [],
): StorageCapacity {
  const grants = [planStorageGrant(tier), ...extraGrants];
  const unlimited = grants.some((g) => g.bytes === Number.MAX_SAFE_INTEGER);
  const totalBytes = unlimited
    ? Number.MAX_SAFE_INTEGER
    : grants.reduce((sum, g) => sum + Math.max(0, g.bytes), 0);
  return { totalBytes, grants, unlimited };
}
