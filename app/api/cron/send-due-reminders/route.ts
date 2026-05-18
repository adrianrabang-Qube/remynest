export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ⏰ Current UTC time
    const now = new Date().toISOString();

    console.log("⏰ CURRENT UTC:");
    console.log(now);

    // 📦 Find due reminders
    const { data: reminders, error } =
      await supabase
        .from("reminders")
        .select("*")
        .lte("remind_at", now)
        .or(
          "completed.is.null,completed.eq.false"
        );

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
        `🔔 Processing reminder: ${reminder.title}`
      );

      // =====================================
      // GET USER DEVICE
      // =====================================

      const {
        data: device,
        error: deviceError,
      } = await supabase
        .from("device_registrations")
        .select("*")
        .eq("user_id", reminder.user_id)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .single();

      if (deviceError || !device) {
        console.log(
          "❌ No registered device found"
        );

        console.log(deviceError);

        continue;
      }

      console.log(
        "📱 PLAYER ID:"
      );

      console.log(device.player_id);

      // =====================================
      // SEND PUSH
      // =====================================

      let notificationSuccess = false;

      try {
        const notificationRes =
          await fetch(
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

                include_player_ids: [
                  device.player_id,
                ],

                headings: {
                  en: "RemyNest Reminder",
                },

                contents: {
                  en: reminder.title,
                },

                data: {
                  reminderId:
                    reminder.id,
                },
              }),
            }
          );

        const notificationData =
          await notificationRes.json();

        console.log(
          "✅ ONESIGNAL RESPONSE:"
        );

        console.log(notificationData);

        // ✅ SUCCESS CHECK
        if (
          notificationData.id ||
          notificationData.recipients > 0
        ) {
          notificationSuccess = true;
        }

      } catch (notificationError) {
        console.log(
          "❌ OneSignal Send Error:"
        );

        console.log(
          notificationError
        );
      }

      // =====================================
      // STOP IF DELIVERY FAILED
      // =====================================

      if (!notificationSuccess) {
        console.log(
          "❌ Notification failed — reminder NOT completed"
        );

        continue;
      }

      // =====================================
      // RECURRING LOGIC
      // =====================================

      if (
        reminder.recurring &&
        reminder.frequency
      ) {
        const currentDate =
          new Date(
            reminder.remind_at
          );

        let nextDate =
          new Date(currentDate);

        if (
          reminder.frequency ===
          "daily"
        ) {
          nextDate.setDate(
            nextDate.getDate() + 1
          );
        }

        if (
          reminder.frequency ===
          "weekly"
        ) {
          nextDate.setDate(
            nextDate.getDate() + 7
          );
        }

        if (
          reminder.frequency ===
          "monthly"
        ) {
          nextDate.setMonth(
            nextDate.getMonth() + 1
          );
        }

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

        // ✅ Complete ONLY if notification succeeded
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