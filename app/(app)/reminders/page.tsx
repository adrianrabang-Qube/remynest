import { createClient } from "../../../lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"

export default function NewReminderPage() {
  async function createReminder(formData: FormData) {
    "use server"

    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error("Not authenticated")

    const title = formData.get("title") as string

    await supabase.from("reminders").insert({
      title,
      user_id: user.id,
    })

    redirect("/reminders")
  }

  return (
    <form action={createReminder}>
      <input name="title" placeholder="Reminder title" required />
      <button type="submit">Create Reminder</button>
    </form>
  )
}
