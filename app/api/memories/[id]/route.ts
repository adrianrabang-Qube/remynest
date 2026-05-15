import { createClient } from "@/lib/supabase/server";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase =
  await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();

  const { error } = await supabase
    .from("memories")
    .update({
      title: body.title,
      content: body.content,
    })
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) return new Response(error.message, { status: 500 });

  return Response.json({ success: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase =
  await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return new Response("Unauthorized", { status: 401 });

  const { error } = await supabase
    .from("memories")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) return new Response(error.message, { status: 500 });

  return Response.json({ success: true });
}