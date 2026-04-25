import { createClient } from "../../../utils/supabase/server"
import { redirect } from "next/navigation"

export default function NewMemoryPage() {
  async function createMemory(formData: FormData) {
    "use server"

    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error("Not authenticated")

    const title = formData.get("title") as string
    const content = formData.get("content") as string

    const { error } = await supabase.from("memories").insert({
      title,
      content,
      user_id: user.id,
    })

    if (error) throw new Error("Insert failed")

    redirect("/memories")
  }

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ marginBottom: 20 }}>New Memory</h1>

      <form action={createMemory} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 400 }}>
        <input
          name="title"
          placeholder="Title"
          required
          style={{ padding: 10 }}
        />

        <textarea
          name="content"
          placeholder="Content"
          required
          style={{ padding: 10, minHeight: 120 }}
        />

        <button type="submit" style={{ padding: 10 }}>
          Save Memory
        </button>
      </form>
    </div>
  )
}