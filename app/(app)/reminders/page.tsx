import { createClient } from "@/lib/supabase/server";
import { resolveActiveProfileId } from "@/lib/context-resolver";
import { redirect } from "next/navigation";
import ReminderDateTimeField from "@/components/reminders/ReminderDateTimeField";

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
      <div className="max-w-4xl mx-auto px-6 py-10">
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

    const id = formData.get(
      "id"
    ) as string;

    const completed =
      formData.get(
        "completed"
      ) === "true";

    const { error } =
      await supabase
        .from("reminders")
        .update({
          completed: !completed,
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

    redirect(
      isMyNestContext
        ? "/reminders?context=my-nest"
        : "/reminders"
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-semibold text-charcoal mb-2">
          Reminders
        </h1>

        <p className="text-charcoal-soft">
          Manage your future memory prompts and AI reminders.
        </p>
      </div>

      {/* Create Reminder */}
      <form
        action={createReminder}
        className="bg-white border border-sand-deep/70 rounded-3xl p-6 shadow-soft mb-8"
      >
        <h2 className="text-xl font-semibold mb-4 text-charcoal">
          Create Reminder
        </h2>

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

      {/* Reminder List */}
      <div className="space-y-4">

        {reminders &&
        reminders.length > 0 ? (

          reminders.map(
            (reminder) => (

              <div
                key={reminder.id}
                className="bg-white border border-sand-deep/70 rounded-3xl p-5 shadow-soft transition hover:shadow-soft-lg"
              >

                <div className="flex items-start justify-between gap-4">

                  <div>

                    <h3 className="font-semibold text-lg text-charcoal">
                      {reminder.title}
                    </h3>

                    <p className="text-sm text-charcoal-muted mt-2">
                      Created{" "}
                      {reminder.created_at
                        ? new Date(
                            reminder.created_at
                          ).toLocaleString(
                            "en-IE",
                            {
                              hour12: false,
                            }
                          )
                        : "Unknown"}
                    </p>

                    <p className="text-sm text-charcoal-muted mt-1">
                      Reminds at{" "}
                      {reminder.remind_at
                        ? new Date(
                            reminder.remind_at
                          ).toLocaleString(
                            "en-IE",
                            {
                              hour12: false,
                            }
                          )
                        : "Unknown"}
                    </p>

                    {reminder.recurring &&
                      reminder.frequency && (
                        <p className="text-sm text-sage mt-1">
                          Recurring:{" "}
                          {reminder.frequency}
                        </p>
                      )}
                  </div>

                  <div className="flex items-center gap-2">

                    {/* Toggle */}
                    <form
                      action={
                        toggleReminderComplete
                      }
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={
                          reminder.id
                        }
                      />

                      <input
                        type="hidden"
                        name="completed"
                        value={String(
                          reminder.completed
                        )}
                      />

                      <button
                        type="submit"
                        className={`text-xs px-3 py-1 rounded-full transition ${
                          reminder.completed
                            ? "bg-sage-soft/25 text-sage-deep"
                            : "bg-sand-deep/60 text-charcoal-soft"
                        }`}
                      >
                        {reminder.completed
                          ? "Completed"
                          : "Active"}
                      </button>
                    </form>

                    {/* Delete */}
                    <form
                      action={
                        deleteReminder
                      }
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={
                          reminder.id
                        }
                      />

                      <button
                        type="submit"
                        className="text-xs px-3 py-1 rounded-full bg-rose-50 text-rose-600/90 hover:bg-rose-100 transition"
                      >
                        Delete
                      </button>
                    </form>

                  </div>
                </div>
              </div>
            )
          )

        ) : (

          <div className="bg-white border border-sand-deep/70 rounded-3xl p-10 text-center text-charcoal-muted shadow-soft">
            No reminders yet.
          </div>
        )}
      </div>
    </div>
  );
}