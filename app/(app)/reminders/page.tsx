import { createClient } from "@/lib/supabase/server";
import { resolveActiveProfileId } from "@/lib/context-resolver";
import { userCanAccessProfile } from "@/lib/profile-ownership";
import { redirect } from "next/navigation";
import ReminderDateTimeField from "@/components/reminders/ReminderDateTimeField";
import ReminderCenter, {
  type ReminderRecord,
} from "@/components/reminders/ReminderCenter";
import NativeReminderSync from "@/components/reminders/NativeReminderSync";
import NativeReminderBeacon from "@/components/reminders/NativeReminderBeacon";
import {
  logReminderEvent,
  REMINDER_STATUS,
} from "@/lib/reminders/lifecycle";
import {
  KNOWN_FREQUENCIES,
  nextOccurrenceAfter,
} from "@/lib/reminders/recurrence";

export const dynamic = "force-dynamic";

export default async function RemindersPage({
  searchParams,
}: {
  searchParams?: {
    context?: string;
  };
}) {
  const supabase =
    await createClient();

  // 🔐 Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 🧠 Context: CARE = a care profile; PERSONAL ("My Nest") = no profile, scoped to
  // this user via the app-wide convention memory_profile_id IS NULL + user_id (same
  // as memories / timeline / search).
  const isMyNestContext =
    searchParams?.context ===
    "my-nest";

  const activeProfileId =
    isMyNestContext
      ? null
      : await resolveActiveProfileId();

  const isPersonal = !activeProfileId;

  // 📦 Fetch reminders — CARE: by profile; PERSONAL: own null-profile reminders.
  const remindersQuery = supabase
    .from("reminders")
    .select("*");

  const {
    data: reminders,
    error: remindersError,
  } = await (isPersonal
    ? remindersQuery
        .is("memory_profile_id", null)
        .eq("user_id", user.id)
    : remindersQuery.eq(
        "memory_profile_id",
        activeProfileId
      )
  ).order("created_at", {
    ascending: false,
  });

  if (remindersError) {
    console.log(
      "❌ FETCH REMINDERS ERROR:"
    );

    console.log(remindersError);
  }

  // Care-profile name for the Caregiver-context framing (null in My Nest / personal).
  const activeProfile = isPersonal
    ? null
    : (
        await supabase
          .from("memory_profiles")
          .select("preferred_name, profile_name")
          .eq("id", activeProfileId)
          .maybeSingle()
      ).data;

  const careProfileName =
    activeProfile?.preferred_name ||
    activeProfile?.profile_name ||
    null;

  // =====================================
  // CREATE REMINDER
  // =====================================

  async function createReminder(
    formData: FormData
  ) {
    "use server";

    const supabase =
      await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error(
        "Not authenticated"
      );
    }

    // CARE = a care profile (re-resolved from the cookie); PERSONAL ("My Nest") =
    // no profile, owned by this user (memory_profile_id IS NULL + user_id).
    const activeProfileId =
      isMyNestContext
        ? null
        : await resolveActiveProfileId();

    // Server-side ownership check for CARE only — the active-context cookie is
    // client-settable, so verify the user actually owns / has caregiver access to
    // the profile. Personal reminders are owned by user_id (no profile to check).
    if (
      activeProfileId &&
      !(await userCanAccessProfile(
        user.id,
        activeProfileId
      ))
    ) {
      throw new Error(
        "You don't have access to this care profile."
      );
    }

    const title = formData.get(
      "title"
    ) as string;

    // Prefer the browser-computed UTC instant (timezone/DST-correct). Fall back
    // to the raw naive value only if JS was unavailable on the client.
    const remindAtUtc = formData.get(
      "remind_at_utc"
    ) as string | null;

    const remindAtRaw = formData.get(
      "remind_at"
    ) as string | null;

    const remindAt =
      (remindAtUtc && remindAtUtc.trim()) ||
      remindAtRaw;

    const recurring =
      formData.get("recurring") ===
      "on";

    const frequency = formData.get(
      "frequency"
    ) as string;

    // =====================================
    // VALIDATION
    // =====================================

    if (
      !title ||
      title.trim().length === 0
    ) {
      throw new Error(
        "Title required"
      );
    }

    if (!remindAt) {
      throw new Error(
        "Reminder date required"
      );
    }

    const finalFrequency =
      recurring
        ? frequency
        : null;

    // =====================================
    // TIMEZONE
    // =====================================

    // `remindAt` is already a UTC ISO instant computed in the user's browser
    // (timezone/DST-correct). new Date(...).toISOString() is idempotent for that
    // value; for the no-JS fallback (naive local) it preserves prior behavior.

    const utcDate =
      new Date(remindAt).toISOString();

    console.log(
      "🕓 ORIGINAL LOCAL INPUT:"
    );

    console.log(remindAt);

    console.log(
      "🌍 FINAL UTC DATE:"
    );

    console.log(utcDate);

    // =====================================
    // INSERT REMINDER
    // =====================================

    const { data, error } =
      await supabase
        .from("reminders")
        .insert({
          title,

          user_id: user.id,

          memory_profile_id:
            activeProfileId,

          remind_at: utcDate,

          completed: false,

          processing: false,

          recurring,

          frequency:
            finalFrequency,
        })
        .select()
        .single();

    if (error) {
      console.log(
        "❌ REMINDER CREATE ERROR:"
      );

      console.log(error);

      throw new Error(
        error.message
      );
    }

    console.log(
      "✅ Reminder created:"
    );

    console.log(data);

    // Best-effort lifecycle event — NEVER blocks creation (the insert above
    // already succeeded). `status` defaults to 'scheduled' via the migration and
    // is intentionally not set on the insert (pre-migration safe).
    await logReminderEvent({
      reminderId: data.id,
      memoryProfileId: activeProfileId,
      eventType: "created",
      actorId: user.id,
      actorRole: "caregiver",
      occurrenceAt: utcDate,
      metadata: {
        recurring,
        frequency: finalFrequency,
      },
    });

    redirect(
      isMyNestContext
        ? "/reminders?context=my-nest"
        : "/reminders"
    );
  }

  // =====================================
  // TOGGLE COMPLETE
  // =====================================

  async function toggleReminderComplete(
    formData: FormData
  ) {
    "use server";

    const supabase =
      await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error(
        "Not authenticated"
      );
    }

    const id = formData.get(
      "id"
    ) as string;

    // AUTHORITATIVE FETCH — read the reminder server-side (not from client fields) so
    // authorization + the recurring decision use trusted data. Mirrors the [id] route:
    // authorize in app code INDEPENDENT of RLS (a personal reminder is owned by user_id;
    // a care reminder requires access to its memory_profile). This is the parity check
    // the toggle previously lacked vs. create/[id].
    const { data: row } = await supabase
      .from("reminders")
      .select(
        "id, user_id, memory_profile_id, recurring, frequency, remind_at, completed"
      )
      .eq("id", id)
      .maybeSingle();

    if (!row) {
      // Gone or not visible → nothing to do (never leak existence).
      redirect(
        isMyNestContext
          ? "/reminders?context=my-nest"
          : "/reminders"
      );
    }

    const authorized =
      row.memory_profile_id == null
        ? row.user_id === user.id
        : await userCanAccessProfile(
            user.id,
            row.memory_profile_id
          );

    if (!authorized) {
      throw new Error(
        "You don't have access to this reminder."
      );
    }

    // Scope every write by the reminder's OWN context (defense in depth on top of the
    // authorization above), not the client-settable active-profile cookie.
    const rowProfileId = row.memory_profile_id as string | null;
    const isRowPersonal = rowProfileId == null;

    const isRecurringSeries =
      Boolean(row.recurring) &&
      typeof row.frequency === "string" &&
      KNOWN_FREQUENCIES.has(row.frequency);

    // PER-OCCURRENCE COMPLETION (the confirmed defect fix): completing a still-active
    // recurring reminder must NOT set completed=true (which permanently ends the series
    // on both the native reconcile and the cron). Instead advance the series to the next
    // future occurrence — the routine lives on. One-time reminders (and reopening a
    // legacy-terminated series) keep the plain completed toggle.
    if (isRecurringSeries && !row.completed) {
      const nextAt = nextOccurrenceAfter(
        row.remind_at,
        row.frequency as string,
        new Date()
      );

      const advanceWrite = supabase
        .from("reminders")
        .update({ remind_at: nextAt })
        .eq("id", id);
      const { error } = await (isRowPersonal
        ? advanceWrite.is("memory_profile_id", null).eq("user_id", user.id)
        : advanceWrite.eq("memory_profile_id", rowProfileId));

      if (error) {
        console.log("❌ ADVANCE OCCURRENCE ERROR:");
        console.log(error);
        throw new Error(error.message);
      }

      await logReminderEvent({
        reminderId: id,
        memoryProfileId: row.memory_profile_id,
        eventType: "completed",
        actorId: user.id,
        actorRole: "caregiver",
        occurrenceAt: row.remind_at,
        metadata: { perOccurrence: true, nextOccurrenceAt: nextAt },
      });

      redirect(
        isMyNestContext
          ? "/reminders?context=my-nest"
          : "/reminders"
      );
    }

    const newCompleted = !row.completed;

    // PRIMARY (backward-compatible) write — the source of truth today.
    const completedWrite = supabase
      .from("reminders")
      .update({ completed: newCompleted })
      .eq("id", id);
    const { error } = await (isRowPersonal
      ? completedWrite.is("memory_profile_id", null).eq("user_id", user.id)
      : completedWrite.eq("memory_profile_id", rowProfileId));

    if (error) {
      console.log(
        "❌ TOGGLE ERROR:"
      );

      console.log(error);

      throw new Error(
        error.message
      );
    }

    // Best-effort lifecycle mirror — no-op until the migration adds these
    // columns. NEVER blocks completion: the `completed` write above succeeded.
    const lifecycleWrite = supabase
      .from("reminders")
      .update({
        status: newCompleted
          ? REMINDER_STATUS.COMPLETED
          : REMINDER_STATUS.SCHEDULED,
        completed_at: newCompleted
          ? new Date().toISOString()
          : null,
        completed_by: newCompleted ? user.id : null,
        actor_role: "caregiver",
      })
      .eq("id", id);
    const {
      error: lifecycleError,
    } = await (isRowPersonal
      ? lifecycleWrite.is("memory_profile_id", null).eq("user_id", user.id)
      : lifecycleWrite.eq("memory_profile_id", rowProfileId));

    if (lifecycleError) {
      console.warn(
        "[reminder-lifecycle] status write skipped",
        { code: lifecycleError.code }
      );
    }

    // Clear this reminder's native-local confirmation on complete/reopen so a stale
    // confirmation can't later suppress its push (e.g. reopening a fired one-time whose
    // remind_at is now in the past — the device can't reschedule a past one-time, so no
    // local would fire). Best-effort; RLS confines the delete to the caller's own rows.
    await supabase
      .from("reminder_local_confirmations")
      .delete()
      .eq("reminder_id", id);

    await logReminderEvent({
      reminderId: id,
      memoryProfileId: row.memory_profile_id,
      eventType: newCompleted
        ? "completed"
        : "reopened",
      actorId: user?.id ?? null,
      actorRole: "caregiver",
    });

    redirect(
      isMyNestContext
        ? "/reminders?context=my-nest"
        : "/reminders"
    );
  }

  // =====================================
  // DELETE REMINDER
  // =====================================

  async function deleteReminder(
    formData: FormData
  ) {
    "use server";

    const supabase =
      await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error(
        "Not authenticated"
      );
    }

    const id = formData.get(
      "id"
    ) as string;

    // AUTHORITATIVE FETCH + app-code authorization (parity with create/[id], independent
    // of dashboard-managed RLS) BEFORE deleting. A personal reminder is owned by user_id;
    // a care reminder requires access to its memory_profile.
    const { data: row } = await supabase
      .from("reminders")
      .select("id, user_id, memory_profile_id")
      .eq("id", id)
      .maybeSingle();

    if (!row) {
      redirect(
        isMyNestContext
          ? "/reminders?context=my-nest"
          : "/reminders"
      );
    }

    const authorized =
      row.memory_profile_id == null
        ? row.user_id === user.id
        : await userCanAccessProfile(
            user.id,
            row.memory_profile_id
          );

    if (!authorized) {
      throw new Error(
        "You don't have access to this reminder."
      );
    }

    const rowProfileId = row.memory_profile_id as string | null;

    // Scope the delete by the reminder's OWN context (defense in depth), not the cookie.
    const deleteWrite = supabase
      .from("reminders")
      .delete()
      .eq("id", id);

    const { error } = await (rowProfileId == null
      ? deleteWrite
          .is("memory_profile_id", null)
          .eq("user_id", user.id)
      : deleteWrite.eq(
          "memory_profile_id",
          rowProfileId
        ));

    if (error) {
      console.log(
        "❌ DELETE ERROR:"
      );

      console.log(error);

      throw new Error(
        error.message
      );
    }

    // Drop any native-local confirmations for the deleted reminder (hygiene; RLS confines
    // the delete to the caller's own rows). Best-effort — never blocks the delete.
    await supabase
      .from("reminder_local_confirmations")
      .delete()
      .eq("reminder_id", id);

    // Best-effort audit event — survives reminder deletion (no FK on
    // reminder_events.reminder_id). NEVER blocks the delete.
    await logReminderEvent({
      reminderId: id,
      memoryProfileId: rowProfileId,
      eventType: "deleted",
      actorId: user?.id ?? null,
      actorRole: "caregiver",
    });

    redirect(
      isMyNestContext
        ? "/reminders?context=my-nest"
        : "/reminders"
    );
  }

  const localReminders = (reminders ?? []).map((r) => ({
    id: r.id,
    title: r.title ?? null,
    remind_at: r.remind_at,
    recurring: r.recurring ?? false,
    frequency: r.frequency ?? null,
    completed: r.completed ?? false,
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-10">

      {/* Mirror reminders into on-device iOS local notifications (no-op on web). */}
      <NativeReminderSync reminders={localReminders} />
      {/* Report which reminders have a pending on-device local so the cron skips the
          redundant push (iOS duplicate fix). No-op on web; inert until migrated. */}
      <NativeReminderBeacon reminders={localReminders} />

      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 font-serif text-2xl font-semibold text-charcoal md:text-3xl">
          Reminder Center
        </h1>

        <p className="text-charcoal-soft">
          Today&apos;s focus, routines, and gentle reminders for care and daily life.
        </p>
      </div>

      {/* Create Reminder */}
      <details className="group bg-white border border-sand-deep/70 rounded-3xl p-6 shadow-soft mb-2">
      <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sage">
        <h2 className="text-xl font-semibold text-charcoal">
          Add a reminder
        </h2>
        <span className="text-sm text-charcoal-muted transition group-open:rotate-180 motion-reduce:transition-none">▾</span>
      </summary>
      {/* `key` forces a remount (clearing the uncontrolled fields incl. the date
          input's client state) after a successful create — which adds a reminder, so
          the count changes — and on a workspace switch (activeProfileId changes). The
          server-action redirect is a same-route soft nav that otherwise reuses the
          form DOM and keeps the previous title / date / recurrence. */}
      <form
        key={`${activeProfileId ?? "personal"}-${(reminders ?? []).length}`}
        action={createReminder}
        className="mt-4"
      >

        <div className="space-y-4">

          {/* Title */}
          <input
            name="title"
            defaultValue=""
            placeholder="Take medicine every Tuesday at 2PM..."
            required
            className="w-full rounded-xl border border-sand-deep px-4 py-3 text-base text-charcoal outline-none transition placeholder:text-charcoal-muted focus:border-sage focus:ring-2 focus:ring-sage/40"
          />

          {/* Date (timezone-correct: converts local → UTC in the browser) */}
          <ReminderDateTimeField
            required
            className="w-full rounded-xl border border-sand-deep px-4 py-3 text-base text-charcoal outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/40"
          />

          {/* Recurring */}
          <div className="border border-sand-deep/70 rounded-2xl p-4 space-y-3 bg-sand/40">

            <label className="flex items-center gap-2 text-sm text-charcoal-soft">
              <input
                type="checkbox"
                name="recurring"
                className="accent-sage"
              />

              Recurring reminder
            </label>

            <select
              name="frequency"
              defaultValue="daily"
              className="w-full rounded-xl border border-sand-deep px-4 py-3 text-base text-charcoal outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/40"
            >
              <option value="daily">
                Daily
              </option>

              <option value="weekly">
                Weekly
              </option>

              <option value="monthly">
                Monthly
              </option>
            </select>
          </div>

          <button
            type="submit"
            className="rounded-full bg-sage px-6 py-3 font-semibold text-white shadow-soft transition hover:bg-sage-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            Create Reminder
          </button>
        </div>
      </form>
      </details>

      <ReminderCenter
        reminders={(reminders ?? []) as ReminderRecord[]}
        careProfileName={careProfileName}
        toggleAction={toggleReminderComplete}
        deleteAction={deleteReminder}
      />
    </div>
  );
}