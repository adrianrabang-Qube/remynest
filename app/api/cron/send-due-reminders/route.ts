export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  try {

    // =====================================
    // SUPABASE
    // =====================================

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // =====================================
    // CURRENT UTC TIME
    // =====================================

    const now = new Date().toISOString();

    console.log("⏰ CURRENT UTC:");
    console.log(now);

    // =====================================
    // FIND DUE REMINDERS
    // =====================================

    const { data: reminders, error } =
      await supabase
        .from("reminders")
        .select("*")
        .lte("remind_at", now)
        .eq("processing", false)
        .or(
          "completed.is.null,completed.eq.false"
        );

    if (error) {

      console.log("❌ FETCH ERROR:");
      console.log(error);

      return NextResponse.json({
        success: false,
      });
    }

    console.log(
      `🚀 Found ${reminders.length} due reminders`
    );

    // =====================================
    // NO REMINDERS
    // =====================================

    if (!reminders || reminders.length === 0) {

      return NextResponse.json({
        success: true,
        processed: 0,
      });
    }

    // =====================================
    // PROCESS LOOP
    // =====================================

    for (const reminder of reminders) {

      console.log(
        `🔔 STARTING: ${reminder.title}`
      );

      // =====================================
      // ATOMIC LOCK
      // =====================================

      const {
        data: lockedReminder,
        error: lockError,
      } = await supabase
        .from("reminders")
        .update({
          processing: true,
        })
        .eq("id", reminder.id)
        .eq("processing", false)
        .select()
        .single();

      // =====================================
      // LOCK FAILED
      // =====================================

      if (lockError || !lockedReminder) {

        console.log(
          "⚠️ Reminder already locked"
        );

        continue;
      }

      console.log(
        `🔒 LOCKED: ${reminder.title}`
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

      // =====================================
      // DEVICE NOT FOUND
      // =====================================

      if (deviceError || !device) {

        console.log(
          "❌ No registered device"
        );

        console.log(deviceError);

        await supabase
          .from("reminders")
          .update({
            processing: false,
          })
          .eq("id", reminder.id);

        continue;
      }

      console.log("📱 PLAYER ID:");
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
                  en:
                    reminder.title ||
                    "Reminder",
                },

                priority: 10,

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
          "📨 ONESIGNAL RESPONSE:"
        );

        console.log(notificationData);

        if (
          notificationData.id ||
          notificationData.recipients > 0
        ) {
          notificationSuccess = true;
        }

      } catch (notificationError) {

        console.log(
          "❌ OneSignal Error:"
        );

        console.log(
          notificationError
        );
      }

      // =====================================
      // NOTIFICATION FAILED
      // =====================================

      if (!notificationSuccess) {

        await supabase
          .from("reminders")
          .update({
            processing: false,
          })
          .eq("id", reminder.id);

        console.log(
          "❌ Notification failed"
        );

        continue;
      }

      // =====================================
      // RECURRING REMINDER
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

            processing: false,
          })
          .eq("id", reminder.id);

        console.log(
          `🔄 Rescheduled: ${reminder.title}`
        );

      } else {

        // =====================================
        // COMPLETE REMINDER
        // =====================================

        await supabase
          .from("reminders")
          .update({
            completed: true,
            processing: false,
          })
          .eq("id", reminder.id);

        console.log(
          `✅ Completed: ${reminder.title}`
        );
      }
    }

    // =====================================
    // SUCCESS RESPONSE
    // =====================================

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