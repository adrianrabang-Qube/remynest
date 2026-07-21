import Link from "next/link";

import BillingSection from "@/components/profile/sections/BillingSection";
import StorageUsageCard from "@/components/storage/StorageUsageCard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Subscription · RemyNest",
};

/**
 * Authenticated subscription page (under the auth-gated (app) group) — the CANONICAL
 * billing surface. Pairs StorageUsageCard (current plan + storage used/limit via the
 * single source of truth) with BillingSection (full subscription management: status,
 * renewal/trial, Stripe portal, upgrade, cancel — all Apple 3.1.1-gated). Reuses the
 * existing components + Stripe APIs unchanged; no new billing logic. This replaces the
 * former duplicate inline ProfileHub "Billing" section, which has been retired.
 */
export default function SubscriptionPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 pb-16 pt-[calc(2rem_+_env(safe-area-inset-top))] text-charcoal">
      <h1 className="text-2xl font-semibold">Subscription</h1>
      <p className="mt-2 text-charcoal-soft">
        Manage your plan and storage in one place.
      </p>

      <div className="mt-6">
        <StorageUsageCard variant="full" />
      </div>

      <div className="mt-6">
        <BillingSection />
      </div>

      <p className="mt-8 text-sm text-charcoal-muted">
        Questions about your plan? Visit{" "}
        <Link href="/support" className="text-primary underline">
          Support
        </Link>
        .
      </p>
    </div>
  );
}
