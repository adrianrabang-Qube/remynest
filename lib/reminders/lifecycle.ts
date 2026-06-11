import { supabaseAdmin } from "@/utils/supabase/admin";

/**
 * Reminder lifecycle foundation (Phase 1).
 *
 * Canonical status values + an append-only event logger. The logger is
 * BEST-EFFORT: it never throws and never blocks the underlying reminder
 * operation — if the `reminder_events` table or lifecycle columns are not yet
 * migrated, it simply no-ops with a warning. Writes go through the service-role
 * client so events are server-authoritative (never client-writable).
 */
export const REMINDER_STATUS = {
  SCHEDULED: "scheduled",
  NOTIFIED: "notified",
  AWAITING: "awaiting_confirmation",
  COMPLETED: "completed",
  SKIPPED: "skipped",
  SNOOZED: "snoozed",
  MISSED: "missed",
} as const;

export type ReminderStatus =
  (typeof REMINDER_STATUS)[keyof typeof REMINDER_STATUS];

export type ReminderEventType =
  | "created"
  | "scheduled"
  | "notified"
  | "completed"
  | "skipped"
  | "snoozed"
  | "missed"
  | "reopened"
  | "deleted"
  | "edited";

export type ActorRole = "recipient" | "caregiver" | "system";

interface LogReminderEventInput {
  reminderId: string;
  memoryProfileId?: string | null;
  eventType: ReminderEventType;
  actorId?: string | null;
  actorRole?: ActorRole;
  /** The scheduled instant this event refers to (key for recurring history). */
  occurrenceAt?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Append a lifecycle event. Best-effort — failures (incl. pre-migration absence
 * of the table) are swallowed so reminder create/complete/delete never break.
 */
export async function logReminderEvent(
  input: LogReminderEventInput
): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from("reminder_events")
      .insert({
        reminder_id: input.reminderId,
        memory_profile_id: input.memoryProfileId ?? null,
        occurrence_at: input.occurrenceAt ?? null,
        event_type: input.eventType,
        actor_id: input.actorId ?? null,
        actor_role: input.actorRole ?? "system",
        metadata: input.metadata ?? {},
      });

    if (error) {
      console.warn(
        "[reminder-lifecycle] event log skipped",
        { eventType: input.eventType, code: error.code }
      );
    }
  } catch {
    // Never let audit logging break the primary operation.
    console.warn(
      "[reminder-lifecycle] event log error (non-fatal)",
      { eventType: input.eventType }
    );
  }
}
