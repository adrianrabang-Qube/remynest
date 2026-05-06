import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/utils/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

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

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",

      payment_method_types: ["card"],

      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "RemyNest Premium",
              description: "AI memory assistant subscription",
            },
            unit_amount: 999,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],

      metadata: {
        userId: user.id,
      },

      success_url: "http://localhost:3000/dashboard?success=true",

      cancel_url: "http://localhost:3000/dashboard?canceled=true",
    });

    console.log("SESSION USER ID:", user.id);

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.log("STRIPE CHECKOUT ERROR:", error);

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