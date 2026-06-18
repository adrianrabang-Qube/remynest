export const dynamic = "force-dynamic";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron-auth";

const REMINDER_CRON_TAG =
  "reminder-cron-engine";

const REMINDER_BATCH_LIMIT =
  50;

const ONESIGNAL_TIMEOUT_MS =
  15_000;

function logReminderStage(
  stage: string,
  metadata?: unknown
) {
  console.info(
    `[${REMINDER_CRON_TAG}] ${stage}`,
    metadata || {}
  );
}

function logReminderError(
  stage: string,
  error: unknown
) {
  console.error(
    `[${REMINDER_CRON_TAG}] ${stage}`,
    error
  );
}

function createReminderRequestId() {
  return crypto.randomUUID();
}

function createOneSignalAbortSignal() {
  return AbortSignal.timeout(
    ONESIGNAL_TIMEOUT_MS
  );
}

function calculateNextReminderDate(
  currentDate: string,
  frequency: string
) {
  const nextDate = new Date(
    currentDate
  );

  if (frequency === "daily") {
    nextDate.setDate(
      nextDate.getDate() + 1
    );
  }

  if (frequency === "weekly") {
    nextDate.setDate(
      nextDate.getDate() + 7
    );
  }

  if (frequency === "monthly") {
    nextDate.setMonth(
      nextDate.getMonth() + 1
    );
  }

  return nextDate.toISOString();
}

async function unlockReminder(
  supabase: SupabaseClient,
  reminderId: string
) {
  await supabase
    .from("reminders")
    .update({
      processing: false,
    })
    .eq("id", reminderId);
}

async function completeReminder(
  supabase: SupabaseClient,
  reminderId: string
) {
  await supabase
    .from("reminders")
    .update({
      completed: true,
      processing: false,
    })
    .eq("id", reminderId);
}

async function rescheduleReminder(
  supabase: SupabaseClient,
  reminderId: string,
  nextDate: string
) {
  await supabase
    .from("reminders")
    .update({
      remind_at: nextDate,
      processing: false,
    })
    .eq("id", reminderId);
}

type OneSignalReminderPayload = {
  id: string;
  title?: string | null;
};

async function sendOneSignalNotification(
  externalUserId: string,
  reminder: OneSignalReminderPayload
) {
  const response = await fetch(
    "https://api.onesignal.com/notifications",
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

        // Target the OneSignal USER by External ID (the Supabase user id the app
        // bridges via OneSignal.login(user.id)) so EVERY active push subscription
        // linked to that user — web + all iOS/Android devices — receives the
        // reminder. Replaces brittle single-device include_player_ids targeting
        // (device_registrations.player_id), which missed native iOS (never stored
        // there), extra devices, and rotated/stale subscription ids.
        include_aliases: {
          external_id: [
            externalUserId,
          ],
        },

        target_channel: "push",

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

      signal:
        createOneSignalAbortSignal(),
    }
  );

  return response.json();
}

export async function GET(req: Request) {
  const denied = authorizeCronRequest(req);
  if (denied) return denied;

  const requestId =
    createReminderRequestId();

  const start =
    performance.now();

  try {
    const supabase = createClient(
      process.env
        .NEXT_PUBLIC_SUPABASE_URL!,

      process.env
        .SUPABASE_SERVICE_ROLE_KEY!
    );

    const now =
      new Date().toISOString();

    logReminderStage(
      "cron-started",
      {
        requestId,

        now,
      }
    );

    // =====================================
    // FIND DUE REMINDERS
    // =====================================

    const {
      data: reminders,
      error,
    } = await supabase
      .from("reminders")
      .select("*")
      .lte("remind_at", now)
      .eq("processing", false)
      .or(
        "completed.is.null,completed.eq.false"
      )
      .limit(
        REMINDER_BATCH_LIMIT
      );

    if (error) {
      logReminderError(
        "reminder-fetch-error",
        {
          requestId,

          error,
        }
      );

      return NextResponse.json({
        success: false,
      });
    }

    if (
      !reminders ||
      reminders.length === 0
    ) {
      logReminderStage(
        "no-due-reminders",
        {
          requestId,
        }
      );

      return NextResponse.json({
        success: true,
        processed: 0,
      });
    }

    logReminderStage(
      "due-reminders-found",
      {
        requestId,

        count:
          reminders.length,
      }
    );

    let processedCount = 0;

    // =====================================
    // PROCESS LOOP
    // =====================================

    for (const reminder of reminders) {
      logReminderStage(
        "reminder-processing-started",
        {
          requestId,

          reminderId:
            reminder.id,
        }
      );

      // =====================================
      // LOCK
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

      if (
        lockError ||
        !lockedReminder
      ) {
        logReminderStage(
          "reminder-lock-skipped",
          {
            requestId,

            reminderId:
              reminder.id,
          }
        );

        continue;
      }

      // =====================================
      // SEND PUSH
      // =====================================
      // Targeted by OneSignal External ID (reminder.user_id) — no device lookup.
      // Every active push subscription on that OneSignal user is reached, so this
      // no longer depends on device_registrations and no longer skips reminders
      // for users without a stored web player_id.

      let notificationSuccess =
        false;

      try {
        const notificationData =
          await sendOneSignalNotification(
            reminder.user_id,
            reminder
          );

        logReminderStage(
          "notification-response",
          {
            requestId,

            reminderId:
              reminder.id,

            notificationData,
          }
        );

        if (
          notificationData.id ||
          notificationData
            .recipients >
            0
        ) {
          notificationSuccess =
            true;
        }
      } catch (
        notificationError
      ) {
        logReminderError(
          "notification-send-error",
          {
            requestId,

            reminderId:
              reminder.id,

            notificationError,
          }
        );
      }

      if (!notificationSuccess) {
        await unlockReminder(
          supabase,
          reminder.id
        );

        logReminderStage(
          "notification-failed",
          {
            requestId,

            reminderId:
              reminder.id,
          }
        );

        continue;
      }

      // =====================================
      // RECURRING
      // =====================================

      if (
        reminder.recurring &&
        reminder.frequency
      ) {
        const nextDate =
          calculateNextReminderDate(
            reminder.remind_at,
            reminder.frequency
          );

        await rescheduleReminder(
          supabase,
          reminder.id,
          nextDate
        );

        logReminderStage(
          "reminder-rescheduled",
          {
            requestId,

            reminderId:
              reminder.id,

            nextDate,
          }
        );
      } else {
        await completeReminder(
          supabase,
          reminder.id
        );

        logReminderStage(
          "reminder-completed",
          {
            requestId,

            reminderId:
              reminder.id,
          }
        );
      }

      processedCount += 1;
    }

    const durationMs = Number(
      (
        performance.now() -
        start
      ).toFixed(2)
    );

    logReminderStage(
      "cron-completed",
      {
        requestId,

        processedCount,

        durationMs,
      }
    );

    return NextResponse.json({
      success: true,
      processed: processedCount,
    });
  } catch (error) {
    logReminderError(
      "cron-engine-error",
      {
        requestId,

        error,
      }
    );

    return NextResponse.json({
      success: false,
    });
  }
}