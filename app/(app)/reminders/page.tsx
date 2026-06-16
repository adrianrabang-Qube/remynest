import { createClient } from "@/lib/supabase/server";
import { resolveActiveProfileId } from "@/lib/context-resolver";
import { userCanAccessProfile } from "@/lib/profile-ownership";
import { redirect } from "next/navigation";
import ReminderDateTimeField from "@/components/reminders/ReminderDateTimeField";
import ReminderCenter, {
  type ReminderRecord,
} from "@/components/reminders/ReminderCenter";
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

  // 🧠 Context Isolation
  const isMyNestContext =
    searchParams?.context ===
    "my-nest";

  const activeProfileId =
    isMyNestContext
      ? null
      : await resolveActiveProfileId();

  // 🚫 No active profile
  if (!activeProfileId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 md:px-6 md:py-10">
        <div className="rounded-3xl border border-gold/30 bg-gold/10 p-6 text-charcoal-soft">
          My Nest mode active. Reminders are isolated from care profiles.
        </div>
      </div>
    );
  }

  // 📦 Fetch reminders
  const {
    data: reminders,
    error: remindersError,
  } = await supabase
    .from("reminders")
    .select("*")
    .eq(
      "memory_profile_id",
      activeProfileId
    )
    .order("created_at", {
      ascending: false,
    });

  if (remindersError) {
    console.log(
      "❌ FETCH REMINDERS ERROR:"
    );

    console.log(remindersError);
  }

  // Care-profile name for the Caregiver-context framing.
  const { data: activeProfile } =
    await supabase
      .from("memory_profiles")
      .select("preferred_name, profile_name")
      .eq("id", activeProfileId)
      .maybeSingle();

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

    const activeProfileId =
      await resolveActiveProfileId();

    if (!activeProfileId) {
      throw new Error(
        "My Nest mode active. Reminder creation requires an active care profile."
      );
    }

    // Server-side ownership check — the active-context cookie is client-settable,
    // so verify the user actually owns / has caregiver access to this profile.
    if (
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

    const id = formData.get(
      "id"
    ) as string;

    const completed =
      formData.get(
        "completed"
      ) === "true";

    const newCompleted = !completed;

    // PRIMARY (backward-compatible) write — the source of truth today.
    const { error } =
      await supabase
        .from("reminders")
        .update({
          completed: newCompleted,
        })
        .eq("id", id)
        .eq(
          "memory_profile_id",
          activeProfileId
        );

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
    const {
      error: lifecycleError,
    } = await supabase
      .from("reminders")
      .update({
        status: newCompleted
          ? REMINDER_STATUS.COMPLETED
          : REMINDER_STATUS.SCHEDULED,
        completed_at: newCompleted
          ? new Date().toISOString()
          : null,
        completed_by: newCompleted
          ? user?.id ?? null
          : null,
        actor_role: "caregiver",
      })
      .eq("id", id)
      .eq(
        "memory_profile_id",
        activeProfileId
      );

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

    const id = formData.get(
      "id"
    ) as string;

    const { error } =
      await supabase
        .from("reminders")
        .delete()
        .eq("id", id)
        .eq(
          "memory_profile_id",
          activeProfileId
        );

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:px-6 md:py-10">

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