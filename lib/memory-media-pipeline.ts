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

      console.log(
  "[memory-media-pipeline]",
  {
    uploadedFilesType:
      typeof body.uploadedFiles,

    isArray:
      Array.isArray(
        body.uploadedFiles
      ),

    value:
      body.uploadedFiles,
  }
);

  return handleMemoryMediaUpload(
    {
      attachments,
      uploadedFiles,
      userId,
    }
  );
}