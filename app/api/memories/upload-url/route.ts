import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { resolveActiveProfileId } from "@/lib/context-resolver";
import { enforceUploadQuota } from "@/lib/storage/upload-guard";
import { isAllowedAttachmentMime } from "@/lib/memory-media";
import { enforceRateLimit } from "@/lib/security/rate-limit";

const BUCKET = "memory-media";

function deriveType(
  mime: string,
): "image" | "video" | "audio" | "document" | "file" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (
    mime === "application/pdf" ||
    mime === "application/msword" ||
    mime.includes("officedocument")
  )
    return "document";
  return "file";
}

function safeName(name: string): string {
  return (
    name
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "_") || "file"
  );
}

interface RequestedFile {
  name?: unknown;
  size?: unknown;
  mimeType?: unknown;
}

/**
 * POST /api/memories/upload-url
 *
 * Issues short-lived signed upload URLs so the client uploads media DIRECTLY to Supabase
 * Storage (bypassing the ~4.5 MB Vercel function-body limit). Security model:
 *  - storage paths are SERVER-GENERATED + owner-scoped (`users/{userId}/...`), so a client
 *    can never choose a path / write into another user's storage / spoof a path;
 *  - quota is enforced SERVER-SIDE here (pre-check, client-reported sizes) AND again at
 *    create/edit against the REAL object sizes — under-reporting here cannot bypass quota.
 */
// RC4: headroom for the per-file signed-upload-URL loop on large batches.
export const maxDuration = 30;

export async function POST(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = enforceRateLimit("upload", user.id);
  if (limited) return limited;

  const activeProfileId = await resolveActiveProfileId();

  let body: { files?: RequestedFile[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const requested = Array.isArray(body.files) ? body.files : [];
  if (requested.length === 0) {
    return NextResponse.json({ error: "No files" }, { status: 400 });
  }

  const files = requested.map((f) => ({
    name: typeof f.name === "string" && f.name.trim() ? f.name : "file",
    size:
      typeof f.size === "number" && Number.isFinite(f.size) && f.size > 0
        ? f.size
        : 0,
    mimeType: typeof f.mimeType === "string" ? f.mimeType : "",
  }));

  for (const f of files) {
    if (!isAllowedAttachmentMime(f.mimeType)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${f.mimeType || f.name}` },
        { status: 400 },
      );
    }
  }

  console.info("[memory-upload] SIGNED_UPLOAD_REQUEST", {
    userId: user.id,
    profileId: activeProfileId,
    attachmentCount: files.length,
    attachmentTypes: files.map((f) => deriveType(f.mimeType)),
  });

  // Server-authoritative quota pre-check on the WHOLE batch. Re-verified against REAL
  // object sizes at create/edit, so a client that under-reports size here is caught then.
  const quota = await enforceUploadQuota(
    user.id,
    files.map((f) => ({ size: f.size })),
  );
  if (!quota.allowed) {
    return NextResponse.json(
      { error: quota.reason ?? "Storage limit exceeded", quota },
      { status: 413 },
    );
  }

  const baseTs = Date.now();
  const uploads: Array<{
    storagePath: string;
    token: string;
    signedUrl: string;
    name: string;
    mimeType: string;
    size: number;
    type: string;
  }> = [];

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    // SERVER-GENERATED path — owner-scoped; the client never supplies it.
    const storagePath = `users/${user.id}/memories/${baseTs}-${i}-${safeName(f.name)}`;
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(storagePath);
    if (error || !data) {
      return NextResponse.json(
        { error: "Could not create upload URL" },
        { status: 500 },
      );
    }
    uploads.push({
      storagePath,
      token: data.token,
      signedUrl: data.signedUrl,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size,
      type: deriveType(f.mimeType),
    });
  }

  console.info("[memory-upload] SIGNED_UPLOAD_SUCCESS", {
    userId: user.id,
    profileId: activeProfileId,
    attachmentCount: uploads.length,
    attachmentTypes: uploads.map((u) => u.type),
  });

  return NextResponse.json({ uploads });
}
