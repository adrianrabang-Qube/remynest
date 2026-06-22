import { supabaseAdmin } from "@/utils/supabase/admin";
import {
  getStoragePlan,
  DEFAULT_STORAGE_TIER,
  type StoragePlanTier,
} from "./plans";

export interface StorageUsage {
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
  /** Whole-number percentage 0..100. */
  percentUsed: number;
  tier: StoragePlanTier;
  attachmentCount: number;
  /** Users summed into this figure — [userId] today, all members for a family pool. */
  memberUserIds: string[];
  /** True when the usage query failed — callers must NOT treat usedBytes as a real 0. */
  degraded: boolean;
}

/**
 * Resolve a user's STORAGE tier. Storage plans are not sold yet, so everyone is
 * FREE. This is the single seam where a future subscription layer maps a billing
 * subscription -> a storage tier; until then it stays decoupled from the frozen
 * `lib/billing`.
 */
export function resolveStorageTier(): StoragePlanTier {
  // Future-billing seam: map the user's subscription -> a storage tier here.
  return DEFAULT_STORAGE_TIER;
}

/**
 * Sum ledger usage across a set of users and compare against the tier limit.
 * Single-user today (`[userId]`); a family pool passes every member id — the same
 * accounting path, no redesign. Uses the service-role client and is ALWAYS
 * explicitly scoped by the member id set (service role bypasses RLS).
 */
export async function getStorageUsage(
  userId: string,
  options?: { memberUserIds?: string[]; tier?: StoragePlanTier }
): Promise<StorageUsage> {
  const memberUserIds =
    options?.memberUserIds && options.memberUserIds.length > 0
      ? options.memberUserIds
      : [userId];

  const { data, error } = await supabaseAdmin
    .from("storage_account_usage")
    .select("used_bytes, attachment_count")
    .in("user_id", memberUserIds); // explicit scope — service role bypasses RLS

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

  const tier = options?.tier ?? resolveStorageTier();
  const limitBytes = getStoragePlan(tier).limitBytes;
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
