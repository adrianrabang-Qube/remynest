import { createClient } from "../../../lib/supabase/server"
import Link from "next/link"

export default async function RemindersPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return <div>Not logged in</div>

  const { data: reminders } = await supabase
    .from("reminders")
    .select("*")
    .eq("user_id", user.id)
    .order("remind_at", { ascending: true })

  return (
    <div>
      <h1>Reminders</h1>

      <Link href="/reminders/new">+ New Reminder</Link>

      {!reminders || reminders.length === 0 ? (
        <div>No reminders yet</div>
      ) : (
        reminders.map((r) => (
          <div key={r.id} style={{ marginBottom: 12 }}>
            <strong>{r.title}</strong>
            <div>{r.remind_at}</div>
          </div>
        ))
      )}
    </div>
  )
}
