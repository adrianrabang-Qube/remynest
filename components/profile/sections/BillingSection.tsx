"use client";

import { useState } from "react";
import { useBillingStatus } from "../hooks/useBillingStatus";

export default function BillingSection() {
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);
  const [action, setAction] =
    useState<"checkout" | "cancel" | null>(null);
  const {
    billing,
    loading: billingLoading,
    error: billingError,
  } = useBillingStatus();

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
            plan: "PREMIUM",
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

      <div className="rounded-xl border p-4">
        <h4 className="font-semibold text-lg">
          Subscription
        </h4>

        <p className="mt-1 text-sm text-neutral-500">
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

        {billing?.customerPortalEnabled ? (
          <button
            onClick={upgradePlan}
            disabled={loading}
            className="
              rounded-lg
              bg-black
              px-4
              py-2
              text-sm
              text-white
              disabled:opacity-50
            "
          >
            {loading && action === "checkout"
              ? "Opening Checkout..."
              : "Manage Subscription"}
          </button>
        ) : (
          <div
            className="
              rounded-lg
              border
              border-neutral-200
              px-4
              py-2
              text-sm
              text-neutral-500
            "
          >
            Portal unavailable
          </div>
        )}

        <button
          onClick={upgradePlan}
          disabled={loading}
          className="
            rounded-lg
            border
            px-4
            py-2
            text-sm
            disabled:opacity-50
          "
        >
          {loading && action === "checkout"
            ? "Loading..."
            : "Upgrade Plan"}
        </button>

        <button
          onClick={cancelSubscription}
          disabled={loading}
          className="
            rounded-lg
            border
            border-red-300
            px-4
            py-2
            text-sm
            text-red-600
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