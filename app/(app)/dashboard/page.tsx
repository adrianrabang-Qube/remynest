import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Extra safety (server-side)
  if (!user) {
    redirect("/login")
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Dashboard</h1>

      <p><strong>User ID:</strong> {user.id}</p>
      <p><strong>Email:</strong> {user.email}</p>

      <form action="/auth/logout" method="post">
        <button type="submit">Logout</button>
      </form>
    </div>
  )
}
const supabase = createClient()

const {
  data: { user },
} = await supabase.auth.getUser()

if (user) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      timezone,
    })
}