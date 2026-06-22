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

## Active initiative (2026-06-21): Memory Media Experience Upgrade
Multi-media memories. **The storage model already supports multiple attachments** —
`attachments` is a jsonb array of `{url, name, mimeType}` (+ `cover_image_url`) — the
current UX surfaces a single cover image, so the upgrade is primarily **UI + the
create/edit pipeline** (backward compatible; **no data-loss migration**). Phases:
(1) multiple photos per memory (create/edit add+remove; preserve single-image
memories); (2) gallery previews (Facebook-album grids); (3) detail carousel
(swipe + pagination, mobile-first); (4) full-screen viewer (tap-expand, swipe,
pinch-zoom, hi-res). **Architect for future media** (video/voice/audio/docs/PDF) via
the `mimeType` field — no further attachment redesign. Fold in the **image-decode OOM**
fix (serve resized thumbnails via `lib/memory-media-signing.ts` + paginate the
memories/timeline feeds). See `docs/roadmap/launch-roadmap.md` + HANDOFF.

## Future enhancements
Private bucket + signed URLs; image/video transcoding; thumbnails; virus scanning.
