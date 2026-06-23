# Feature: Media System

## Current implementation
Photo/video upload attached to memories, stored in Supabase Storage.

## Architecture
- Bucket **`memory-media`** (**PRIVATE**). Path: `users/{userId}/memories/{ts}-{name}`.
- Pipeline: `lib/memory-media.ts` (upload + `storagePath`), `memory-media-upload.ts`,
  `memory-media-pipeline.ts`, `memory-upload-client.ts`.
- Delivery: `lib/memory-media-signing.ts` mints short-lived **signed URLs** (1 h TTL)
  server-side via the service-role client (PHI never publicly resolvable). `storagePath`
  is preserved so edit round-trips never persist a transient signed URL.
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
- Originals are stored full-resolution (≤ 25 MB); thumbnails are derived on-demand
  (see below), not stored.
- File-type/size validation in `lib/memory-media.ts` (25 MB cap; image/video/audio/pdf).

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

## Thumbnail architecture (Phase 0, 2026-06-22)
Hybrid size ladder served from the single stored original (one Supabase "origin image"
regardless of how many sizes). Variants are minted in `lib/memory-media-signing.ts`:
- **THUMB** `400×400 cover q70` — feed/list (`MemoryGalleryPreview`, `CompactMemoryRow`,
  `TimelineRow`).
- **MEDIUM** `1080 contain q75` — detail page (`MemoryGallery`) + `PhotoViewer` main
  image (±1 windowed). The viewer's full-screen experience adds prev/next buttons,
  ←/→ keys, and a **thumbnail strip** that uses the small **THUMB** variant (lazy).
- **ORIGINAL** — fallback only.

Images use **Supabase on-the-fly transforms** (imgproxy, CDN-cached) via the SINGULAR
`createSignedUrl(path, ttl, { transform })`; the BATCH `createSignedUrls` (the
untransformed baseline) is always run first as the hard fallback. `signMemories`/
`signMemory` take `{ variant, maxImagesPerMemory }` — feed routes pass `thumb` (cap 4),
the detail page passes `medium`. Each image carries a `fallbackUrl` (the untransformed
signed URL) so the client (`MediaThumb`, `PhotoViewer`, `CompactMemoryRow`) recovers
from a transform render failure (e.g. > 25 MB / > 50 MP input).

**Operator gate:** transforms require Supabase Image Transformations (Pro plan) **and**
the env flag **`MEMORY_IMAGE_TRANSFORMS_ENABLED=true`**. Default **OFF** → signing is
byte-identical to the untransformed baseline (no broken images, no regression) until the
operator enables transforms on the project and sets the flag.

**Pagination:** `app/api/memories/route.ts` + `app/api/timeline/route.ts` accept
`limit`/`offset` (`.range`, default 50) to bound the per-request singular-signing
fan-out; the memories feed client aggregates pages into its flat array (optimistic
mutations unchanged).

## Future enhancements
Video poster + PDF first-page stored derivatives (into the existing
`attachment.thumbnailUrl` field); audio waveform; image/video transcoding; virus
scanning; feed virtualization at very high memory counts.
