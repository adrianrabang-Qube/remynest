"use client";

import { useState } from "react";

import { isNativePlatform, useIsNativePlatform } from "@/lib/platform";
import {
  BILLING_PLANS,
  getPlanPriceLabel,
  type BillingPlan,
} from "@/lib/billing/plans";
import ModalShell from "@/components/storage/ModalShell";

/**
 * Reusable storage upgrade modal. Storage is bundled with subscription tiers —
 * BILLING_PLANS is the single source of truth (subscription_plan -> storageGB ->
 * quota). Reuses the existing POST /api/stripe/checkout + the platform guards; no
 * new Stripe/billing backend.
 *
 * Apple Guideline 3.1.1 / 3.1.3: on native iOS this renders a neutral notice with
 * NO plans, prices, purchase CTA, external link, or "manage on the web" steering
 * text. Purchase entry points appear only when `useIsNativePlatform()` is false.
 */
const PLAN_ORDER: BillingPlan[] = ["FREE", "PREMIUM", "FAMILY"];
const PURCHASABLE: BillingPlan[] = ["PREMIUM", "FAMILY"];

function storageLabel(gb: number | "unlimited"): string {
  return gb === "unlimited" ? "Unlimited storage" : `${gb} GB storage`;
}

export default function StorageUpgradeModal({
  open,
  onClose,
  currentTier = "FREE",
}: {
  open: boolean;
  onClose: () => void;
  currentTier?: BillingPlan;
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
      window.location.assign(data.url);
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
        {PLAN_ORDER.map((plan) => {
          const cfg = BILLING_PLANS[plan];
          const isCurrent = plan === currentTier;
          const purchasable = PURCHASABLE.includes(plan) && !isCurrent;
          return (
            <div
              key={plan}
              className={`flex items-center justify-between rounded-2xl border p-4 ${
                isCurrent ? "border-black bg-gray-50" : "border-gray-200"
              }`}
            >
              <div>
                <h3 className="font-semibold">
                  {cfg.displayName}
                  {plan === "FAMILY" ? " · shared" : ""}
                </h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  {storageLabel(cfg.storageGB)}
                </p>
              </div>
              {isCurrent ? (
                <span className="text-sm font-medium text-gray-500">
                  Current
                </span>
              ) : purchasable ? (
                <button
                  type="button"
                  onClick={() => handleUpgrade(plan)}
                  disabled={loading !== null}
                  className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {loading === plan
                    ? "Redirecting…"
                    : `Upgrade · ${getPlanPriceLabel(plan) ?? cfg.displayName}`}
                </button>
              ) : null}
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
