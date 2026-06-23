import {
  handleMemoryMediaUpload,
} from "@/lib/memory-media";

export async function buildMemoryMediaPayload({
  body,
  userId,
}: {
  body: Record<
    string,
    unknown
  >;

  userId: string;
}) {
  const attachments =
    body.attachments;

  const uploadedFiles =
    Array.isArray(
      body.uploadedFiles
    )
      ? (
          body
            .uploadedFiles as File[]
        )
      : [];

  return handleMemoryMediaUpload(
    {
      attachments,
      uploadedFiles,
      userId,
    }
  );
}