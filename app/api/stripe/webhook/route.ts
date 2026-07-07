import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { stripe } from "@/lib/stripe";
import {
  BillingPlan,
  BillingInterval,
  planFromPriceId,
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
    console.log("🔥 WEBHOOK EVENT TYPE:", event.type);
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

  // Tracks whether ANY required DB write failed with a genuine (retryable) error. If so
  // we return 500 at the end so Stripe RETRIES the whole event rather than acknowledging a
  // partially-processed one (which would permanently desync premium/entitlements/quota).
  // A `!data` "no matching profile row" is NOT a write failure (missing metadata / already
  // in that state) — retrying can't fix it, so it stays a 200 ack. All updates are
  // idempotent (`.eq(id|customer|subscription)`), so a retry never duplicates state.
  let writeFailed = false;

  // ✅ CHECKOUT SUCCESS
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    console.log("✅ CHECKOUT SESSION:", session.id);

    const userId = session.metadata?.userId;

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
    let subscription: Stripe.Subscription | null = null;

    if (session.subscription) {
      subscription =
        await stripe.subscriptions.retrieve(
          session.subscription as string
        ) as Stripe.Subscription;
    }

    const stripeSubscription =
      subscription as Stripe.Subscription | null;

    const currentPeriodEnd =
      stripeSubscription
        ? (
            stripeSubscription as Stripe.Subscription & {
              current_period_end?: number;
              items?: {
                data?: Array<{
                  current_period_end?: number;
                }>;
              };
            }
          ).current_period_end ??
          stripeSubscription.items?.data?.[0]?.current_period_end ??
          null
        : null;

    console.log(
      "✅ STRIPE CURRENT PERIOD END:",
      currentPeriodEnd
    );

    // ✅ VERIFY USER EXISTS FIRST
    const {
      error: profileLookupError,
    } =
      await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

    if (profileLookupError) {
      console.error(
        "❌ PROFILE LOOKUP FAILURE:",
        JSON.stringify(
          profileLookupError,
          null,
          2
        )
      );
    }

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
        subscription?.status ??
        "active",

      current_period_end: currentPeriodEnd
        ? new Date(
            Number(currentPeriodEnd) * 1000
          ).toISOString()
        : null,
    };

    const { data, error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId)
      .select("*")
      .maybeSingle();

    if (error) {
      writeFailed = true;
      console.error(
        "❌ FULL UPDATE FAILURE:",
        JSON.stringify(error, null, 2)
      );
    } else if (!data) {
      console.error(
        "❌ PROFILE EXISTS BUT UPDATE RETURNED NO ROW:",
        userId
      );
    } else {
      console.log(
        "✅ UPDATED ROW VALUES:",
        {
          is_premium: data.is_premium,
          subscription_plan:
            data.subscription_plan,
          billing_interval:
            data.billing_interval,
          stripe_customer_id:
            data.stripe_customer_id,
          stripe_subscription_id:
            data.stripe_subscription_id,
          subscription_status:
            data.subscription_status,
          current_period_end:
            data.current_period_end,
        }
      );

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

  // ✅ SUBSCRIPTION CREATED (Dashboard/Admin or non-checkout flows)
  if (
    event.type ===
    "customer.subscription.created"
  ) {
    const subscription =
      event.data.object as Stripe.Subscription;

    console.log(
      "🆕 SUBSCRIPTION CREATED:",
      subscription.id
    );

    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : null;

    if (!customerId) {
      console.error(
        "❌ SUBSCRIPTION CREATED: Missing customer id"
      );

      return NextResponse.json({
        received: true,
      });
    }

    const supabase = supabaseAdmin;

    const currentPeriodEnd =
      (
        subscription as Stripe.Subscription & {
          current_period_end?: number;
          items?: {
            data?: Array<{
              current_period_end?: number;
            }>;
          };
        }
      ).current_period_end ??
      subscription.items?.data?.[0]?.current_period_end ??
      null;

    console.log(
      "✅ CREATED CURRENT PERIOD END:",
      currentPeriodEnd,
    );

    const updatePayload = {
      is_premium:
        subscription.status === "active" ||
        subscription.status === "trialing",

      subscription_status:
        subscription.status,

      stripe_subscription_id:
        subscription.id,

      current_period_end:
        currentPeriodEnd
          ? new Date(
              Number(currentPeriodEnd) *
                1000
            ).toISOString()
          : null,
    };

    const { data, error } =
      await supabase
        .from("profiles")
        .update(updatePayload)
        .eq(
          "stripe_customer_id",
          customerId
        )
        .select(
          "id, is_premium, subscription_status, stripe_customer_id"
        )
        .maybeSingle();

    if (error) {
      writeFailed = true;
      console.error(
        "❌ SUBSCRIPTION CREATED UPDATE FAILURE:",
        JSON.stringify(
          error,
          null,
          2
        )
      );
    } else if (!data) {
      console.error(
        "❌ SUBSCRIPTION CREATED: NO PROFILE MATCH FOR CUSTOMER:",
        customerId
      );
    } else {
      console.log(
        "✅ SUBSCRIPTION CREATED PROFILE UPDATED:",
        data
      );
    }
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

    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : null;

    let data: Record<string, unknown> | null = null;
    let error: unknown = null;

    // First attempt: stable customer lookup
    if (customerId) {
      const customerResult = await supabase
        .from("profiles")
        .update({
          is_premium: false,
          subscription_plan: "FREE",
          subscription_status:
            subscription.status,
          stripe_subscription_id: null,
          current_period_end: null,
        })
        .eq(
          "stripe_customer_id",
          customerId
        )
        .select(
          "id, subscription_status, current_period_end, stripe_customer_id, stripe_subscription_id"
        )
        .maybeSingle();

      data = customerResult.data;
      error = customerResult.error;

      if (!data) {
        console.warn(
          "⚠️ CUSTOMER LOOKUP FAILED — falling back to subscription lookup:",
          customerId
        );
      }
    }

    // Fallback: subscription id lookup
    if (!data) {
      const subscriptionResult = await supabase
        .from("profiles")
        .update({
          is_premium: false,
          subscription_plan: "FREE",
          subscription_status:
            subscription.status,
          stripe_subscription_id: null,
          current_period_end: null,
        })
        .eq(
          "stripe_subscription_id",
          subscription.id
        )
        .select(
          "id, subscription_status, current_period_end, stripe_customer_id, stripe_subscription_id"
        )
        .maybeSingle();

      data = subscriptionResult.data;
      error = subscriptionResult.error;
    }

    console.log(
      "✅ DOWNGRADE DATA:",
      data
    );

    console.log(
      "❌ DOWNGRADE ERROR:",
      error
    );

    // A genuine DB error on the downgrade write → retry (leaving a cancelled user premium
    // is an entitlement/quota leak). `!data && !error` = no matching profile (already
    // downgraded / never existed) → not retryable, stays a 200 ack.
    if (error) {
      writeFailed = true;
    }

    logSubscriptionCancelled({
      metadata: {
        stripeSubscriptionId:
          subscription.id,
      },
    });
  }

  // ✅ SUBSCRIPTION UPDATED / RENEWED
  if (
    event.type ===
    "customer.subscription.updated"
  ) {
    const subscription =
      event.data.object as Stripe.Subscription;

    console.log(
      "🔄 SUBSCRIPTION UPDATED:",
      subscription.id
    );

    const supabase = supabaseAdmin;

    const currentPeriodEnd =
      (
        subscription as Stripe.Subscription & {
          current_period_end?: number;
          items?: {
            data?: Array<{
              current_period_end?: number;
            }>;
          };
        }
      ).current_period_end ??
      subscription.items?.data?.[0]?.current_period_end ??
      null;

    console.log(
      "✅ UPDATED CURRENT PERIOD END:",
      currentPeriodEnd,
    );

    const isActive =
      subscription.status === "active" ||
      subscription.status === "trialing";

    const priceId =
      subscription.items?.data?.[0]?.price?.id ?? null;

    const derivedPlan = planFromPriceId(priceId);

    if (isActive && priceId && !derivedPlan) {
      console.warn(
        "[stripe-webhook] unknown Stripe price id (subscription.updated) — preserving existing plan",
        { subscriptionId: subscription.id, priceId }
      );
    }

    const updatePayload: Record<string, unknown> = {
      is_premium: isActive,

      subscription_status:
        subscription.status,

      stripe_subscription_id:
        subscription.id,

      current_period_end:
        currentPeriodEnd
          ? new Date(
              Number(currentPeriodEnd) *
                1000
            ).toISOString()
          : null,
    };

    // Plan is derived from the actual Stripe price — never hardcoded. Only write
    // it when we can map the price (active) so a known price sets PREMIUM/FAMILY
    // correctly; on an unknown price, preserve the existing plan (never downgrade
    // FAMILY → PREMIUM). When inactive, the plan reverts to FREE.
    if (isActive) {
      if (derivedPlan) {
        updatePayload.subscription_plan = derivedPlan;
      }
    } else {
      updatePayload.subscription_plan = "FREE";
    }

    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : null;

    let data: Record<string, unknown> | null = null;
    let error: unknown = null;

    // First attempt: stable customer lookup
    if (customerId) {
      const customerResult = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq(
          "stripe_customer_id",
          customerId
        )
        .select(
          "id, subscription_status, current_period_end, stripe_customer_id, stripe_subscription_id"
        )
        .maybeSingle();

      data = customerResult.data;
      error = customerResult.error;

      if (!data) {
        console.warn(
          "⚠️ CUSTOMER LOOKUP FAILED — falling back to subscription lookup:",
          customerId
        );
      }
    }

    // Fallback: subscription id lookup
    if (!data) {
      const subscriptionResult = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq(
          "stripe_subscription_id",
          subscription.id
        )
        .select(
          "id, subscription_status, current_period_end, stripe_customer_id, stripe_subscription_id"
        )
        .maybeSingle();

      data = subscriptionResult.data;
      error = subscriptionResult.error;
    }

    if (error) {
      writeFailed = true;
      console.error(
        "❌ SUBSCRIPTION UPDATE FAILURE:",
        JSON.stringify(error, null, 2)
      );
    } else if (!data) {
      console.error(
        "❌ NO PROFILE MATCH FOR CUSTOMER OR SUBSCRIPTION:",
        {
          customerId,
          subscriptionId: subscription.id,
        }
      );
    } else {
      console.log(
        "✅ SUBSCRIPTION UPDATED:",
        data
      );
    }

    logSubscriptionChanged({
      metadata: {
        stripeSubscriptionId:
          subscription.id,
        status:
          subscription.status,
      },
    });
  }

  // ✅ PAYMENT FAILED
  if (
    event.type ===
    "invoice.payment_failed"
  ) {
    const invoice =
      event.data.object as Stripe.Invoice;

    console.log(
      "⚠️ PAYMENT FAILED:",
      invoice.id
    );

    const invoiceSubscription =
      invoice.parent?.subscription_details?.subscription;

    const subscriptionId =
      typeof invoiceSubscription === "string"
        ? invoiceSubscription
        : invoiceSubscription?.id ?? null;

    if (!subscriptionId) {
      return NextResponse.json({
        received: true,
      });
    }

    const supabase = supabaseAdmin;

    const { data, error } =
      await supabase
        .from("profiles")
        .update({
          subscription_status:
            "payment_failed",
        })
        .eq(
          "stripe_subscription_id",
          subscriptionId
        )
        .select(
          "id, subscription_status"
        )
        .maybeSingle();

    if (error) {
      writeFailed = true;
      console.error(
        "❌ PAYMENT FAILURE UPDATE ERROR:",
        JSON.stringify(
          error,
          null,
          2
        )
      );
    } else {
      console.log(
        "✅ PAYMENT FAILURE RECORDED:",
        data
      );
    }
  }

  // Any required DB write failed → 500 so Stripe retries the whole event (idempotent
  // updates make the retry safe). Otherwise acknowledge normally.
  if (writeFailed) {
    return NextResponse.json(
      { error: "Webhook processing failed — will retry" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    received: true,
  });
}