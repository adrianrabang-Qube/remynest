"use client";

import { useState } from "react";

import { useIsNativePlatform } from "@/lib/platform";
import { formatBytes } from "@/lib/storage/format";
import { useStorageUsage } from "@/components/storage/useStorageUsage";
import StorageUpgradeModal from "@/components/storage/StorageUpgradeModal";

/**
 * Proactive near-limit storage alert. Renders nothing below 80%; amber at ≥80%
 * ("running low"), red at ≥95% ("almost full"). Web shows an Upgrade CTA →
 * StorageUpgradeModal; native shows neutral free-up-space guidance (no purchase UI).
 */
export default function StorageWarningBanner() {
  const { data } = useStorageUsage();
  const native = useIsNativePlatform();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (!data || data.degraded) return null;
  const pct = data.percentUsed;
  if (pct < 80) return null;

  const critical = pct >= 95;
  const tone = critical
    ? "border-red-200 bg-red-50 text-red-800"
    : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <>
      <div
        role="status"
        className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${tone}`}
      >
        <p className="text-sm">
          <span className="font-semibold">
            {critical ? "Storage almost full" : "Storage running low"}
          </span>{" "}
          — {formatBytes(data.usedBytes)} of {formatBytes(data.limitBytes)} used
          ({pct}%).{critical ? " New uploads may be blocked." : ""}
        </p>
        {native ? (
          <span className="text-xs">
            Free up space by removing items you no longer need.
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setUpgradeOpen(true)}
            className="shrink-0 rounded-xl bg-black px-3 py-1.5 text-xs font-medium text-white"
          >
            Upgrade
          </button>
        )}
      </div>

      {upgradeOpen && (
        <StorageUpgradeModal
          open
          currentTier={data.tier}
          onClose={() => setUpgradeOpen(false)}
        />
      )}
    </>
  );
}
