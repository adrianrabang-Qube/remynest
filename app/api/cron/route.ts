import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ⏰ Current time
    const now = new Date().toISOString();

    // 📦 Find due reminders
    const { data: reminders, error } =
      await supabase
        .from("reminders")
        .select("*")
        .lte("remind_at", now)
        .eq("completed", false);

    if (error) {
      console.log("❌ CRON FETCH ERROR:");
      console.log(error);

      return NextResponse.json({
        success: false,
      });
    }

    console.log(
      `🚀 Found ${reminders.length} due reminders`
    );

    // 🔁 Process reminders
    for (const reminder of reminders) {
      console.log(
        `🔔 Sending reminder: ${reminder.title}`
      );

      // =====================================
// SEND ONESIGNAL
// =====================================

try {
  const notificationRes = await fetch(
    "https://onesignal.com/api/v1/notifications",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
        Authorization: `Key ${process.env.ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify({
        app_id:
          process.env
            .NEXT_PUBLIC_ONESIGNAL_APP_ID,

        included_segments: ["All"],

        headings: {
          en: "RemyNest Reminder",
        },

        contents: {
          en: reminder.title,
        },

        data: {
          reminderId: reminder.id,
        },
      }),
    }
  );

  const notificationData =
    await notificationRes.json();

  console.log(
    "✅ OneSignal Sent:"
  );

  console.log(notificationData);
} catch (notificationError) {
  console.log(
    "❌ OneSignal Send Error:"
  );

  console.log(notificationError);
}

      // ✅ Recurring logic
      if (
        reminder.recurring &&
        reminder.frequency
      ) {
        const currentDate = new Date(
          reminder.remind_at
        );

        let nextDate = new Date(currentDate);

        if (
          reminder.frequency === "daily"
        ) {
          nextDate.setDate(
            nextDate.getDate() + 1
          );
        }

        if (
          reminder.frequency === "weekly"
        ) {
          nextDate.setDate(
            nextDate.getDate() + 7
          );
        }

        if (
          reminder.frequency === "monthly"
        ) {
          nextDate.setMonth(
            nextDate.getMonth() + 1
          );
        }

        // 🔄 Move reminder forward
        await supabase
          .from("reminders")
          .update({
            remind_at:
              nextDate.toISOString(),
          })
          .eq("id", reminder.id);

        console.log(
          `🔄 Rescheduled: ${reminder.title}`
        );
      } else {
        // ✅ One-time reminder completes
        await supabase
          .from("reminders")
          .update({
            completed: true,
          })
          .eq("id", reminder.id);

        console.log(
          `✅ Completed: ${reminder.title}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      processed: reminders.length,
    });
  } catch (err) {
    console.log("❌ CRON ERROR:");
    console.log(err);

    return NextResponse.json({
      success: false,
    });
  }
}