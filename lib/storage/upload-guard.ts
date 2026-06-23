import { checkStorageQuota } from "./enforcement";
import { resolveStoragePoolMembers } from "./pool";

/**
 * Pre-upload quota guard for the memory upload pipeline. Validates the ENTIRE
 * batch (total bytes) BEFORE any storage write, reusing checkStorageQuota /
 * getStorageUsage — no duplicated accounting. Family-ready: pool members are
 * resolved via resolveStoragePoolMembers (today `[userId]`) and passed through,
 * so a future family pool needs NO change here. Fails CLOSED (checkStorageQuota
 * does) and never throws.
 */
export interface UploadQuotaResult {
  allowed: boolean;
  reason?: string;
  tier: string;
  // raw bytes (machine)
  currentUsageBytes: number;
  limitBytes: number;
  remainingBytes: number;
  uploadBytes: number;
  projectedBytes: number;
  percentUsed: number;
  projectedPercentUsed: number;
  // formatted (UI-ready)
  currentUsage: string;
  limit: string;
  remaining: string;
  projectedUsage: string;
}

const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const i = Math.min(
    UNITS.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${UNITS[i]}`;
}

/** Sum the byte size of a batch of upload files (File-like with numeric `.size`). */
export function totalUploadBytes(files: readonly unknown[]): number {
  let total = 0;
  for (const f of files) {
    const size = (f as { size?: unknown })?.size;
    if (typeof size === "number" && Number.isFinite(size) && size > 0) {
      total += size;
    }
  }
  return total;
}

/**
 * Validate a memory upload batch against the user's (or pool's) storage quota.
 * Returns a structured result with the full UI feedback payload. A batch with 0
 * bytes (text-only memory, remove-only edit) is always allowed — there is nothing
 * to enforce, even if the account is already at/over the limit.
 */
export async function enforceUploadQuota(
  userId: string,
  files: readonly unknown[]
): Promise<UploadQuotaResult> {
  const uploadBytes = totalUploadBytes(files);

  // Nothing to upload -> nothing to enforce; skip the ledger read entirely
  // (text-only memory / remove-only edit — the common no-media path).
  if (uploadBytes === 0) {
    return {
      allowed: true,
      tier: "FREE",
      currentUsageBytes: 0,
      limitBytes: 0,
      remainingBytes: 0,
      uploadBytes: 0,
      projectedBytes: 0,
      percentUsed: 0,
      projectedPercentUsed: 0,
      currentUsage: "0 B",
      limit: "0 B",
      remaining: "0 B",
      projectedUsage: "0 B",
    };
  }

  const memberUserIds = await resolveStoragePoolMembers(userId);
  const check = await checkStorageQuota(userId, uploadBytes, {
    memberUserIds,
  });
  const u = check.usage;

  const allowed = check.allowed;
  const projectedBytes = check.projectedBytes;
  const projectedPercentUsed =
    u.limitBytes > 0
      ? Math.min(100, Math.round((projectedBytes / u.limitBytes) * 100))
      : projectedBytes > 0
        ? 100
        : 0;

  return {
    allowed,
    reason: allowed ? undefined : check.reason,
    tier: u.tier,
    currentUsageBytes: u.usedBytes,
    limitBytes: u.limitBytes,
    remainingBytes: u.remainingBytes,
    uploadBytes,
    projectedBytes,
    percentUsed: u.percentUsed,
    projectedPercentUsed,
    currentUsage: formatBytes(u.usedBytes),
    limit: formatBytes(u.limitBytes),
    remaining: formatBytes(u.remainingBytes),
    projectedUsage: formatBytes(projectedBytes),
  };
}
