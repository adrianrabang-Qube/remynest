# Feature: Media System

## Current implementation
Photo/video upload attached to memories, stored in Supabase Storage.

## Architecture
- Bucket **`memory-media`** (PUBLIC). Path: `users/{userId}/memories/{ts}-{name}`.
- Pipeline: `lib/memory-media.ts` (upload + public URL), `memory-media-upload.ts`,
  `memory-media-pipeline.ts`, `memory-upload-client.ts`.
- Memories reference media via `cover_image_url` and `attachments` (jsonb array of
  `{url, name/filename, mimeType}`).

## Database dependencies
`memories.cover_image_url`, `memories.attachments`. No separate media table.

## API routes
Upload handled in memory create flow / client pipeline _(verify exact route vs
client-direct upload)_; deletion via GDPR prefix cleanup.

## UI components
`app/(app)/memories/new/page.tsx` (upload UI), `MemoryCard`, `TimelineCard`
(render media).

## Limitations
- **Public bucket** → media URLs are publicly resolvable by anyone with the URL
  (privacy consideration; pre-existing).
- File-type/size validation in `lib/memory-media.ts` _(verify limits)_.

## Future enhancements
Private bucket + signed URLs; image/video transcoding; thumbnails; virus scanning.
