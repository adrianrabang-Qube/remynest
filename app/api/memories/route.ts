import { createClient } from "@/utils/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json([]);
  }

  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json([]);
  }

  return Response.json(data);
}

export async function POST(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const { data, error } = await supabase
    .from("memories")
    .insert({
      title: body.title,
      content: body.content,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("POST ERROR:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}