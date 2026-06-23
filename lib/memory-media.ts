import { createClient } from "@/lib/supabase/server";

export type MemoryAttachment = {
  id: string;
  url: string;
  name?: string;
  storagePath?: string;

  type:
    | "image"
    | "video"
    | "audio"
    | "document"
    | "file";

  filename: string;

  size?: number;
  mimeType?: string;

  thumbnailUrl?: string;
  coverImageUrl?: string;

  uploadedAt?: string;

  metadata?: {
    width?: number;
    height?: number;
    durationMs?: number;

    geolocation?: {
      latitude: number;
      longitude: number;
      placeName?: string;
    };

    calendar?: {
      startAt?: string;
      endAt?: string;
      timezone?: string;
    };
  };
};

const MEDIA_PUBLIC_PREFIX =
  "/storage/v1/object/public/memory-media/";
const MEDIA_SIGN_PREFIX =
  "/storage/v1/object/sign/memory-media/";

/**
 * Resolve the canonical `memory-media` storage PATH from whatever is stored:
 * a bare path, a legacy public URL, or a (transient) signed URL. The DB must
 * only ever hold paths — never public or signed URLs — so signed tokens are
 * never persisted on edit and no permanent public URL is stored on upload.
 */
function deriveStoragePath(
  storagePath?: unknown,
  url?: unknown
): string | undefined {
  if (typeof storagePath === "string" && storagePath.trim()) {
    return storagePath.replace(/^\/+/, "");
  }
  if (typeof url !== "string" || !url.trim()) return undefined;
  const u = url.trim();
  for (const marker of [MEDIA_PUBLIC_PREFIX, MEDIA_SIGN_PREFIX]) {
    const i = u.indexOf(marker);
    if (i !== -1) {
      return decodeURIComponent(
        u.slice(i + marker.length).split("?")[0]
      );
    }
  }
  if (/^https?:\/\//i.test(u)) return undefined; // foreign URL — leave as-is
  return u.replace(/^\/+/, "");
}

export function normalizeAttachments(
  attachments: unknown
): MemoryAttachment[] {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments
    .filter(
      (
        item
      ): item is MemoryAttachment =>
        !!item &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.url ===
          "string" &&
        typeof item.type ===
          "string" &&
        (typeof item.filename === "string" ||
          typeof item.name === "string")
    )
    .map((item) => {
      const filename =
        typeof item.filename === "string"
          ? item.filename
          : typeof item.name === "string"
          ? item.name
          : "";

      // Persist the storage PATH only (strip any public/signed URL).
      const resolvedPath = deriveStoragePath(
        item.storagePath,
        item.url
      );

      return {
        id: item.id,
        url: resolvedPath ?? item.url,
        name: item.name,
        storagePath: resolvedPath ?? item.storagePath,

        type:
          item.type === "image" ||
          item.type === "video" ||
          item.type === "audio" ||
          item.type === "document"
            ? item.type
            : "file",

        filename,

        size:
          typeof item.size ===
          "number"
            ? item.size
            : undefined,

        mimeType:
          typeof item.mimeType ===
          "string"
            ? item.mimeType
            : undefined,

        thumbnailUrl:
          typeof item.thumbnailUrl ===
          "string"
            ? item.thumbnailUrl
            : undefined,

        coverImageUrl:
          typeof item.coverImageUrl ===
          "string"
            ? item.coverImageUrl
            : undefined,

        uploadedAt:
          typeof item.uploadedAt ===
          "string"
            ? item.uploadedAt
            : undefined,

        metadata:
          typeof item.metadata ===
          "object" &&
          item.metadata !== null
            ? item.metadata
            : undefined,
      };
    }) as MemoryAttachment[];
}

export function resolveCoverImageUrl(
  coverImageUrl: unknown
): string | null {
  if (
    typeof coverImageUrl !==
    "string"
  ) {
    return null;
  }

  const trimmed =
    coverImageUrl.trim();

  if (!trimmed) {
    return null;
  }

  // Persist the storage PATH only — never a public or (transient) signed URL.
  return deriveStoragePath(undefined, trimmed) ?? trimmed;
}

export class MemoryAttachmentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MemoryAttachmentValidationError";
  }
}

// Per-file size cap REMOVED (authoritative 2026-06-23): storage is enforced by
// TOTAL usage per user (`enforceUploadQuota`, before the write), NOT per-file. Any
// supported media size uploads while used < plan limit; the only remaining bound is
// the Supabase Storage object-size limit (a project setting).
const ALLOWED_MEMORY_ATTACHMENT_TYPES = [
  "image/",
  "video/",
  "audio/",
  "application/pdf",
];

function validateMemoryAttachmentFile(
  file: File
) {
  const type = file.type || "";

  const isAllowedType = ALLOWED_MEMORY_ATTACHMENT_TYPES.some(
    (allowed) =>
      allowed.endsWith("/")
        ? type.startsWith(allowed)
        : type === allowed
  );

  if (!isAllowedType) {
    throw new MemoryAttachmentValidationError(
      `Unsupported file type: ${type || file.name}`
    );
  }
}

export async function uploadMemoryAttachment(
  file: File,
  userId: string
): Promise<MemoryAttachment> {
  validateMemoryAttachmentFile(file);

  const supabase =
    await createClient();

  const safeFileName = file.name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "_");

  const storagePath = `users/${userId}/memories/${Date.now()}-${safeFileName}`;

  const { error } =
    await supabase.storage
      .from("memory-media")
      .upload(
        storagePath,
        file,
        {
          upsert: false,
        }
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  // Private bucket: store the storage PATH, never a public URL. Read paths mint
  // short-lived signed URLs server-side (lib/memory-media-signing).
  return {
    id: crypto.randomUUID(),
    name: file.name,
    filename: file.name,
    storagePath,
    url: storagePath,

    type: file.type.startsWith(
      "image/"
    )
      ? "image"
      : file.type.startsWith(
            "video/"
          )
        ? "video"
        : file.type.startsWith(
              "audio/"
            )
          ? "audio"
          : file.type === "application/pdf" ||
            file.type === "application/msword" ||
            file.type.includes(
              "officedocument"
            )
          ? "document"
          : "file",

    size: file.size,
    mimeType:
      file.type ||
      "application/octet-stream",

    uploadedAt:
      new Date().toISOString(),

    metadata: {},
  };
}

export async function uploadMemoryAttachments(
  files: File[],
  userId: string
): Promise<MemoryAttachment[]> {
  if (
    !Array.isArray(files) ||
    files.length === 0
  ) {
    return [];
  }

  return await Promise.all(
    files.map((file) =>
      uploadMemoryAttachment(file, userId)
    )
  );
}

export async function handleMemoryMediaUpload({
  attachments,
  uploadedFiles,
  userId,
}: {
  attachments?: unknown;
  uploadedFiles?: File[];
  userId: string;
}) {
  const normalizedAttachments =
    normalizeAttachments(
      attachments
    );

  if (
    !uploadedFiles?.length
  ) {
    return {
      attachments:
        normalizedAttachments,

      coverImageUrl: null,
    };
  }

  const uploaded =
    await uploadMemoryAttachments(
      uploadedFiles,
      userId
    );

  const mergedAttachments = [
    ...normalizedAttachments,
    ...uploaded,
  ];

  const firstImage =
    mergedAttachments.find(
      (item) =>
        item.type === "image"
    );

  return {
    attachments:
      mergedAttachments,

    coverImageUrl:
      firstImage?.url ?? null,
  };
}