import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function RemindersPage() {
  const supabase = createClient();

  // 🔐 Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 📦 Fetch reminders
  const { data: reminders, error: remindersError } =
    await supabase
      .from("reminders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

  if (remindersError) {
    console.log("❌ FETCH REMINDERS ERROR:");
    console.log(remindersError);
  }

  // ➕ Create Reminder
  async function createReminder(formData: FormData) {
    "use server";

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const title = formData.get("title") as string;

    const remindAt = formData.get(
      "remind_at"
    ) as string;

    const recurring =
      formData.get("recurring") === "on";

    const frequency = formData.get(
      "frequency"
    ) as string;

    if (!title || title.trim().length === 0) {
      throw new Error("Title required");
    }

    if (!remindAt) {
      throw new Error(
        "Reminder date required"
      );
    }

    const finalFrequency = recurring
      ? frequency
      : null;

    const { data, error } = await supabase
      .from("reminders")
      .insert({
        title,
        user_id: user.id,

        remind_at: new Date(
          remindAt
        ).toISOString(),

        completed: false,

        recurring,

        frequency: finalFrequency,
      })
      .select()
      .single();

    if (error) {
      console.log("❌ REMINDER CREATE ERROR:");
      console.log(error);

      throw new Error(error.message);
    }

    console.log("✅ Reminder created:");
    console.log(data);

    redirect("/reminders");
  }

  // ✅ Toggle Reminder Completion
  async function toggleReminderComplete(
    formData: FormData
  ) {
    "use server";

    const supabase = createClient();

    const id = formData.get("id") as string;

    const completed =
      formData.get("completed") === "true";

    const { error } = await supabase
      .from("reminders")
      .update({
        completed: !completed,
      })
      .eq("id", id);

    if (error) {
      console.log("❌ TOGGLE ERROR:");
      console.log(error);

      throw new Error(error.message);
    }

    redirect("/reminders");
  }

  // 🗑️ Delete Reminder
  async function deleteReminder(
    formData: FormData
  ) {
    "use server";

    const supabase = createClient();

    const id = formData.get("id") as string;

    const { error } = await supabase
      .from("reminders")
      .delete()
      .eq("id", id);

    if (error) {
      console.log("❌ DELETE ERROR:");
      console.log(error);

      throw new Error(error.message);
    }

    redirect("/reminders");
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[#2f3e34] mb-2">
          Reminders
        </h1>

        <p className="text-gray-500">
          Manage your future memory prompts and AI reminders.
        </p>
      </div>

      {/* Create Reminder */}
      <form
        key={Date.now()}
        action={createReminder}
        className="bg-white border rounded-2xl p-6 shadow-sm mb-8"
      >
        <h2 className="text-xl font-semibold mb-4">
          Create Reminder
        </h2>

        <div className="space-y-4">
          {/* Title */}
          <input
            name="title"
            defaultValue=""
            placeholder="Take medicine every Tuesday at 2PM..."
            required
            className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
          />

          {/* Date */}
          <input
            type="datetime-local"
            name="remind_at"
            defaultValue=""
            required
            className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
          />

          {/* Recurring */}
          <div className="border rounded-xl p-4 space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="recurring"
              />

              Recurring reminder
            </label>

            <select
              name="frequency"
              defaultValue="daily"
              className="w-full border rounded-xl px-4 py-3 outline-none"
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
            className="bg-black text-white px-6 py-3 rounded-xl hover:opacity-90 transition"
          >
            Create Reminder
          </button>
        </div>
      </form>

      {/* Reminder List */}
      <div className="space-y-4">
        {reminders && reminders.length > 0 ? (
          reminders.map((reminder) => (
            <div
              key={reminder.id}
              className="bg-white border rounded-2xl p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg text-[#2f3e34]">
                    {reminder.title}
                  </h3>

                  <p className="text-sm text-gray-500 mt-2">
                    Created{" "}
                    {reminder.created_at
                      ? new Date(
                          reminder.created_at
                        ).toLocaleString()
                      : "Unknown"}
                  </p>

                  <p className="text-sm text-gray-400 mt-1">
                    Reminds at{" "}
                    {reminder.remind_at
                      ? new Date(
                          reminder.remind_at
                        ).toLocaleString()
                      : "Unknown"}
                  </p>

                  {reminder.recurring &&
                    reminder.frequency && (
                      <p className="text-sm text-blue-600 mt-1">
                        Recurring:{" "}
                        {reminder.frequency}
                      </p>
                    )}
                </div>

                <div className="flex items-center gap-2">
                  {/* ✅ Completion Toggle */}
                  <form action={toggleReminderComplete}>
                    <input
                      type="hidden"
                      name="id"
                      value={reminder.id}
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
                          ? "bg-green-200 text-green-800"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {reminder.completed
                        ? "Completed"
                        : "Active"}
                    </button>
                  </form>

                  {/* 🗑️ Delete */}
                  <form action={deleteReminder}>
                    <input
                      type="hidden"
                      name="id"
                      value={reminder.id}
                    />

                    <button
                      type="submit"
                      className="text-xs px-3 py-1 rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white border rounded-2xl p-10 text-center text-gray-500">
            No reminders yet.
          </div>
        )}
      </div>
    </div>
  );
}