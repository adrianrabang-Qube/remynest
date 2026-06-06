import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { resolveSubscription } from "@/lib/billing/resolve-subscription";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase =
      await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        `
          subscription_plan,
          subscription_status,
          current_period_end,
          is_premium,
          stripe_customer_id,
          stripe_subscription_id
        `,
      )
      .eq("id", user.id)
      .single();

    if (profileError) {
      throw profileError;
    }

    const status =
      profile?.subscription_status ??
      "inactive";

    // Single authoritative resolver (no inline plan logic).
    const { plan } = resolveSubscription(profile);

    return NextResponse.json({
      plan,
      status,
      renewalDate:
        profile?.current_period_end ??
        null,
      customerPortalEnabled:
        Boolean(
          profile?.stripe_customer_id,
        ),
      trial: false,
      cancelAtPeriodEnd:
        status === "cancelled",
    });
  } catch (error) {
    console.error(
      "[billing/status] failed to load billing status",
      error,
    );

    return NextResponse.json(
      {
        error: "Failed to load billing status.",
      },
      { status: 500 },
    );
  }
}