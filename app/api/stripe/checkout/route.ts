import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe";
import {
  BillingPlan,
  BillingInterval,
  getPlan,
} from "@/lib/billing/plans";

import {
  logCheckoutStarted,
} from "@/lib/billing/billing-telemetry";

import { createClient } from "@/utils/supabase/server";

export async function POST(
  request: Request
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // User must be logged in
    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json()
        .catch(() => ({}));

    const plan =
      (body.plan as BillingPlan) ||
      "PREMIUM";

    const interval =
      (body.interval as BillingInterval) ||
      "monthly";

    const config =
      getPlan(plan);

    const stripePriceId =
      interval === "yearly"
        ? config.yearlyPriceId
        : config.monthlyPriceId;

    console.log("PLAN:", plan);
    console.log("INTERVAL:", interval);
    console.log("PRICE ID:", stripePriceId);
    console.log("USER EMAIL:", user.email);

    if (!stripePriceId) {
      return NextResponse.json(
        {
          error:
            "Invalid billing configuration",
        },
        {
          status: 400,
        }
      );
    }

    logCheckoutStarted({
      userId: user.id,
      plan,
      interval,
    });

    console.log("CHECKOUT PAYLOAD:", {
      plan,
      interval,
      stripePriceId,
      userId: user.id,
      email: user.email,
    });

    // Find or reuse existing Stripe customer
    const existingCustomers =
      await stripe.customers.list({
        email:
          user.email ?? undefined,
        limit: 1,
      });

    const existingCustomer =
      existingCustomers.data[0];

    console.log(
      "EXISTING CUSTOMER:",
      existingCustomer?.id
    );

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ...(existingCustomer
        ? {
            customer:
              existingCustomer.id,
          }
        : {
            customer_email:
              user.email ?? undefined,
          }),

      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],

      metadata: {
        userId: user.id,
        plan,
        interval,
      },

      success_url:
        "https://remynest.com/dashboard?success=true",

      cancel_url:
        "https://remynest.com/dashboard?canceled=true",
    });

    console.log("✅ STRIPE SESSION CREATED");
    console.log("✅ USER ID:", user.id);
    console.log("✅ SESSION ID:", session.id);

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error("❌ STRIPE CHECKOUT ERROR");

    if (error && typeof error === "object") {
      const stripeError = error as any;

      console.error("MESSAGE:", stripeError.message);
      console.error("TYPE:", stripeError.type);
      console.error("CODE:", stripeError.code);
      console.error("STATUS:", stripeError.statusCode);
      console.error("RAW:", stripeError.raw);
    }

    console.error(error);

    return NextResponse.json(
      {
        error: "Stripe checkout failed",
      },
      {
        status: 500,
      }
    );
  }
}