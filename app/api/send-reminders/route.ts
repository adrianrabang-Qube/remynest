export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log("RUNNING REMINDER CHECK");

    const { data: reminders, error } =
      await supabase
        .from("reminders")
        .select("*")
        .eq("sent", false)
        .order("remind_at", {
          ascending: true,
        });

    if (error) {
      console.log(
        "SUPABASE ERROR:",
        error
      );

      return Response.json({
        success: false,
        error,
      });
    }

    console.log(
      "REMINDERS FOUND:",
      reminders
    );

    if (
      !reminders ||
      reminders.length === 0
    ) {
      return Response.json({
        success: true,
        message: "No reminders found",
      });
    }

    for (const reminder of reminders) {
      console.log(
        "PROCESSING:",
        reminder.id
      );

      console.log(
        "SENDING TO USER:",
        reminder.user_id
      );

      const response = await fetch(
        "https://api.onesignal.com/notifications",
        {
          method: "POST",

          headers: {
            accept: "application/json",
            "content-type":
              "application/json",

            Authorization: `Key ${process.env.ONESIGNAL_API_KEY}`,
          },

          body: JSON.stringify({
            app_id:
              process.env
                .NEXT_PUBLIC_ONESIGNAL_APP_ID,

            include_aliases: {
              external_id: [
                reminder.user_id,
              ],
            },

            target_channel:
              "push",

            headings: {
              en: "RemyNest Reminder",
            },

            contents: {
              en:
                reminder.title ||
                "Reminder",
            },

            priority: 10,
          }),
        }
      );

      const data =
        await response.json();

      console.log(
        "ONESIGNAL STATUS:",
        response.status
      );

      console.log(
        "ONESIGNAL RESPONSE:",
        data
      );

      if (response.ok) {
        const {
          error: updateError,
        } = await supabase
          .from("reminders")
          .update({
            sent: true,
          })
          .eq("id", reminder.id);

        if (updateError) {
          console.log(
            "UPDATE ERROR:",
            updateError
          );
        } else {
          console.log(
            "UPDATED TO TRUE:",
            reminder.id
          );
        }
      } else {
        console.log(
          "FAILED TO SEND:",
          data
        );
      }
    }

    return Response.json({
      success: true,
    });
  } catch (err) {
    console.log("CRASH:", err);

    return Response.json({
      success: false,
      error: err,
    });
  }
}