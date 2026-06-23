"use client";

import Link from "next/link";
import { useState } from "react";

import { isNativePlatform, useIsNativePlatform } from "@/lib/platform";

/**
 * Billing-management block for the subscription page. Reuses the existing
 * POST /api/stripe/portal — NO new billing logic. Apple 3.1.1: the Stripe customer
 * portal is an external purchase-management redirect, so it is WEB ONLY. On native
 * this renders nothing (no button, no external link, no "manage on the web" steering);
 * plan + storage still show via StorageUsageCard above. `hasBillingAccount` is the
 * server's check for an existing Stripe customer.
 */
export default function SubscriptionBilling({
  hasBillingAccount,
}: {
  hasBillingAccount: boolean;
}) {
  const native = useIsNativePlatform();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (native) return null;

  async function openPortal() {
    if (isNativePlatform()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.url) {
        window.location.assign(data.url);
        return;
      }
      setError(data?.error ?? "Unable to open the billing portal.");
    } catch {
      setError("Unable to open the billing portal.");
    }
    setLoading(false);
  }

  return (
    <section className="mt-8 rounded-3xl border border-sand-deep bg-white p-6 shadow-soft">
      <h2 className="text-lg font-semibold text-charcoal">Billing</h2>
      {hasBillingAccount ? (
        <>
          <p className="mt-2 text-sm text-charcoal-soft">
            View invoices, update your payment method, or cancel your plan in the
            secure billing portal.
          </p>
          <button
            type="button"
            onClick={openPortal}
            disabled={loading}
            className="mt-4 inline-flex rounded-xl bg-sage px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sage-deep disabled:opacity-60"
          >
            {loading ? "Opening…" : "Manage billing"}
          </button>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-charcoal-soft">
            You&apos;re on the Free plan. Upgrade for more storage and care
            profiles.
          </p>
          <Link
            href="/pricing"
            className="mt-4 inline-flex rounded-xl bg-sage px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sage-deep"
          >
            See plans
          </Link>
        </>
      )}
    </section>
  );
}
