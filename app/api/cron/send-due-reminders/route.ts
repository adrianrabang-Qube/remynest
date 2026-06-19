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

// A delivery that OneSignal does NOT confirm (invalid_aliases / 0 recipients / HTTP
// error / network timeout) is retried on later cron ticks instead of being marked
// done. Bounded: once a reminder has been overdue longer than this window, the cron
// stops retrying and ABANDONS it with a loud error log (never a silent drop), so a
// permanently-unresolvable target cannot loop/duplicate forever.
const MAX_DELIVERY_RETRY_WINDOW_MS =
  10 * 60 * 1000;

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

type OneSignalResponseBody = {
  id?: string | null;
  recipients?: number;
  errors?: unknown;
  external_id?: string | null;
};

type OneSignalSendResult = {
  ok: boolean;
  status: number;
  data: OneSignalResponseBody | null;
};

/**
 * True only when OneSignal reports a targeting failure for this send. `errors` may
 * be an ARRAY (e.g. ["All included players are not subscribed"]) OR an OBJECT
 * (e.g. { invalid_aliases: {...}, invalid_external_user_ids: [...] }); either, when
 * non-empty, is a failure.
 */
function hasTargetingErrors(
  data: OneSignalResponseBody | null
): boolean {
  const errors = data?.errors;
  if (!errors) return false;
  if (Array.isArray(errors)) return errors.length > 0;
  if (typeof errors === "object") {
    return (
      Object.keys(errors as Record<string, unknown>)
        .length > 0
    );
  }
  return false;
}

/**
 * Robust delivery validation — replaces the old `notificationData.id ||
 * recipients > 0` check, which marked success on a bare notification id even when
 * the alias was invalid and 0 devices were reached (the false-success bug).
 *
 * A push is CONFIRMED delivered ONLY when ALL hold:
 *   1. the HTTP request succeeded (2xx / result.ok) — a 4xx/5xx/429 is a failure;
 *   2. OneSignal reports NO targeting errors (see hasTargetingErrors);
 *   3. at least one real recipient was reached (recipients is a number > 0).
 * A truthy `id` ALONE is explicitly NOT sufficient.
 */
function isDeliveryConfirmed(
  result: OneSignalSendResult | null
): boolean {
  if (!result || !result.ok) return false;
  const data = result.data;
  if (!data || typeof data !== "object") return false;
  if (hasTargetingErrors(data)) return false;
  return (
    typeof data.recipients === "number" &&
    data.recipients > 0
  );
}

async function sendOneSignalNotification(
  externalUserId: string,
  reminder: OneSignalReminderPayload
): Promise<OneSignalSendResult> {
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

  // Never let a non-JSON error body (HTML/empty 4xx/5xx/429 page) throw at parse
  // time — return a structured result so the caller validates ok/status/data
  // explicitly. (A thrown fetch — network failure / 15s timeout — is caught by the
  // caller and treated as an unconfirmed delivery, i.e. retried, never as success.)
  let data: OneSignalResponseBody | null = null;
  try {
    data =
      (await response.json()) as OneSignalResponseBody;
  } catch {
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
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

      // TASK 5 — never target a null/blank External ID (it guarantees
      // invalid_aliases). reminder.user_id flows VERBATIM into
      // include_aliases.external_id (no trim/case/format change); the only failure
      // mode is a missing value, which we guard here rather than send "[null]".
      if (
        typeof reminder.user_id !== "string" ||
        reminder.user_id.trim() === ""
      ) {
        logReminderError("reminder-missing-user-id", {
          requestId,
          reminderId: reminder.id,
        });
        await unlockReminder(supabase, reminder.id);
        continue;
      }

      const deliveryRequestTime =
        new Date().toISOString();
      let sendResult: OneSignalSendResult | null = null;

      try {
        sendResult = await sendOneSignalNotification(
          reminder.user_id,
          reminder
        );
      } catch (notificationError) {
        // Network failure / 15s AbortSignal timeout — treated as an unconfirmed
        // delivery below (retried), never as success.
        logReminderError("notification-send-error", {
          requestId,
          reminderId: reminder.id,
          notificationError: String(notificationError),
        });
      }

      const deliveryResponseTime =
        new Date().toISOString();

      logReminderStage("notification-response", {
        requestId,
        reminderId: reminder.id,
        httpStatus: sendResult?.status ?? null,
        notificationData: sendResult?.data ?? null,
      });

      // TASK 3 — structured timing so a delay can be attributed to the scheduler
      // (scheduledTime->cron) vs OneSignal round-trip. Device-side delivery latency
      // is not observable server-side.
      logReminderStage("reminder-timing", {
        requestId,
        reminderId: reminder.id,
        scheduledTime: reminder.remind_at,
        cronExecutionTime: now,
        deliveryRequestTime,
        deliveryResponseTime,
        schedulerToCronMs:
          Date.parse(now) -
          Date.parse(reminder.remind_at),
        oneSignalRoundTripMs:
          Date.parse(deliveryResponseTime) -
          Date.parse(deliveryRequestTime),
        processingDurationMs:
          Date.parse(deliveryResponseTime) -
          Date.parse(deliveryRequestTime),
      });

      // TASK 1 — robust validation: `id` alone is NOT success.
      const delivered = isDeliveryConfirmed(sendResult);

      // TASK 4 — one self-contained invalid-alias / targeting-failure diagnostic
      // (no sensitive reminder content; ids + response summary only).
      if (
        !delivered &&
        hasTargetingErrors(sendResult?.data ?? null)
      ) {
        logReminderError("reminder-invalid-aliases", {
          requestId,
          reminderId: reminder.id,
          userId: reminder.user_id,
          externalIdUsed: reminder.user_id,
          oneSignalResponseSummary: {
            id: sendResult?.data?.id ?? null,
            recipients:
              sendResult?.data?.recipients ?? null,
            errors: sendResult?.data?.errors ?? null,
            httpStatus: sendResult?.status ?? null,
          },
        });
      }

      if (delivered) {
        // CONFIRMED delivery → advance the lifecycle. This is now the ONLY path
        // that marks a reminder done (recurring reschedule, else complete).
        if (
          reminder.recurring &&
          reminder.frequency
        ) {
          const nextDate = calculateNextReminderDate(
            reminder.remind_at,
            reminder.frequency
          );
          await rescheduleReminder(
            supabase,
            reminder.id,
            nextDate
          );
          logReminderStage("reminder-rescheduled", {
            requestId,
            reminderId: reminder.id,
            nextDate,
          });
        } else {
          await completeReminder(
            supabase,
            reminder.id
          );
          logReminderStage("reminder-completed", {
            requestId,
            reminderId: reminder.id,
          });
        }
        processedCount += 1;
      } else {
        // TASK 2 — delivery NOT confirmed: never mark delivered. Keep the reminder
        // recoverable and retry on the next cron tick (the per-row lock at the top
        // of the loop makes each tick idempotent — no concurrent double-send).
        // Bounded: after MAX_DELIVERY_RETRY_WINDOW_MS overdue, ABANDON loudly
        // (never a silent drop) so a permanently-broken target cannot loop forever.
        const overdueMs =
          Date.parse(now) -
          Date.parse(reminder.remind_at);

        if (overdueMs > MAX_DELIVERY_RETRY_WINDOW_MS) {
          logReminderError(
            "reminder-delivery-abandoned",
            {
              requestId,
              reminderId: reminder.id,
              userId: reminder.user_id,
              overdueMs,
              httpStatus: sendResult?.status ?? null,
              errors:
                sendResult?.data?.errors ?? null,
            }
          );
          if (
            reminder.recurring &&
            reminder.frequency
          ) {
            // Keep the recurring SERIES alive — skip only THIS occurrence.
            const nextDate = calculateNextReminderDate(
              reminder.remind_at,
              reminder.frequency
            );
            await rescheduleReminder(
              supabase,
              reminder.id,
              nextDate
            );
            logReminderStage("reminder-rescheduled", {
              requestId,
              reminderId: reminder.id,
              nextDate,
              abandoned: true,
            });
          } else {
            await completeReminder(
              supabase,
              reminder.id
            );
          }
        } else {
          // Within the retry window → unlock so the next tick retries.
          await unlockReminder(
            supabase,
            reminder.id
          );
          logReminderStage(
            "reminder-delivery-retry-scheduled",
            {
              requestId,
              reminderId: reminder.id,
              overdueMs,
            }
          );
        }
      }
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