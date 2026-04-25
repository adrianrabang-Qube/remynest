import { createClient } from "../../utils/supabase/server"
import Link from "next/link"

export default async function MemoriesPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return <div>Not logged in</div>

  const { data: memories } = await supabase
    .from("memories")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div>
      <h1>Memories</h1>

      <Link href="/memories/new">+ New Memory</Link>

      {!memories || memories.length === 0 ? (
        <div>No memories yet</div>
      ) : (
        memories.map((m) => (
          <div key={m.id} style={{ marginBottom: 12 }}>
            <strong>{m.title}</strong>
            <div>{m.content}</div>
          </div>
        ))
      )}
    </div>
  )
}