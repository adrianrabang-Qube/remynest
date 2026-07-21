"use client";

import Link from "next/link";
import { useState } from "react";

import type { BillingPlan } from "@/lib/billing/plans";
import { isNativePlatform, useIsNativePlatform } from "@/lib/platform";

/**
 * Pricing-card CTA. Reuses the existing POST /api/stripe/checkout + the platform
 * guards — NO new billing logic. Apple 3.1.1/3.1.3: on native there is NO checkout,
 * NO external link, and NO "subscribe on the web" steering — only neutral in-app
 * navigation to the existing subscription screen. Purchase entry points render only
 * when `useIsNativePlatform()` is false (server snapshot = true → hidden first paint).
 */
export default function PricingActions({ plan }: { plan: BillingPlan }) {
  const native = useIsNativePlatform();
  const [loading, setLoading] = useState(false);

  if (native) {
    return (
      <Link
        href="/account/subscription"
        className="block w-full rounded-xl border border-sand-deep bg-sand px-4 py-2.5 text-center text-sm font-medium text-charcoal"
      >
        Manage your plan
      </Link>
    );
  }

  if (plan === "FREE") {
    return (
      <Link
        href="/signup"
        className="block w-full rounded-xl border border-primary/40 px-4 py-2.5 text-center text-sm font-semibold text-primary transition hover:bg-primary/5"
      >
        Get started free
      </Link>
    );
  }

  async function choosePlan() {
    if (isNativePlatform()) return; // handler short-circuit (defence in depth)
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval: "monthly" }),
      });
      if (res.status === 401) {
        // Not signed in — create an account first, then upgrade from the app.
        window.location.assign("/signup?next=/pricing");
        return;
      }
      const data = await res.json().catch(() => null);
      if (data?.url) {
        window.location.assign(data.url);
        return;
      }
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={choosePlan}
      disabled={loading}
      className="block w-full rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-primary-deep disabled:opacity-60"
    >
      {loading ? "Redirecting…" : "Choose this plan"}
    </button>
  );
}
