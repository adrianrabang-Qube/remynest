import { createClient } from "../../../lib/supabase/server"
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

  return (
    <div>
      <h1>Your Memories</h1>

      <Link href="/memories/new">Create New</Link>

      <ul>
        {memories?.map((m: any) => (
          <li key={m.id}>
            <strong>{m.title}</strong>
            <p>{m.content}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
