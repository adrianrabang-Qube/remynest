import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe";
import { createClient } from "@/utils/supabase/server";

export async function POST() {
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

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",

      payment_method_types: ["card"],

      customer_email: user.email!,

      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],

      metadata: {
        userId: user.id,
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
    console.log("❌ STRIPE CHECKOUT ERROR:", error);

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