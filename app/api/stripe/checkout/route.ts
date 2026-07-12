import { NextResponse } from "next/server";
import { logger, errorMessage } from "@/lib/logger";
import { captureError } from "@/lib/observability/capture";

import { stripe } from "@/lib/stripe";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import {
  BillingPlan,
  BillingInterval,
  getPriceId,
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

    const limited = enforceRateLimit("billing", user.id);
    if (limited) return limited;

    const body =
      await request.json()
        .catch(() => ({}));

    const plan =
      (body.plan as BillingPlan) ||
      "PREMIUM";

    const interval =
      (body.interval as BillingInterval) ||
      "monthly";

    const stripePriceId =
      getPriceId(
        plan,
        interval
      );

    logger.debug("PLAN:", plan);
    logger.debug("INTERVAL:", interval);
    logger.debug("PRICE ID:", stripePriceId);
    // RC2: user email intentionally NOT logged (PII).
    logger.debug(
      "PRICE RESOLVER SOURCE:",
      `STRIPE_${plan}_${interval.toUpperCase()}_PRICE_ID`
    );

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

    logger.debug("CHECKOUT PAYLOAD:", {
      plan,
      interval,
      stripePriceId,
      userId: user.id,
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

    logger.debug(
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

    logger.debug("✅ STRIPE SESSION CREATED");
    logger.debug("✅ USER ID:", user.id);
    logger.debug("✅ SESSION ID:", session.id);

    return NextResponse.json({
      url: session.url,
    });
  } catch (error: unknown) {
    // LA4 review: observability only (billing logic + 500 response unchanged). Log
    // message-only (was a raw console.error(error)) + capture the handled 500 so a
    // Stripe/server outage on this revenue route is alertable.
    logger.error("[stripe/checkout] failed", errorMessage(error));
    captureError(error, { route: "stripe.checkout" });

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