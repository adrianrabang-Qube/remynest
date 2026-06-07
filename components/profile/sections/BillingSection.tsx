"use client";

import { useState } from "react";
import { useBillingStatus } from "../hooks/useBillingStatus";
import type { BillingPlan } from "@/lib/billing/plans";
import { BILLING_PLANS, getPlanPriceLabel } from "@/lib/billing/plans";

export default function BillingSection() {
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);
  const [action, setAction] =
    useState<"checkout" | "cancel" | "portal" | null>(null);
  const [selectedPlan, setSelectedPlan] =
    useState<"PREMIUM" | "FAMILY">("PREMIUM");
  const {
    billing,
    loading: billingLoading,
    error: billingError,
  } = useBillingStatus();

  // Current plan is the authoritative subscription tier from the resolver.
  const currentPlan = (
    billing?.plan ?? "FREE"
  ).toUpperCase() as BillingPlan;

  const PLAN_TIER_ORDER: BillingPlan[] = [
    "FREE",
    "PREMIUM",
    "FAMILY",
    "ENTERPRISE",
  ];
  const tier = (p: BillingPlan) =>
    PLAN_TIER_ORDER.indexOf(p);

  // Self-serve upgrade offers, restricted to STRICTLY higher tiers than current.
  const OFFER_PLANS: Array<"PREMIUM" | "FAMILY"> = [
    "PREMIUM",
    "FAMILY",
  ];
  const upgradePlans = OFFER_PLANS.filter(
    (p) => tier(p) > tier(currentPlan)
  );
  const canUpgrade = upgradePlans.length > 0;

  // CTA target derived from currentPlan + selectedPlan (no extra flags): keep
  // the user's choice when it is a valid upgrade, else fall back to the lowest
  // available upgrade. A Premium user therefore can never target "PREMIUM".
  const effectiveSelectedPlan: "PREMIUM" | "FAMILY" =
    canUpgrade
      ? upgradePlans.includes(selectedPlan)
        ? selectedPlan
        : upgradePlans[0]
      : selectedPlan;

  async function upgradePlan() {
    try {
      setError(null);
      setAction("checkout");
      setLoading(true);

      const response = await fetch(
        "/api/stripe/checkout",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            plan: effectiveSelectedPlan,
            interval: "monthly",
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to start checkout session.",
        );
      }

      if (data.url) {
        window.location.href =
          data.url;
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Checkout failed.",
      );
    } finally {
      setAction(null);
      setLoading(false);
    }
  }

  async function openCustomerPortal() {
    try {
      setError(null);
      setAction("portal");
      setLoading(true);

      const response = await fetch(
        "/api/stripe/portal",
        {
          method: "POST",
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to open billing portal.",
        );
      }

      if (data.url) {
        window.location.href =
          data.url;
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Billing portal failed.",
      );
    } finally {
      setAction(null);
      setLoading(false);
    }
  }

  async function cancelSubscription() {
    try {
      setError(null);
      setAction("cancel");
      setLoading(true);

      await fetch(
        "/api/stripe/cancel",
        {
          method: "POST",
        },
      );

      window.location.reload();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Cancellation failed.",
      );
    } finally {
      setAction(null);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">

      <div className="rounded-3xl border border-sand-deep/70 bg-white p-5 shadow-soft">
        <h4 className="font-semibold text-lg text-charcoal">
          Subscription
        </h4>

        <p className="mt-1 text-sm text-charcoal-muted">
          {billingLoading
            ? "Loading subscription..."
            : `${billing?.plan ?? "No Plan"} • ${
                billing?.status ?? "Unknown Status"
              }`}
        </p>
        {billing?.renewalDate && (
          <p className="mt-1 text-xs text-neutral-400">
            Next renewal:{" "}
            {new Date(
              billing.renewalDate,
            ).toLocaleDateString()}
          </p>
        )}
        {billing?.trial && (
          <p className="mt-1 text-xs text-amber-600">
            Trial subscription active
          </p>
        )}
        {billing?.cancelAtPeriodEnd && (
          <p className="mt-1 text-xs text-red-500">
            Subscription scheduled to cancel
          </p>
        )}
      </div>

      {(error || billingError) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error ?? billingError}
        </div>
      )}

      <div className="flex flex-wrap gap-3">

        <div className="flex gap-2 w-full">
          {OFFER_PLANS.map((plan) => {
            const isCurrent = plan === currentPlan;
            const isUpgrade = tier(plan) > tier(currentPlan);

            // Hide downgrade options (e.g. Premium for a Family user).
            if (!isCurrent && !isUpgrade) {
              return null;
            }

            if (isCurrent) {
              return (
                <span
                  key={plan}
                  className="rounded-lg border border-sage bg-sage/10 px-4 py-2 text-sm font-medium text-sage"
                >
                  {BILLING_PLANS[plan].displayName} ✓ Current Plan
                </span>
              );
            }

            const selected =
              effectiveSelectedPlan === plan;

            return (
              <button
                key={plan}
                type="button"
                onClick={() =>
                  setSelectedPlan(plan)
                }
                className={`rounded-lg border px-4 py-2 text-sm ${
                  selected
                    ? "bg-sage text-white border-sage"
                    : "border-sand-deep text-charcoal-soft hover:border-sage/50"
                }`}
              >
                {BILLING_PLANS[plan].displayName} ({getPlanPriceLabel(plan)})
              </button>
            );
          })}
        </div>

        {billing?.customerPortalEnabled ? (
          <button
            onClick={openCustomerPortal}
            disabled={loading}
            className="
              rounded-full
              bg-sage
              px-5
              py-2
              text-sm
              font-semibold
              text-white
              shadow-soft
              transition
              hover:bg-sage-deep
              disabled:opacity-50
            "
          >
            {loading && action === "portal"
              ? "Opening Portal..."
              : "Manage Subscription"}
          </button>
        ) : (
          <div
            className="
              rounded-full
              border
              border-sand-deep
              px-5
              py-2
              text-sm
              text-charcoal-muted
            "
          >
            Portal unavailable
          </div>
        )}

        {canUpgrade && (
          <button
            onClick={upgradePlan}
            disabled={loading}
            className="
              rounded-full
              border
              border-sand-deep
              px-5
              py-2
              text-sm
              font-medium
              text-charcoal
              transition
              hover:border-sage/50
              hover:text-sage
              disabled:opacity-50
            "
          >
            {loading && action === "checkout"
              ? "Loading..."
              : `Upgrade to ${effectiveSelectedPlan}`}
          </button>
        )}

        <button
          onClick={cancelSubscription}
          disabled={loading}
          className="
            rounded-full
            border
            border-rose-200
            px-5
            py-2
            text-sm
            text-rose-600/90
            transition
            hover:bg-rose-50
            disabled:opacity-50
          "
        >
          {loading && action === "cancel"
            ? "Cancelling..."
            : "Cancel Subscription"}
        </button>

      </div>
    </div>
  );
}