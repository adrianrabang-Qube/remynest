import { createClient } from "../../../../lib/supabase/server"

export default async function ReminderPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("id", params.id)
    .single()

  return (
    <div>
      <h1>Reminder</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}
