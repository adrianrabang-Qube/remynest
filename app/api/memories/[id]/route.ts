import { createClient } from "@/lib/supabase/server";
import {
  normalizeAttachments,
  isAllowedAttachmentMime,
  type MemoryAttachment,
} from "@/lib/memory-media";
import { buildMemoryMediaPayload } from "@/lib/memory-media-pipeline";
import { enforceUploadQuota } from "@/lib/storage/upload-guard";
import {
  getStorageObjectInfo,
  isOwnedStoragePath,
  normalizeStoragePath,
  removeStorageObjects,
} from "@/lib/storage/object-info";
import { validateAndResolveMemoryDate } from "@/lib/memories/memory-date";
import { logger, errorMessage } from "@/lib/logger";
import { captureError } from "@/lib/observability/capture";

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

    // SECURITY (RC2 follow-up): make the DORMANT multipart (rollback) edit path equally authoritative —
    // re-derive every kept attachment's size from storage HERE (in the route, without changing the shared
    // media pipeline, which trusts the reported size). Same authoritative source as the JSON branch.
    const keptVerified = await Promise.all(
      normalizeAttachments(kept).map(async (a) => {
        const info = await getStorageObjectInfo(supabase, a.storagePath ?? a.url);
        return info.exists && info.size != null ? { ...a, size: info.size } : a;
      }),
    );

    const uploadedFiles = form
      .getAll("uploadedFiles")
      .filter((f): f is File => f instanceof File);

    // Pre-upload quota enforcement on the NEW files (kept attachments are already
    // counted). Validate before any storage write; fails closed; 0-byte = pass.
    const quota = await enforceUploadQuota(user.id, uploadedFiles);
    if (!quota.allowed) {
      return Response.json(
        {
          error: quota.reason ?? "Storage limit exceeded",
          quota,
        },
        { status: 413 }
      );
    }

    const media =
      await buildMemoryMediaPayload({
        body: { attachments: keptVerified, uploadedFiles },
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
    // JSON path. Two shapes:
    //  - legacy: { attachments } (kept set only) — unchanged behavior.
    //  - direct-to-storage: { attachments: kept, newAttachments: [...] } where the NEW
    //    files were uploaded straight to Supabase via signed URLs. Quota is re-verified
    //    against REAL object sizes for the NEW files only (kept are already counted), and
    //    every new path must be owner-scoped.
    const body = await req.json();
    title = body.title;
    content = body.content;

    const kept = normalizeAttachments(body.attachments);

    // SECURITY (RC2 follow-up): the storage ledger projects each attachment's `size` from
    // memories.attachments, so a KEPT attachment's CLIENT-reported size could under-count the ledger and
    // bypass the storage quota. Re-derive every kept attachment's size from AUTHORITATIVE storage metadata
    // (getStorageObjectInfo — the SAME source the create/new-attachment path uses); NEVER trust the client
    // size. Order + fields are preserved (Promise.all keeps array order) — only `size` is corrected. A real
    // kept object always resolves to its authoritative size; the fallback (object missing, or size not
    // surfaced by Storage) keeps the attachment unchanged (no data loss) and cannot be used to under-report
    // a real object's size.
    const keptVerified = await Promise.all(
      kept.map(async (a) => {
        const info = await getStorageObjectInfo(supabase, a.storagePath ?? a.url);
        return info.exists && info.size != null ? { ...a, size: info.size } : a;
      }),
    );

    const newDirect = Array.isArray(body.newAttachments)
      ? (body.newAttachments as Array<Record<string, unknown>>)
      : [];

    if (newDirect.length > 0) {
      for (const a of newDirect) {
        if (!isOwnedStoragePath(a?.storagePath ?? a?.url, user.id)) {
          return new Response("Invalid attachment path", { status: 400 });
        }
        if (!isAllowedAttachmentMime(a?.mimeType)) {
          return new Response("Unsupported file type", { status: 400 });
        }
      }

      const verifiedNew: Array<Record<string, unknown>> = [];
      for (const a of newDirect) {
        const path = normalizeStoragePath(a.storagePath ?? a.url);
        if (!path) continue;
        const info = await getStorageObjectInfo(supabase, path);
        if (!info.exists) continue; // phantom — not actually uploaded
        if (info.size == null) continue; // unverifiable size — fail closed (no client trust)
        verifiedNew.push({ ...a, size: info.size });
      }

      const directQuota = await enforceUploadQuota(
        user.id,
        verifiedNew.map((v) => ({ size: v.size }))
      );
      if (!directQuota.allowed) {
        await removeStorageObjects(
          supabase,
          verifiedNew.map((v) => String(v.storagePath ?? v.url ?? ""))
        );
        return Response.json(
          {
            error: directQuota.reason ?? "Storage limit exceeded",
            quota: directQuota,
          },
          { status: 413 }
        );
      }

      attachments = [...keptVerified, ...normalizeAttachments(verifiedNew)];
      // Cover = first image of the FINAL set (matches the multipart branch).
      coverImageUrl =
        attachments.find((a) => a.type === "image")?.url ?? null;
    } else {
      attachments = keptVerified;
      // Recompute the cover from the kept set — the migrated clients no longer send
      // coverImageUrl, so reading body.coverImageUrl would wipe the cover on every
      // no-new-file edit (title/content edit, photo removal, reorder).
      coverImageUrl =
        attachments.find((a) => a.type === "image")?.url ?? null;
    }

    hasMemoryDate = "memoryDate" in body;
    memoryDateValue = body.memoryDate;
    memoryDatePrecisionValue =
      body.memoryDatePrecision;
  }

  // SECURITY — owner-scope EVERY final attachment path (kept + new, both branches).
  // Without this, a client could plant another user's storage path into a memory it owns
  // (the path passes RLS since the ROW is the attacker's), and the RLS-bypassing
  // service-role signer would then mint a signed URL for the victim's private object on
  // read. The PUT is already user_id-scoped, so a user's own memory media is always under
  // users/{user.id}/ — this only rejects foreign/planted paths.
  for (const a of attachments) {
    if (!isOwnedStoragePath(a.storagePath ?? a.url, user.id)) {
      return new Response("Invalid attachment path", { status: 400 });
    }
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
    logger.error("[memories/:id] mutation failed", errorMessage(error));
    captureError(error, { route: "memories.mutate" });
    return new Response("Memory request failed", { status: 500 });
  }

  return Response.json({ success: true });
}

// GDPR note (Art 5(1)(e)/17): this deletes the memory ROW (user_id-scoped) but does
// NOT remove its attachment objects from the private bucket — those bytes are swept
// only at full account deletion. Per-memory storage erasure + an orphan-sweeper are
// tracked follow-ups (see lib/storage/object-info.ts). Do not assume media is gone here.
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
    logger.error("[memories/:id] mutation failed", errorMessage(error));
    captureError(error, { route: "memories.mutate" });
    return new Response("Memory request failed", { status: 500 });
  }

  return Response.json({ success: true });
}