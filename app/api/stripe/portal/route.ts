import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe";
import { createClient } from "@/utils/supabase/server";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Stripe Customer Portal.
 *
 * Creates a billing-portal session for the authenticated user's existing Stripe
 * customer and returns the hosted URL. The portal is where users view invoices,
 * update payment methods, and access Stripe-hosted subscription/cancellation
 * controls. This route does NOT create/modify subscriptions, pricing, or plans —
 * those remain owned by checkout/webhook.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const limited = enforceRateLimit("billing", user.id);
    if (limited) return limited;

    // RLS-scoped read of the caller's own profile.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("[stripe/portal] profile lookup failed", profileError);
      return NextResponse.json(
        { error: "Failed to load billing profile" },
        { status: 500 }
      );
    }

    const customerId = profile?.stripe_customer_id;

    if (!customerId) {
      return NextResponse.json(
        { error: "No billing account found" },
        { status: 400 }
      );
    }

    const returnUrl = `${new URL(request.url).origin}/settings`;

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[stripe/portal] failed to create portal session", error);
    return NextResponse.json(
      { error: "Failed to open billing portal" },
      { status: 500 }
    );
  }
}
