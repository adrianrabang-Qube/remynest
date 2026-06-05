import { createClient } from "@/lib/supabase/server";
import {
  normalizeAttachments,
  resolveCoverImageUrl,
} from "@/lib/memory-media";

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

  const normalizedAttachments =
    normalizeAttachments(
      body.attachments
    );

  const normalizedCoverImageUrl =
    resolveCoverImageUrl(
      body.coverImageUrl
    );

  const { error } = await supabase
    .from("memories")
    .update({
      title: body.title,
      content: body.content,

      attachments:
        normalizedAttachments,

      cover_image_url:
        normalizedCoverImageUrl,
    })
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[memories/:id] mutation failed", error);
    return new Response("Memory request failed", { status: 500 });
  }

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

  if (error) {
    console.error("[memories/:id] mutation failed", error);
    return new Response("Memory request failed", { status: 500 });
  }

  return Response.json({ success: true });
}