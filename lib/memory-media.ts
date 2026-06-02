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

      return {
        id: item.id,
        url: item.url,
        name: item.name,
        storagePath: item.storagePath,

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

  return trimmed;
}

export async function uploadMemoryAttachment(
  file: File,
  userId: string
): Promise<MemoryAttachment> {
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

  const { data } =
    supabase.storage
      .from("memory-media")
      .getPublicUrl(
        storagePath
      );

  return {
    id: crypto.randomUUID(),
    name: file.name,
    filename: file.name,
    storagePath,
    url: data.publicUrl,

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

  const uploadResults =
    await Promise.all(
      files.map(
        async (file) => {
          try {
            return await uploadMemoryAttachment(
              file,
              userId
            );
          } catch (error) {
            console.error(
              "[memory-media] upload-failed",
              {
                fileName:
                  file.name,
                error,
              }
            );

            return null;
          }
        }
      )
    );

  return uploadResults.filter(
    (
      item
    ): item is NonNullable<
      typeof item
    > => item !== null
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