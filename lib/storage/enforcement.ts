import { getStorageUsage, type StorageUsage } from "./usage";

export interface StorageQuotaCheck {
  allowed: boolean;
  projectedBytes: number;
  overageBytes: number;
  usage: StorageUsage;
  reason?: string;
}

/**
 * Pre-upload quota check primitive. Projects current usage + the bytes a pending
 * upload would add and reports whether it fits the tier limit. Returns a
 * STRUCTURED result and NEVER throws (expected business-rule outcomes are
 * returned, per the engineering rules).
 *
 * NOTE: not yet wired into the (frozen) memory-media upload pipeline — this is
 * the enforcement primitive that future upload integration will call.
 * Future-proof for any media type (images/videos/voice/documents): it operates
 * purely on byte counts.
 */
export async function checkStorageQuota(
  userId: string,
  additionalBytes: number,
  options?: { memberUserIds?: string[] }
): Promise<StorageQuotaCheck> {
  const usage = await getStorageUsage(userId, options);
  const add = Number.isFinite(additionalBytes)
    ? Math.max(0, additionalBytes)
    : 0;
  const projectedBytes = usage.usedBytes + add;
  // Fail CLOSED on a degraded (failed) usage read — never approve an upload we
  // could not verify against the quota.
  const allowed = !usage.degraded && projectedBytes <= usage.limitBytes;

  return {
    allowed,
    projectedBytes,
    overageBytes: Math.max(0, projectedBytes - usage.limitBytes),
    usage,
    reason: usage.degraded
      ? "Storage usage temporarily unavailable"
      : allowed
        ? undefined
        : "Storage limit exceeded",
  };
}
