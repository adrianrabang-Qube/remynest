import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Cancel the caller's subscription at period end (`cancel_at_period_end: true`).
 *
 * Non-destructive: access continues until the current period ends, and the
 * Stripe webhook (`customer.subscription.updated`) syncs the profile. Pairs with
 * the existing `/api/stripe/portal` for full self-service management. Expected
 * business cases (no customer / no active subscription) return a structured 200
 * result rather than throwing — matching the platform's non-throwing convention.
 */
export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.email) {
      return NextResponse.json(
        { canceled: false, error: "No billing email on file" },
        { status: 200 },
      );
    }

    // Resolve the Stripe customer by email — the same lookup checkout uses.
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });
    const customer = customers.data[0];

    if (!customer) {
      return NextResponse.json(
        { canceled: false, error: "No Stripe customer found" },
        { status: 200 },
      );
    }

    // Find an active/trialing subscription that is not already scheduled to cancel.
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 10,
    });

    const cancelable = subscriptions.data.find(
      (s) =>
        (s.status === "active" || s.status === "trialing") &&
        !s.cancel_at_period_end,
    );

    if (!cancelable) {
      return NextResponse.json(
        { canceled: false, error: "No active subscription to cancel" },
        { status: 200 },
      );
    }

    const updated = await stripe.subscriptions.update(cancelable.id, {
      cancel_at_period_end: true,
    });

    // `current_period_end` location varies by API version; read defensively.
    const sub = updated as unknown as {
      current_period_end?: number;
      items?: { data?: Array<{ current_period_end?: number }> };
    };
    const currentPeriodEnd =
      sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end ?? null;

    return NextResponse.json({
      canceled: true,
      cancelAtPeriodEnd: true,
      currentPeriodEnd,
    });
  } catch (error) {
    console.error("[stripe/cancel] failed", error);
    return NextResponse.json(
      { error: "Subscription cancellation failed" },
      { status: 500 },
    );
  }
}
