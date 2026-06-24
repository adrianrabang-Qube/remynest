import { createClient } from "@/lib/supabase/client";

const BUCKET = "memory-media";

export type DirectAttachment = {
  id: string;
  url: string;
  storagePath: string;
  name: string;
  filename: string;
  type: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
};

/** Thrown when the sign endpoint rejects the batch over quota — carries the 413 payload. */
export class UploadQuotaError extends Error {
  quota: unknown;
  constructor(quota: unknown) {
    super("Storage limit exceeded");
    this.name = "UploadQuotaError";
    this.quota = quota;
  }
}

type SignedUpload = {
  storagePath: string;
  token: string;
  signedUrl: string;
  name: string;
  mimeType: string;
  size: number;
  type: string;
};

/**
 * Direct-to-storage upload. (1) Asks the server for signed upload URLs (quota enforced +
 * paths server-generated), (2) uploads each file STRAIGHT to Supabase Storage (no bytes
 * through the API route → no ~4.5 MB limit), (3) returns attachment metadata to submit as
 * JSON to create/edit. Returns [] for an empty batch (text-only memory).
 */
export async function uploadAttachmentsDirect(
  files: File[],
): Promise<DirectAttachment[]> {
  if (!files.length) return [];

  // 1. Request signed upload URLs (server enforces quota + generates owner-scoped paths).
  const signRes = await fetch("/api/memories/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      files: files.map((f) => ({
        name: f.name,
        size: f.size,
        mimeType: f.type,
      })),
    }),
  });

  const signData = await signRes.json().catch(() => ({}));
  if (!signRes.ok) {
    if (signRes.status === 413 && signData?.quota) {
      throw new UploadQuotaError(signData.quota);
    }
    throw new Error(signData?.error || "Could not start upload");
  }

  const uploads: SignedUpload[] = Array.isArray(signData.uploads)
    ? signData.uploads
    : [];
  if (uploads.length !== files.length) {
    throw new Error("Upload could not be prepared");
  }

  // 2. Upload each file directly to its signed URL (the token authorizes that exact path).
  const supabase = createClient();
  await Promise.all(
    uploads.map(async (u, i) => {
      const { error } = await supabase.storage
        .from(BUCKET)
        .uploadToSignedUrl(u.storagePath, u.token, files[i]);
      if (error) throw new Error(`Upload failed: ${files[i].name}`);
    }),
  );

  console.info("[memory-upload] DIRECT_UPLOAD_COMPLETE", {
    attachmentCount: uploads.length,
    attachmentTypes: uploads.map((u) => u.type),
  });

  // 3. Metadata only (no bytes) for the create/edit JSON payload. The server re-verifies
  //    the REAL object size before persisting, so size here is advisory.
  return uploads.map((u, i) => ({
    id: crypto.randomUUID(),
    url: u.storagePath,
    storagePath: u.storagePath,
    name: files[i].name,
    filename: files[i].name,
    type: u.type,
    mimeType: files[i].type || "application/octet-stream",
    size: files[i].size,
    uploadedAt: new Date().toISOString(),
  }));
}
