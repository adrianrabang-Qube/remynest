import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  try {
    const supabase = createClient()

    // Get logged-in user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get request body
    const body = await req.json()
    const { title, content } = body

    // Insert memory linked to user
    const { data, error } = await supabase
      .from("memories")
      .insert([
        {
          title,
          content,
          user_id: user.id,
        },
      ])
      .select()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json(data)
  } catch (err) {
    return Response.json({ error: "Server crash" }, { status: 500 })
  }
}