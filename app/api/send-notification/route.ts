export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    // Get query params
    const { searchParams } = new URL(req.url);

    const message = searchParams.get("message");
    const userId = searchParams.get("userId");

    // Validate message
    if (!message) {
      return NextResponse.json(
        { error: "No message provided" },
        { status: 400 }
      );
    }

    // Validate userId
    if (!userId) {
      return NextResponse.json(
        { error: "No userId provided" },
        { status: 400 }
      );
    }

    // Create Supabase admin client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get user's latest registered device
    const { data: device, error: deviceError } =
      await supabase
        .from("device_registrations")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .single();

    if (deviceError || !device) {
      return NextResponse.json(
        {
          error: "No registered device found",
          details: deviceError,
        },
        { status: 404 }
      );
    }

    // Send private notification
    const res = await fetch(
      "https://onesignal.com/api/v1/notifications",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${process.env.ONESIGNAL_API_KEY}`,
        },
        body: JSON.stringify({
          app_id:
            process.env
              .NEXT_PUBLIC_ONESIGNAL_APP_ID,

          // PRIVATE TARGETING
          include_player_ids: [
            device.player_id,
          ],

          contents: {
            en: message,
          },
        }),
      }
    );

    const data = await res.json();

    return NextResponse.json({
      success: true,
      playerId: device.player_id,
      onesignal: data,
    });

  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: "Server crash",
        details: err,
      },
      { status: 500 }
    );
  }
}