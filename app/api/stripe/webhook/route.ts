import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { stripe } from "@/lib/stripe";
import {
  BillingPlan,
  BillingInterval,
} from "@/lib/billing/plans";

import {
  logCheckoutCompleted,
  logSubscriptionChanged,
  logSubscriptionCancelled,
} from "@/lib/billing/billing-telemetry";

import { supabaseAdmin } from "@/utils/supabase/admin";

export async function POST(req: Request) {
  const body = await req.text();

  const headersList = await headers();

  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      {
        error: "Missing signature",
      },
      {
        status: 400,
      }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("❌ Webhook signature error:", err);

    return NextResponse.json(
      {
        error: "Invalid signature",
      },
      {
        status: 400,
      }
    );
  }

  // ✅ CHECKOUT SUCCESS
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    console.log("✅ CHECKOUT SESSION:", session.id);

    const userId = session.metadata?.userId;

    console.log("✅ SESSION METADATA:", session.metadata);

    const plan =
      (session.metadata?.plan as BillingPlan) ||
      "PREMIUM";

    const interval =
      (session.metadata?.interval as BillingInterval) ||
      "monthly";

    console.log("✅ USER ID:", userId);

    if (!userId) {
      console.log("❌ No userId found in metadata");

      return NextResponse.json({
        received: true,
      });
    }

    const supabase = supabaseAdmin;

    // ✅ GET SUBSCRIPTION DETAILS
    let subscription = null;

    if (session.subscription) {
      subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      );
    }

    const stripeSubscription = subscription as any;

    const currentPeriodEnd =
      stripeSubscription?.current_period_end ??
      stripeSubscription?.items?.data?.[0]?.current_period_end ??
      null;

    console.log("✅ SUBSCRIPTION:", subscription?.id);
    console.log(
      "✅ STRIPE CURRENT PERIOD END:",
      currentPeriodEnd,
      typeof currentPeriodEnd
    );

    // ✅ VERIFY USER EXISTS FIRST
    const { data: existingProfile, error: profileLookupError } =
      await supabase
        .from("profiles")
        .select("id, email")
        .eq("id", userId)
        .single();

    console.log(
      "✅ PROFILE LOOKUP:",
      existingProfile
    );

    console.log(
      "❌ PROFILE LOOKUP ERROR:",
      profileLookupError
    );

    // ✅ UPDATE PROFILE
    const updatePayload = {
      is_premium: true,

      subscription_plan: plan,

      billing_interval: interval,

      stripe_customer_id:
        typeof session.customer === "string"
          ? session.customer
          : null,

      stripe_subscription_id:
        subscription?.id ?? null,

      subscription_status:
        (subscription as any)?.status ??
        "active",

      current_period_end: currentPeriodEnd
        ? new Date(
            Number(currentPeriodEnd) * 1000
          ).toISOString()
        : null,
    };

    console.log(
      "✅ UPDATE PAYLOAD:",
      JSON.stringify(updatePayload, null, 2)
    );

    const { data, error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId)
      .select("*")
      .maybeSingle();

    console.log("✅ UPDATE DATA:", data);

    console.log("✅ UPDATED ROW VALUES:", {
      is_premium: data?.is_premium,
      subscription_plan: data?.subscription_plan,
      billing_interval: data?.billing_interval,
      stripe_customer_id: data?.stripe_customer_id,
      stripe_subscription_id: data?.stripe_subscription_id,
      subscription_status: data?.subscription_status,
      current_period_end: data?.current_period_end,
    });

    console.log("❌ UPDATE ERROR:", error);

    if (!data && !error) {
      console.error(
        "❌ PROFILE EXISTS BUT UPDATE RETURNED NO ROW:",
        userId
      );
    }

    if (error) {
      console.error(
        "❌ FULL UPDATE FAILURE:",
        JSON.stringify(error, null, 2)
      );
    }

    if (!existingProfile) {
      console.error(
        "❌ PROFILE NOT FOUND FOR USER ID:",
        userId
      );
    }

    if (!error) {
      console.log(
        "✅ User upgraded to premium:",
        userId
      );
    }

    logCheckoutCompleted({
      userId,
      plan,
      interval,
    });

    logSubscriptionChanged({
      userId,
      plan,
      interval,
    });
  }

  // ✅ SUBSCRIPTION CANCELED / EXPIRED
  if (
    event.type === "customer.subscription.deleted"
  ) {
    const subscription =
      event.data.object as Stripe.Subscription;

    console.log(
      "⚠️ SUBSCRIPTION CANCELED:",
      subscription.id
    );

    const supabase = supabaseAdmin;

    const { data, error } = await supabase
      .from("profiles")
      .update({
        is_premium: false,

        subscription_plan: "FREE",

        subscription_status:
          subscription.status,

        current_period_end: null,
      })
      .eq(
        "stripe_subscription_id",
        subscription.id
      )
      .select();

    console.log("✅ DOWNGRADE DATA:", data);

    console.log("❌ DOWNGRADE ERROR:", error);

    logSubscriptionCancelled({
      metadata: {
        stripeSubscriptionId:
          subscription.id,
      },
    });
  }

  return NextResponse.json({
    received: true,
  });
}