import { supabaseAdmin } from "@/utils/supabase/admin";
import { BILLING_PLANS, type BillingPlan } from "@/lib/billing/plans";
import { resolveSubscription } from "@/lib/billing/resolve-subscription";

const BYTES_PER_GB = 1024 * 1024 * 1024;

export interface StorageUsage {
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
  /** Whole-number percentage 0..100. */
  percentUsed: number;
  /** The user's billing plan — capacity comes from BILLING_PLANS[tier].storageGB. */
  tier: BillingPlan;
  attachmentCount: number;
  /** Users summed into this figure — [userId] today, all members for a family pool. */
  memberUserIds: string[];
  /** True when the usage query failed — callers must NOT treat usedBytes as a real 0. */
  degraded: boolean;
}

function storageGbToBytes(gb: number | "unlimited"): number {
  return gb === "unlimited" ? Number.MAX_SAFE_INTEGER : gb * BYTES_PER_GB;
}

/**
 * Resolve a user's plan from their subscription — the SINGLE source of truth for
 * storage capacity: `subscription_plan -> BILLING_PLANS -> storageGB -> quota`
 * (storage is bundled with subscription tiers, not sold standalone). On a
 * profile-read failure, defaults to FREE (the safe minimum capacity).
 */
export async function resolveStorageTier(
  userId: string
): Promise<BillingPlan> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("is_premium, subscription_status, subscription_plan")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("[storage-usage] profile read failed", error);
    return "FREE";
  }
  // resolveSubscription collapses ENTERPRISE -> PREMIUM; honor ENTERPRISE directly
  // so its unlimited capacity isn't capped at the PREMIUM tier.
  if ((data?.subscription_plan ?? "").toUpperCase() === "ENTERPRISE") {
    return "ENTERPRISE";
  }
  return resolveSubscription(data).plan;
}

/**
 * Sum ledger usage across a set of users and compare against the PLAN limit.
 * Single-user today (`[userId]`); a family pool passes every member id — the same
 * accounting path, no redesign. Uses the service-role client and is ALWAYS
 * explicitly scoped by the member id set (service role bypasses RLS).
 */
export async function getStorageUsage(
  userId: string,
  options?: { memberUserIds?: string[]; tier?: BillingPlan }
): Promise<StorageUsage> {
  const memberUserIds =
    options?.memberUserIds && options.memberUserIds.length > 0
      ? options.memberUserIds
      : [userId];

  // Resolve the plan (capacity) and the usage in parallel.
  const [tier, usageRes] = await Promise.all([
    options?.tier ? Promise.resolve(options.tier) : resolveStorageTier(userId),
    supabaseAdmin
      .from("storage_account_usage")
      .select("used_bytes, attachment_count")
      .in("user_id", memberUserIds), // explicit scope — service role bypasses RLS
  ]);

  const { data, error } = usageRes;
  if (error) {
    console.error("[storage-usage] query failed", error);
  }

  const rows = data ?? [];
  const usedBytes = rows.reduce(
    (sum, r) => sum + Number(r.used_bytes ?? 0),
    0
  );
  const attachmentCount = rows.reduce(
    (sum, r) => sum + Number(r.attachment_count ?? 0),
    0
  );

  const limitBytes = storageGbToBytes(BILLING_PLANS[tier].storageGB);
  const remainingBytes = Math.max(0, limitBytes - usedBytes);
  const percentUsed =
    limitBytes > 0
      ? Math.min(100, Math.round((usedBytes / limitBytes) * 100))
      : usedBytes > 0
        ? 100
        : 0;

  return {
    usedBytes,
    limitBytes,
    remainingBytes,
    percentUsed,
    tier,
    attachmentCount,
    memberUserIds,
    degraded: !!error,
  };
}
