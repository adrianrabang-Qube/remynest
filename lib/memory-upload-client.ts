export type MemoryUploadClientPayload = {
  title: string;
  content: string;
  attachments?: unknown[];
  coverImageUrl?: string | null;
  uploadedFiles?: File[];
};

export async function buildMemoryUploadPayload(
  input: MemoryUploadClientPayload
) {
  return {
    ...input,
    attachments:
      input.attachments ?? [],
    uploadedFiles:
      input.uploadedFiles ?? [],
    coverImageUrl:
      input.coverImageUrl ?? null,
  };
}
