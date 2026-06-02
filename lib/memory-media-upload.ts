

import {
  normalizeAttachments,
  uploadMemoryAttachments,
  type MemoryAttachment,
} from "@/lib/memory-media";

export async function handleMemoryMediaUpload({
  attachments,
  uploadedFiles,
  userId,
}: {
  attachments?: unknown;
  uploadedFiles?: File[];
  userId: string;
}): Promise<{
  attachments: MemoryAttachment[];
  coverImageUrl: string | null;
}> {
  const normalizedAttachments =
    normalizeAttachments(
      attachments
    );

  const uploadedAttachments =
    uploadedFiles?.length
      ? await uploadMemoryAttachments(
          uploadedFiles,
          userId
        )
      : [];

  const finalAttachments = [
    ...normalizedAttachments,
    ...uploadedAttachments,
  ];

  const firstImage =
    finalAttachments.find(
      (item) =>
        item.type === "image"
    );

  return {
    attachments:
      finalAttachments,

    coverImageUrl:
      firstImage?.url ?? null,
  };
}