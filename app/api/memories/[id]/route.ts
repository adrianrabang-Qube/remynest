import { createClient } from "@/lib/supabase/server";
import {
  normalizeAttachments,
  resolveCoverImageUrl,
  type MemoryAttachment,
} from "@/lib/memory-media";
import { buildMemoryMediaPayload } from "@/lib/memory-media-pipeline";
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

  const contentType =
    req.headers.get("content-type") ?? "";

  let title: unknown;
  let content: unknown;
  let attachments: MemoryAttachment[];
  let coverImageUrl: string | null;
  let hasMemoryDate = false;
  let memoryDateValue: unknown = null;
  let memoryDatePrecisionValue: unknown = "day";

  if (
    contentType.includes("multipart/form-data")
  ) {
    // Multi-photo edit: kept existing attachments (JSON) + new files (multipart).
    // Reuse the create pipeline to upload new files and merge with the kept set.
    const form = await req.formData();

    title = form.get("title");
    content = form.get("content");

    let kept: unknown = [];
    const keptRaw = form.get("attachments");
    if (
      typeof keptRaw === "string" &&
      keptRaw.trim()
    ) {
      try {
        kept = JSON.parse(keptRaw);
      } catch {
        kept = [];
      }
    }

    const uploadedFiles = form
      .getAll("uploadedFiles")
      .filter((f): f is File => f instanceof File);

    const media =
      await buildMemoryMediaPayload({
        body: { attachments: kept, uploadedFiles },
        userId: user.id,
      });

    attachments = media.attachments;
    // Cover = first image of the FINAL set (kept + newly uploaded). The pipeline
    // only returns a cover when files were uploaded, so derive it here so a
    // remove-only edit recomputes the cover correctly too.
    coverImageUrl =
      attachments.find(
        (a) => a.type === "image"
      )?.url ?? null;

    hasMemoryDate = form.has("memoryDate");
    const md = form.get("memoryDate");
    memoryDateValue =
      typeof md === "string" && md.trim()
        ? md
        : null;
    memoryDatePrecisionValue =
      form.get("memoryDatePrecision");
  } else {
    // Backward-compatible JSON path — unchanged behavior for existing callers.
    const body = await req.json();
    title = body.title;
    content = body.content;
    attachments = normalizeAttachments(
      body.attachments
    );
    coverImageUrl = resolveCoverImageUrl(
      body.coverImageUrl
    );
    hasMemoryDate = "memoryDate" in body;
    memoryDateValue = body.memoryDate;
    memoryDatePrecisionValue =
      body.memoryDatePrecision;
  }

  // Historical date — only touched when the caller includes it, so other PUT
  // callers are unaffected. Effective date = coalesce(memory_date, created_at).
  const memoryDateUpdate: {
    memory_date?: string | null;
    memory_date_precision?: string | null;
  } = {};

  if (hasMemoryDate) {
    const resolved =
      validateAndResolveMemoryDate(
        memoryDateValue as string | null,
        memoryDatePrecisionValue as
          | string
          | undefined
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
      title,
      content,

      attachments,

      cover_image_url: coverImageUrl,

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