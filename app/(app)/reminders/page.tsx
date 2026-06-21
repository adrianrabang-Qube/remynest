import { createClient } from "@/lib/supabase/server";
import { resolveActiveProfileId } from "@/lib/context-resolver";
import { userCanAccessProfile } from "@/lib/profile-ownership";
import { redirect } from "next/navigation";
import ReminderDateTimeField from "@/components/reminders/ReminderDateTimeField";
import ReminderCenter, {
  type ReminderRecord,
} from "@/components/reminders/ReminderCenter";
import NativeReminderSync from "@/components/reminders/NativeReminderSync";
import {
  logReminderEvent,
  REMINDER_STATUS,
} from "@/lib/reminders/lifecycle";

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

    const completed =
      formData.get(
        "completed"
      ) === "true";

    const newCompleted = !completed;

    // PRIMARY (backward-compatible) write — the source of truth today. Scope CARE
    // by profile, PERSONAL ("My Nest") by null-profile + owner.
    const completedWrite = supabase
      .from("reminders")
      .update({
        completed: newCompleted,
      })
      .eq("id", id);

    const { error } = await (isPersonal
      ? completedWrite
          .is("memory_profile_id", null)
          .eq("user_id", user.id)
      : completedWrite.eq(
          "memory_profile_id",
          activeProfileId
        ));

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
        completed_by: newCompleted
          ? user.id
          : null,
        actor_role: "caregiver",
      })
      .eq("id", id);

    const {
      error: lifecycleError,
    } = await (isPersonal
      ? lifecycleWrite
          .is("memory_profile_id", null)
          .eq("user_id", user.id)
      : lifecycleWrite.eq(
          "memory_profile_id",
          activeProfileId
        ));

    if (lifecycleError) {
      console.warn(
        "[reminder-lifecycle] status write skipped",
        { code: lifecycleError.code }
      );
    }

    await logReminderEvent({
      reminderId: id,
      memoryProfileId: activeProfileId,
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

    // Scope CARE by profile, PERSONAL ("My Nest") by null-profile + owner.
    const deleteWrite = supabase
      .from("reminders")
      .delete()
      .eq("id", id);

    const { error } = await (isPersonal
      ? deleteWrite
          .is("memory_profile_id", null)
          .eq("user_id", user.id)
      : deleteWrite.eq(
          "memory_profile_id",
          activeProfileId
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

    // Best-effort audit event — survives reminder deletion (no FK on
    // reminder_events.reminder_id). NEVER blocks the delete.
    await logReminderEvent({
      reminderId: id,
      memoryProfileId: activeProfileId,
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
    <div className="max-w-4xl mx-auto px-4 py-8 md:px-6 md:py-10">

      {/* Mirror reminders into on-device iOS local notifications (no-op on web). */}
      <NativeReminderSync reminders={localReminders} />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-semibold text-charcoal mb-2">
          Reminder Center
        </h1>

        <p className="text-charcoal-soft">
          Today&apos;s focus, routines, and gentle reminders for care and daily life.
        </p>
      </div>

      {/* Create Reminder */}
      <details className="group bg-white border border-sand-deep/70 rounded-3xl p-6 shadow-soft mb-2">
      <summary className="cursor-pointer list-none flex items-center justify-between">
        <h2 className="text-xl font-semibold text-charcoal">
          Add a reminder
        </h2>
        <span className="text-charcoal-muted text-sm group-open:rotate-180 transition">▾</span>
      </summary>
      <form
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
            className="w-full border border-sand-deep rounded-xl px-4 py-3 outline-none transition focus:ring-2 focus:ring-sage/40 focus:border-sage"
          />

          {/* Date (timezone-correct: converts local → UTC in the browser) */}
          <ReminderDateTimeField
            required
            className="w-full border border-sand-deep rounded-xl px-4 py-3 outline-none transition focus:ring-2 focus:ring-sage/40 focus:border-sage"
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
              className="w-full border border-sand-deep rounded-xl px-4 py-3 outline-none transition focus:ring-2 focus:ring-sage/40 focus:border-sage"
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
            className="bg-sage text-white px-6 py-3 rounded-full font-semibold shadow-soft hover:bg-sage-deep transition"
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