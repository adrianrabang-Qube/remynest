import { createClient } from "../../../utils/supabase/server"
import { redirect } from "next/navigation"

export default function NewReminderPage() {
  async function createReminder(formData: FormData) {
    "use server"

    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("Not authenticated")
    }

    const title = formData.get("title") as string
    const remind_at = formData.get("remind_at") as string

    const { error } = await supabase.from("reminders").insert({
      title,
      remind_at,
      user_id: user.id,
    })

    if (error) {
      console.error(error)
      throw new Error("Failed to create reminder")
    }

    redirect("/reminders")
  }

  return (
    <div>
      <h1>New Reminder</h1>

      <form action={createReminder}>
        <input name="title" placeholder="Title" required />
        <input type="datetime-local" name="remind_at" required />
        <button type="submit">Save Reminder</button>
      </form>
    </div>
  )
}