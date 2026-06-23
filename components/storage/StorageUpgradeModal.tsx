"use client";

import { useState } from "react";

import { isNativePlatform, useIsNativePlatform } from "@/lib/platform";
import {
  STORAGE_PLANS,
  type StoragePlanTier,
} from "@/lib/storage/plans";
import {
  BILLING_PLANS,
  getPlanPriceLabel,
  type BillingPlan,
} from "@/lib/billing/plans";
import { formatBytes } from "@/lib/storage/format";
import ModalShell from "@/components/storage/ModalShell";

/**
 * Reusable storage upgrade modal. Reuses the EXISTING billing infrastructure —
 * BILLING_PLANS + getPlanPriceLabel + POST /api/stripe/checkout — and the
 * platform guards. No new Stripe/billing backend.
 *
 * Apple Guideline 3.1.1 / 3.1.3: on native iOS this renders a neutral notice with
 * NO plans, prices, purchase CTA, external link, or "manage on the web" steering
 * text. Purchase entry points appear only when `useIsNativePlatform()` is false.
 */
const TIER_ORDER: StoragePlanTier[] = [
  "FREE",
  "STARTER",
  "PREMIUM",
  "FAMILY",
];

// Storage tiers that map to a purchasable Stripe billing plan. STARTER has no
// Stripe price yet, so it is shown for comparison but is not purchasable.
const BILLING_FOR_TIER: Partial<Record<StoragePlanTier, BillingPlan>> = {
  PREMIUM: "PREMIUM",
  FAMILY: "FAMILY",
};

export default function StorageUpgradeModal({
  open,
  onClose,
  currentTier = "FREE",
}: {
  open: boolean;
  onClose: () => void;
  currentTier?: StoragePlanTier;
}) {
  const native = useIsNativePlatform();
  const [loading, setLoading] = useState<BillingPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  if (native) {
    return (
      <ModalShell label="Storage limit reached" onClose={onClose}>
        <h2 className="mb-2 text-xl font-bold">Storage limit reached</h2>
        <p className="mb-6 text-gray-600">
          To free up space, remove photos or files you no longer need.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl border py-3"
        >
          Got it
        </button>
      </ModalShell>
    );
  }

  async function handleUpgrade(plan: BillingPlan) {
    // Defense-in-depth — never initiate web checkout inside the native app.
    if (isNativePlatform()) return;
    setLoading(plan);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval: "monthly" }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Checkout failed");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't start checkout. Please try again."
      );
    } finally {
      setLoading(null);
    }
  }

  return (
    <ModalShell label="Upgrade for more storage" onClose={onClose}>
      <h2 className="mb-2 text-2xl font-bold">Upgrade for more storage</h2>
      <p className="mb-6 text-gray-600">
        Choose a plan with more space for your photos and memories.
      </p>

      <div className="mb-6 space-y-3">
        {TIER_ORDER.map((tier) => {
          const cfg = STORAGE_PLANS[tier];
          const billing = BILLING_FOR_TIER[tier];
          const isCurrent = tier === currentTier;
          return (
            <div
              key={tier}
              className={`flex items-center justify-between rounded-2xl border p-4 ${
                isCurrent
                  ? "border-black bg-gray-50"
                  : "border-gray-200"
              }`}
            >
              <div>
                <h3 className="font-semibold">
                  {cfg.displayName}
                  {cfg.pooled ? " · shared pool" : ""}
                </h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  {formatBytes(cfg.limitBytes)} storage
                </p>
              </div>
              {isCurrent ? (
                <span className="text-sm font-medium text-gray-500">
                  Current
                </span>
              ) : billing ? (
                <button
                  type="button"
                  onClick={() => handleUpgrade(billing)}
                  disabled={loading !== null}
                  className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {loading === billing
                    ? "Redirecting…"
                    : `Upgrade · ${getPlanPriceLabel(billing) ?? BILLING_PLANS[billing].displayName}`}
                </button>
              ) : (
                <span className="text-sm text-gray-400">Coming soon</span>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onClose}
        disabled={loading !== null}
        className="w-full rounded-xl border py-3 disabled:opacity-50"
      >
        Maybe later
      </button>
    </ModalShell>
  );
}
