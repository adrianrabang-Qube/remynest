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

## Mixed media — video (Phase B, 2026-06-23)
Memories support **mixed photo + video** in one `attachments` array (no separate
video system — videos reuse the attachment model). The architecture was already
media-generic; Phase B unlocked video through the display surfaces:
- **Upload:** `AttachmentManager` accepts `image/*` + `video/*` (type-aware previews;
  no `<video>` mounted in the picker). The pipeline already allowlists `video/*`,
  derives `type:"video"`, and enforces the **25 MB cap on video too** (larger videos
  are rejected — a video-specific cap is a future decision).
- **Indicator:** `MediaThumb` renders video as a **play-icon tile**, so the feed
  card (`MemoryGalleryPreview`) shows mixed media automatically.
- **Viewer:** `PhotoViewer` (`ViewerImage.type`) renders `<video controls
  playsInline preload="none">` for video slides — **preload="none" + the ±1
  windowing = no off-screen video decode** (WKWebView-safe). The thumbnail strip
  shows a play tile for video; prev/next + keyboard + swipe work across mixed media.
- **Detail page** routes **image + video → the gallery/viewer**; audio/file stay
  inline. Videos are **not** Supabase-transformed (thumb/medium are image-only); a
  video's signed URL is the plain object URL.
- **Storage:** video counts toward quota unchanged (byte-based `totalUploadBytes` +
  the ledger trigger's `media_type` projection) — the usage card + storage-full 413
  modal work for video with no special-casing.
- **Decision:** components were **evolved in place, not renamed** (`MediaThumb` is the
  media seam). **Future audio/documents** plug into the same seams (allowlist +
  `MediaThumb` dispatch + byte accounting already accommodate them).

## Direct-to-Storage uploads (authoritative, 2026-06-24)
Media uploads go **client → Supabase Storage directly** (signed URLs); the API routes
receive **JSON attachment metadata, never raw bytes** — bypassing the ~4.5 MB Vercel
function-body limit so large videos/mixed-media succeed.

**Flow:** client → `POST /api/memories/upload-url` (auth + server-authoritative quota
pre-check + **server-generated owner-scoped paths** `users/{userId}/...` +
`createSignedUploadUrl`) → `uploadToSignedUrl` straight to Supabase (`lib/memory-direct-
upload.ts`) → submit JSON to `/api/memories/create` (`attachments`) or PUT
`/api/memories/[id]` (`attachments` kept + `newAttachments`).

**Server-authoritative guarantees (`lib/storage/object-info.ts`):**
- **Paths** are server-generated — the client never chooses one (no spoofing / cross-user).
- **Quota** is re-verified at create/edit against the **real object size** read from Storage
  (`getStorageObjectInfo`), never the client-reported size; over-quota → 413 + orphan cleanup;
  the persisted `attachments[].size` is the real size, so the `storage_ledger` trigger counts
  reality.
- **Owner-scope** (`isOwnedStoragePath`) is enforced on **every** attachment path on create
  AND edit (including the *kept* set on PUT) — a foreign `users/{victim}/` path would let the
  RLS-bypassing signer mint a signed URL for a victim's private object; a final guard rejects it.

The **legacy multipart** branch in both routes is **dormant fallback (rollback only)**.

**Hardening (validated 2026-06-24):** `normalizeStoragePath` is a positive `[A-Za-z0-9._-]`
segment allowlist (rejects `..`, backslash, empty, and `%2e%2e`/percent-encoded traversal);
`isAllowedAttachmentMime` (shared by the sign endpoint + the direct create/edit paths)
excludes `image/svg+xml` (incl. `;charset=` params); an unverifiable real size **fails
closed** (drops the attachment — never trusts the client size).

**Follow-ups (not launch-blocking):** (1) concurrent-create **TOCTOU** quota race + (2)
reused-path cross-memory **double-count** — pre-existing; fix with a DB advisory-lock /
`SECURITY DEFINER` RPC + per-object accounting. (3) an **orphan-sweep cron**
(uploaded-but-never-attached objects aren't ledger-counted) + a Supabase bucket object-size
limit. (4) **real content-type spoofing** (client can upload svg/html bytes under a faked
declared type) — LOW (cross-origin private storage; `<img>` svg inert) → force
`Content-Disposition: attachment` for non-rendered types or proxy media serving.

## Future enhancements
Video **poster** (first-frame) + PDF first-page stored derivatives (into the existing
`attachment.thumbnailUrl` field); audio upload + waveform/player; a video-specific
size cap; image/video transcoding; virus scanning; feed virtualization.
