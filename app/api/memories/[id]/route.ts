import { createClient } from "@/lib/supabase/server";
import {
  normalizeAttachments,
  resolveCoverImageUrl,
} from "@/lib/memory-media";
import { validateAndResolveMemoryDate } from "@/lib/memories/memory-date";

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

  // Historical date — only touched when the caller includes it, so other PUT
  // callers are unaffected. Effective date = coalesce(memory_date, created_at).
  const memoryDateUpdate: {
    memory_date?: string | null;
    memory_date_precision?: string | null;
  } = {};

  if ("memoryDate" in body) {
    const resolved =
      validateAndResolveMemoryDate(
        body.memoryDate,
        body.memoryDatePrecision
      );

    if (!resolved.ok) {
      return new Response(resolved.error, {
        status: 400,
      });
    }

    memoryDateUpdate.memory_date =
      resolved.memoryDate;
    memoryDateUpdate.memory_date_precision =
      resolved.memoryDate
        ? resolved.precision
        : null;
  }

  const { error } = await supabase
    .from("memories")
    .update({
      title: body.title,
      content: body.content,

      attachments:
        normalizedAttachments,

      cover_image_url:
        normalizedCoverImageUrl,

      ...memoryDateUpdate,
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