import { createClient } from "../../../../lib/supabase/server"
import { redirect } from "next/navigation"

export default function NewMemoryPage() {
  async function createMemory(formData: FormData) {
    "use server"

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error("Not authenticated")

    const title = formData.get("title") as string
    const content = formData.get("content") as string

    await supabase.from("memories").insert({
      title,
      content,
      user_id: user.id,
    })

    redirect("/memories")
  }

  return (
    <form action={createMemory}>
      <input name="title" placeholder="Title" required />
      <textarea name="content" placeholder="Content" required />
      <button type="submit">Create Memory</button>
    </form>
  )
}
