export const dynamic = "force-dynamic";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron-auth";
import { nextOccurrence } from "@/lib/reminders/recurrence";
import { captureError } from "@/lib/observability/capture";
import { errorMessage } from "@/lib/logger";

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

// Processing-lock LEASE. A row locked longer than this is treated as abandoned by a
// dead/timed-out invocation and is reclaimable by a later tick. Comfortably longer than
// a healthy send (~15s) and any single function duration, so a still-running tick is
// never reclaimed out from under itself. Inert until the `processing_at` column exists
// (probed at runtime) — see 20260707120000_reminder_processing_lease.sql.
const PROCESSING_LEASE_MS =
  5 * 60 * 1000;

// Native-local delivery confirmations older than this are treated as stale, and the cron
// resumes sending the push (so a device that stopped confirming can't silently lose
// reminders). The native app refreshes confirmations whenever the reminders screen is
// opened. Inert until the confirmations table exists (probed at runtime) — see
// 20260707130000_reminder_local_confirmations.sql.
const NATIVE_CONFIRM_TTL_MS =
  2 * 24 * 60 * 60 * 1000;

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

  // Clear any native-local confirmations so a later REOPEN of this one-time reminder can't
  // be suppressed by a now-stale confirmation (no pending local would exist) — that would be
  // a silent miss. Best-effort: errors (incl. pre-migration table absence) are ignored.
  await supabase
    .from("reminder_local_confirmations")
    .delete()
    .eq("reminder_id", reminderId);
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

    // Probe whether the processing-lease column exists (migration applied). If not,
    // fall back to the legacy lock semantics with ZERO behavior change until applied.
    const staleIso = new Date(
      Date.now() - PROCESSING_LEASE_MS
    ).toISOString();
    const { error: leaseProbeError } = await supabase
      .from("reminders")
      .select("processing_at")
      .limit(1);
    const hasLease = !leaseProbeError;

    // =====================================
    // FIND DUE REMINDERS
    // =====================================
    // With the lease, ALSO surface rows whose lock is older than the lease window (a
    // stuck `processing=true` from a dead/timed-out invocation) so it can be reclaimed.

    let dueQuery = supabase
      .from("reminders")
      .select("*")
      .lte("remind_at", now);
    dueQuery = hasLease
      ? dueQuery.or(
          // `processing_at.is.null` also reclaims a row that was already stuck
          // `processing=true` BEFORE this migration (its new column is NULL, and
          // `NULL < stale` is NULL/false — otherwise those exact rows stay stuck forever).
          `processing.eq.false,processing_at.lt.${staleIso},processing_at.is.null`
        )
      : dueQuery.eq("processing", false);

    const {
      data: reminders,
      error,
    } = await dueQuery
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

          error: errorMessage(error),
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

    // Load fresh native-local delivery confirmations for JUST this due batch (bounded to
    // the batch size, so it can't be silently truncated by PostgREST's row cap). A reminder
    // is "natively delivered" only when there is a fresh confirmation whose user_id matches
    // the reminder's user_id — keyed `${reminder_id}|${user_id}`. If the table isn't migrated
    // the query errors → the set stays empty → every reminder is pushed as before (inert).
    const nativeConfirmCutoff = new Date(
      Date.now() - NATIVE_CONFIRM_TTL_MS
    ).toISOString();
    const nativeConfirmed = new Set<string>();
    const { data: confirmRows } = await supabase
      .from("reminder_local_confirmations")
      .select("reminder_id, user_id")
      .in(
        "reminder_id",
        reminders.map((r) => r.id)
      )
      .gte("confirmed_at", nativeConfirmCutoff);
    for (const c of (confirmRows ?? []) as {
      reminder_id: string;
      user_id: string;
    }[]) {
      nativeConfirmed.add(`${c.reminder_id}|${c.user_id}`);
    }

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

      // Race-safe lock/reclaim: with the lease, the WHERE matches an unlocked row OR a
      // stale-locked row, and the SET stamps `processing_at = now()`. Two concurrent
      // ticks cannot both win — after the first sets processing_at=now, the second's
      // `processing_at < stale` (and `processing=false`) are both false → 0 rows.
      let lockQuery = supabase
        .from("reminders")
        .update(
          hasLease
            ? { processing: true, processing_at: new Date().toISOString() }
            : { processing: true }
        )
        .eq("id", reminder.id);
      lockQuery = hasLease
        ? lockQuery.or(
            `processing.eq.false,processing_at.lt.${staleIso},processing_at.is.null`
          )
        : lockQuery.eq("processing", false);

      const {
        data: lockedReminder,
        error: lockError,
      } = await lockQuery.select().single();

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

      // NATIVE LOCAL DELIVERY (iOS duplicate fix): if this device holds a fresh, matching
      // pending local notification for this reminder, the on-device notification IS the
      // delivery — skip the redundant OneSignal push but STILL advance the lifecycle so the
      // DB stays correct. Guarded by user_id match (a foreign confirmation can't suppress
      // someone else's push) and by the freshness TTL above; any miss/stale/mismatch falls
      // through to the normal push below (fails toward delivery, never a silent miss).
      if (nativeConfirmed.has(`${reminder.id}|${reminder.user_id}`)) {
        if (reminder.recurring && reminder.frequency) {
          const nextDate = nextOccurrence(
            reminder.remind_at,
            reminder.frequency
          );
          await rescheduleReminder(
            supabase,
            reminder.id,
            nextDate
          );
          logReminderStage("reminder-native-local-rescheduled", {
            requestId,
            reminderId: reminder.id,
            nextDate,
          });
        } else {
          await completeReminder(supabase, reminder.id);
          logReminderStage("reminder-native-local-completed", {
            requestId,
            reminderId: reminder.id,
          });
        }
        processedCount += 1;
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
          const nextDate = nextOccurrence(
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
            const nextDate = nextOccurrence(
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

        error: errorMessage(error),
      }
    );
    // LA4: observability only — capture a top-level cron crash to Sentry so a failed
    // tick (which returns success:false and is retried next minute) is alertable. The
    // frozen scheduling/delivery logic is unchanged.
    captureError(error, { route: "cron.send-due-reminders", requestId });

    return NextResponse.json({
      success: false,
    });
  }
}