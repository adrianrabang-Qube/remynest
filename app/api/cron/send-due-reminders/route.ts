export const dynamic = "force-dynamic";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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
  playerId: string,
  reminder: OneSignalReminderPayload
) {
  const response = await fetch(
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
          playerId,
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

      signal:
        createOneSignalAbortSignal(),
    }
  );

  return response.json();
}

export async function GET() {
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
      // GET DEVICE
      // =====================================

      const {
        data: device,
        error: deviceError,
      } = await supabase
        .from(
          "device_registrations"
        )
        .select("*")
        .eq(
          "user_id",
          reminder.user_id
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .single();

      if (
        deviceError ||
        !device
      ) {
        logReminderError(
          "device-fetch-error",
          {
            requestId,

            reminderId:
              reminder.id,

            deviceError,
          }
        );

        await unlockReminder(
          supabase,
          reminder.id
        );

        continue;
      }

      // =====================================
      // SEND PUSH
      // =====================================

      let notificationSuccess =
        false;

      try {
        const notificationData =
          await sendOneSignalNotification(
            device.player_id,
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