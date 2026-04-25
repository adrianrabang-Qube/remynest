import { createClient } from "@/lib/supabase/server"

export default async function MemoryDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  const { data: memory } = await supabase
    .from("memories")
    .select("*")
    .eq("id", params.id)
    .single()

  async function updateMemory(formData: FormData) {
    "use server"

    const title = formData.get("title") as string
    const content = formData.get("content") as string

    const supabase = createClient()

    await supabase
      .from("memories")
      .update({ title, content })
      .eq("id", params.id)

    const { redirect } = await import("next/navigation")
    redirect("/memories")
  }

  return (
    <div>
      <h1>Edit Memory</h1>

      <form action={updateMemory}>
        <div style={{ marginBottom: 10 }}>
          <input
            name="title"
            defaultValue={memory?.title}
            placeholder="Title"
            required
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <textarea
            name="content"
            defaultValue={memory?.content}
            placeholder="Content"
            required
          />
        </div>

        <button type="submit">Save Changes</button>
      </form>
    </div>
  )
}