import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { stripe } from "@/lib/stripe";
import { createClient } from "@/utils/supabase/server";

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

    console.log("✅ USER ID:", userId);

    if (!userId) {
      console.log("❌ No userId found in metadata");

      return NextResponse.json({
        received: true,
      });
    }

    const supabase = await createClient();

    // ✅ GET SUBSCRIPTION DETAILS
    let subscription = null;

    if (session.subscription) {
      subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      );
    }

    console.log("✅ SUBSCRIPTION:", subscription?.id);

    const currentPeriodEnd =
      subscription?.items.data[0]?.current_period_end;

    // ✅ UPDATE PROFILE
    const { data, error } = await supabase
      .from("profiles")
      .update({
        is_premium: true,

        stripe_customer_id:
          typeof session.customer === "string"
            ? session.customer
            : null,

        stripe_subscription_id:
          subscription?.id || null,

        subscription_status:
          subscription?.status || "active",

        current_period_end:
          currentPeriodEnd
            ? new Date(
                currentPeriodEnd * 1000
              ).toISOString()
            : null,
      })
      .eq("id", userId)
      .select();

    console.log("✅ UPDATE DATA:", data);

    console.log("❌ UPDATE ERROR:", error);

    if (!error) {
      console.log(
        "✅ User upgraded to premium:",
        userId
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

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("profiles")
      .update({
        is_premium: false,

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
  }

  return NextResponse.json({
    received: true,
  });
}