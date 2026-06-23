"use client";

import { useState } from "react";

import { useIsNativePlatform } from "@/lib/platform";
import { formatBytes } from "@/lib/storage/format";
import { STORAGE_PLANS } from "@/lib/storage/plans";
import { useStorageUsage } from "@/components/storage/useStorageUsage";
import StorageUpgradeModal from "@/components/storage/StorageUpgradeModal";

/**
 * Storage usage display. `full` (settings) shows plan + used/limit/remaining +
 * percent + bar + (web) an upgrade CTA. `compact` (dashboard widget) shows a
 * condensed used/limit + percent + bar. Reuses GET /api/storage/usage.
 */
export default function StorageUsageCard({
  variant = "full",
}: {
  variant?: "full" | "compact";
}) {
  const { data, isLoading, isError } = useStorageUsage();
  const native = useIsNativePlatform();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="h-16 animate-pulse rounded-2xl bg-gray-100" aria-hidden />
    );
  }
  if (isError || !data || data.degraded) {
    return (
      <p className="text-sm text-charcoal-muted">
        Storage usage is unavailable right now.
      </p>
    );
  }

  const { usedBytes, limitBytes, remainingBytes, percentUsed, tier } = data;
  const planName = STORAGE_PLANS[tier]?.displayName ?? tier;
  const pct = Math.min(100, Math.max(0, percentUsed));
  const barColor =
    pct >= 95 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-sage";
  const usedLabel = formatBytes(usedBytes);
  const limitLabel = formatBytes(limitBytes);

  if (variant === "compact") {
    return (
      <div className="rounded-2xl border border-sand-deep/70 bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-charcoal">Storage</span>
          <span className="text-xs text-charcoal-muted">{pct}% Used</span>
        </div>
        <p className="mt-1 text-sm text-charcoal-soft">
          {usedLabel} / {limitLabel}
        </p>
        <Bar pct={pct} color={barColor} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-base font-semibold text-charcoal">
          Storage Usage
        </span>
        <span className="text-sm text-charcoal-muted">{planName} plan</span>
      </div>

      <p className="mt-2 text-lg font-medium text-charcoal">
        {usedLabel}{" "}
        <span className="text-charcoal-muted">/ {limitLabel} Used</span>
      </p>

      <Bar pct={pct} color={barColor} large />

      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-charcoal-soft">{pct}% Used</span>
        <span className="text-charcoal-muted">
          {formatBytes(remainingBytes)} remaining
        </span>
      </div>

      {!native && (
        <button
          type="button"
          onClick={() => setUpgradeOpen(true)}
          className="mt-4 w-full rounded-xl bg-black py-2.5 text-sm font-medium text-white"
        >
          {pct >= 80 ? "Upgrade for more storage" : "View storage plans"}
        </button>
      )}

      {upgradeOpen && (
        <StorageUpgradeModal
          open
          currentTier={tier}
          onClose={() => setUpgradeOpen(false)}
        />
      )}
    </div>
  );
}

function Bar({
  pct,
  color,
  large,
}: {
  pct: number;
  color: string;
  large?: boolean;
}) {
  return (
    <div
      className={`mt-2 w-full overflow-hidden rounded-full bg-gray-200 ${
        large ? "h-3" : "h-2"
      }`}
    >
      <div
        className={`h-full rounded-full ${color} transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
