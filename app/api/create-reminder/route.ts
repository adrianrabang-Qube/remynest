export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(
  req: Request
) {
  try {
    const body = await req.json();

    const {
      title,
      remind_at,
      recurring,
      frequency,
      memory_profile_id,
      user_id,
    } = body;

    // ✅ Validate required fields
    if (!title || !remind_at) {
      return NextResponse.json(
        {
          error:
            "Missing required fields",
        },
        { status: 400 }
      );
    }

    // ✅ Use SERVICE ROLE
    const supabase =
      createClient(
        process.env
          .NEXT_PUBLIC_SUPABASE_URL!,
        process.env
          .SUPABASE_SERVICE_ROLE_KEY!
      );

    // ✅ Create reminder
    const {
      data,
      error,
    } = await supabase
      .from("reminders")
      .insert([
        {
          title,

          remind_at: new Date(
            remind_at
          ).toISOString(),

          recurring:
            recurring || false,

          frequency:
            frequency || null,

          completed: false,

          sent: false,

          memory_profile_id:
            memory_profile_id || null,

          user_id:
            user_id || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.log(
        "❌ CREATE REMINDER ERROR:"
      );

      console.log(error);

      return NextResponse.json(
        {
          error:
            error.message,
        },
        { status: 500 }
      );
    }

    console.log(
      "✅ Reminder Created:"
    );

    console.log(data);

    return NextResponse.json({
      success: true,
      reminder: data,
    });
  } catch (err) {
    console.log(
      "❌ INVALID REQUEST:"
    );

    console.log(err);

    return NextResponse.json(
      {
        error:
          "Invalid request",
      },
      { status: 400 }
    );
  }
}