import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function EditReminderPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  // ✅ SAFE SESSION
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return redirect("/login")

  const user = session.user

  // ✅ GET REMINDER (USER-SCOPED)
  const { data: reminder } = await supabase
    .from("reminders")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single()

  if (!reminder) return redirect("/reminders")

  async function updateReminder(formData: FormData) {
    "use server"

    const supabase = createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) return

    const title = formData.get("title") as string
    const remind_at = formData.get("remind_at") as string

    await supabase
      .from("reminders")
      .update({
        title,
        remind_at,
      })
      .eq("id", params.id)
      .eq("user_id", session.user.id) // ✅ SECURITY CHECK

    redirect("/reminders")
  }

  // ✅ format for input
  const localDateTime = new Date(reminder.remind_at)
    .toISOString()
    .slice(0, 16)

  return (
    <form action={updateReminder}>
      <div style={{ marginBottom: 10 }}>
        <input
          name="title"
          defaultValue={reminder.title}
          required
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <input
          type="datetime-local"
          name="remind_at"
          defaultValue={localDateTime}
          required
        />
      </div>

      <button type="submit">Update Reminder</button>
    </form>
  )
}