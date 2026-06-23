import Link from "next/link";

import SubscriptionBilling from "@/components/account/SubscriptionBilling";
import StorageUsageCard from "@/components/storage/StorageUsageCard";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Subscription · RemyNest",
};

/**
 * Authenticated subscription page (under the auth-gated (app) group). Surfaces the
 * current plan + storage used/limit via the existing StorageUsageCard (which reads
 * BILLING_PLANS through useStorageUsage — the single source of truth), plus billing
 * portal access via SubscriptionBilling. No new billing logic — both reuse existing
 * APIs. `hasBillingAccount` = whether the caller has a Stripe customer (RLS-scoped).
 */
export default async function SubscriptionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let hasBillingAccount = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();
    hasBillingAccount = Boolean(profile?.stripe_customer_id);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 pb-16 pt-[calc(2rem_+_env(safe-area-inset-top))] text-charcoal">
      <h1 className="text-2xl font-semibold">Subscription</h1>
      <p className="mt-2 text-charcoal-soft">
        Your plan and storage at a glance.
      </p>

      <div className="mt-6">
        <StorageUsageCard variant="full" />
      </div>

      <SubscriptionBilling hasBillingAccount={hasBillingAccount} />

      <p className="mt-8 text-sm text-charcoal-muted">
        Questions about your plan? Visit{" "}
        <Link href="/support" className="text-sage underline">
          Support
        </Link>
        .
      </p>
    </main>
  );
}
