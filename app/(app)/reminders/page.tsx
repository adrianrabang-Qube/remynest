import { createClient } from "../../../lib/supabase/server"

export default async function RemindersPage() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("reminders")
    .select("*")

  return (
    <div>
      <h1>Reminders</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}
