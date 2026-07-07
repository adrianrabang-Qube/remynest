"use client";

import { useRef, useState } from "react";
import type { BillingPlan } from "@/lib/billing/plans";
import { BILLING_PLANS, getPlanPriceLabel } from "@/lib/billing/plans";
import { isNativePlatform, useIsNativePlatform } from "@/lib/platform";
import { useFocusTrap } from "@/lib/a11y/use-focus-trap";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  /** The plan the user is currently on (drives which upgrades are offered). */
  currentPlan?: BillingPlan;
  /** Care-profile limit they hit, for the usage line. */
  limit?: number;
  currentCount?: number;
  reason?: "care-profile-limit" | "caregiver-collaboration" | string;
  /**
   * Restrict offered plans to those whose BILLING_PLANS config enables this
   * feature (entitlement source stays BILLING_PLANS — no duplicate logic).
   * Used for feature gates like caregiver collaboration where only some upper
   * tiers qualify (e.g. FAMILY, not PREMIUM).
   */
  requiredFeature?: keyof Pick<
    (typeof BILLING_PLANS)[BillingPlan],
    "caregiverCollaboration" | "semanticSearch" | "voiceMemories"
  >;
}

const OFFER_ORDER: BillingPlan[] = ["PREMIUM", "FAMILY"];

export default function UpgradeModal({
  open,
  onClose,
  currentPlan = "FREE",
  limit,
  currentCount,
  reason = "care-profile-limit",
  requiredFeature,
}: UpgradeModalProps) {
  const native = useIsNativePlatform();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] =
    useState<BillingPlan>("PREMIUM");
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, onClose, panelRef);

  if (!open) return null;

  // Apple Guideline 3.1.1: on native iOS, show a neutral Premium-feature notice —
  // no plans, no prices, no purchase CTA, no external/"subscribe on the web" link.
  if (native) {
    const nativeHeadline =
      reason === "caregiver-collaboration"
        ? "Caregiver collaboration is a Family plan feature"
        : reason === "care-profile-limit"
          ? "You've reached your care profile limit"
          : "This is a Premium feature";
    return (
      <div
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label={nativeHeadline}
      >
        <div
          ref={panelRef}
          tabIndex={-1}
          className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
        >
          <h2 className="text-xl font-bold mb-2">{nativeHeadline}</h2>
          <p className="text-gray-600 mb-6">
            This feature is part of a higher RemyNest plan.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full border rounded-xl py-3"
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  // Offer only plans above the user's current one — and, when a feature gate is
  // in play, only those that actually unlock it (per BILLING_PLANS).
  const offers = OFFER_ORDER.filter(
    (p) =>
      p !== currentPlan &&
      (!requiredFeature || BILLING_PLANS[p][requiredFeature])
  );

  // Default the selection to the first valid offer so the CTA can't point at a
  // plan that doesn't unlock the requested feature.
  const effectiveSelectedPlan =
    requiredFeature && !offers.includes(selectedPlan)
      ? offers[0] ?? selectedPlan
      : selectedPlan;

  async function handleUpgrade() {
    // Apple Guideline 3.1.1 — never initiate web checkout inside the native app.
    if (isNativePlatform()) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: effectiveSelectedPlan,
          interval: "monthly",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
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
      setLoading(false);
    }
  }

  const headline =
    reason === "care-profile-limit"
      ? "You've reached your care profile limit"
      : reason === "caregiver-collaboration"
        ? "Caregiver collaboration is a Family plan feature"
        : "Upgrade your plan";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={headline}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl"
      >
        <h2 className="text-2xl font-bold mb-2">{headline}</h2>

        <p className="text-gray-600 mb-6">
          {reason === "caregiver-collaboration" ? (
            <>
              Invite caregivers and family members to collaborate on a care
              profile. This feature is included with the Family plan.
            </>
          ) : typeof currentCount === "number" &&
            typeof limit === "number" ? (
            <>
              You&apos;re using{" "}
              <strong>
                {currentCount} of {limit}
              </strong>{" "}
              care profiles on the {BILLING_PLANS[currentPlan].displayName}{" "}
              plan. Upgrade to add more and unlock additional features.
            </>
          ) : (
            <>Upgrade to add more care profiles and unlock more features.</>
          )}
        </p>

        <div className="space-y-4 mb-6">
          {offers.map((plan) => {
            const cfg = BILLING_PLANS[plan];
            const selected = effectiveSelectedPlan === plan;
            return (
              <button
                type="button"
                key={plan}
                onClick={() => setSelectedPlan(plan)}
                aria-pressed={selected}
                className={`w-full text-left border rounded-2xl p-4 transition ${
                  selected
                    ? "border-black bg-gray-100"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{cfg.displayName}</h3>
                  <span className="text-sm font-medium">
                    {getPlanPriceLabel(plan)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {cfg.careProfiles === "unlimited"
                    ? "Unlimited care profiles"
                    : `Up to ${cfg.careProfiles} care profiles`}
                  {" · "}
                  {cfg.storageGB === "unlimited"
                    ? "Unlimited storage"
                    : `${cfg.storageGB} GB storage`}
                  {cfg.semanticSearch ? " · Semantic search" : ""}
                  {cfg.caregiverCollaboration
                    ? " · Caregiver collaboration"
                    : ""}
                </p>
              </button>
            );
          })}
        </div>

        {error && (
          <p className="text-sm text-red-600 mb-4" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 border rounded-xl py-3 disabled:opacity-50"
          >
            Maybe later
          </button>
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={loading}
            className="flex-1 bg-black text-white rounded-xl py-3 disabled:opacity-50"
          >
            {loading
              ? "Redirecting…"
              : `Upgrade to ${BILLING_PLANS[effectiveSelectedPlan].displayName}`}
          </button>
        </div>
      </div>
    </div>
  );
}
