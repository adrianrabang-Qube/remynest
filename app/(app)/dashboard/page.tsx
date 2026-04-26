import { createClient } from "../../../lib/supabase/server"

export default async function DashboardPage() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("memories")
    .select("*")

  return (
    <div>
      <h1>Dashboard</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}
