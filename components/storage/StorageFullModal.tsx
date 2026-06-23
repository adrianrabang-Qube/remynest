"use client";

import { useState } from "react";

import { useIsNativePlatform } from "@/lib/platform";
import type { StoragePlanTier } from "@/lib/storage/plans";
import ModalShell from "@/components/storage/ModalShell";
import StorageUpgradeModal from "@/components/storage/StorageUpgradeModal";

/** The `quota` object returned in the upload routes' HTTP 413 body. */
export interface UploadQuotaPayload {
  tier?: StoragePlanTier;
  currentUsage?: string;
  limit?: string;
  remaining?: string;
  projectedUsage?: string;
  reason?: string;
}

/**
 * Surfaces the upload-enforcement 413 `{ error, quota }` payload as a "Storage
 * full" modal. Web shows an Upgrade CTA (opens StorageUpgradeModal); native shows
 * only neutral free-up-space guidance (Apple 3.1.1/3.1.3 — no purchase entry).
 */
export default function StorageFullModal({
  quota,
  onClose,
}: {
  quota: UploadQuotaPayload | null;
  onClose: () => void;
}) {
  const native = useIsNativePlatform();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (!quota) return null;

  return (
    <>
      <ModalShell label="Storage full" onClose={onClose}>
        <h2 className="mb-1 text-2xl font-bold">Storage full</h2>
        <p className="mb-5 text-gray-600">
          This upload would exceed your available storage.
        </p>

        <div className="mb-6 space-y-2 rounded-2xl bg-gray-50 p-4 text-sm">
          <Row
            label="Current"
            value={`${quota.currentUsage ?? "—"} / ${quota.limit ?? "—"}`}
          />
          <Row label="After this upload" value={quota.projectedUsage ?? "—"} />
          <Row label="Remaining" value={quota.remaining ?? "—"} />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border py-3"
          >
            {native ? "Got it" : "Free up space"}
          </button>
          {!native && (
            <button
              type="button"
              onClick={() => setUpgradeOpen(true)}
              className="flex-1 rounded-xl bg-black py-3 font-medium text-white"
            >
              Upgrade
            </button>
          )}
        </div>

        {native && (
          <p className="mt-4 text-center text-xs text-gray-500">
            Remove photos or files you no longer need to free up space.
          </p>
        )}
      </ModalShell>

      {upgradeOpen && (
        <StorageUpgradeModal
          open
          currentTier={quota.tier ?? "FREE"}
          onClose={() => setUpgradeOpen(false)}
        />
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}
