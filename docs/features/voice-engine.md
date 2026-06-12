# Feature: Voice Engine V1 — Technical Design Document

**Status:** Approved blueprint → TDD. **NOT implemented.** Design only.
**Last updated:** 2026-06-12 · **Target branch:** `main` (auto-deploys → ship dark behind flag)
**Owner workflow:** CLAUDE.md (EXECUTION per phase). **Roadmap:** P3 "Voice memories + transcription" (pulls P2 "private bucket + signed URLs" forward).

> Governing principle: **a voice memory IS a memory.** A transcript lands in
> `memories.content`; audio rides in `memories.attachments[]`. Enrichment,
> embeddings, search, RAG, timeline, insights, and GDPR already operate on that
> shape — so V1 is "insert transcription between capture and the existing
> create-memory pipeline," plus one private bucket and a recorder.

---

## 0. Scope, assumptions & baked-in decisions

**In scope (V1):** record → private store → transcribe → create voice memory
(reusing enrichment + embedding) → playback → search/RAG (automatic). 

**Out of scope (V1, deferred):** async/queued long-form (>5 min), waveform,
multi-speaker diarization, editing audio, migrating images to private bucket.

**Baked-in decisions** (from approved blueprint — *confirm before Phase 0*):

| # | Decision | V1 default |
|---|---|---|
| D1 | Access tier | **Premium-gated** + small free trial (3 voice memories) |
| D2 | Max recording length | **5 minutes** (hard client cap + server clamp) |
| D3 | Audio retention | **Keep audio + transcript**; deletion removes both |
| D4 | Bucket strategy | **New voice-only private bucket** (images stay as-is) |
| D5 | Voice marker | **Add `memories.source` column** (not jsonb inference) |

**Operational constraints (from HANDOFF):** dev points at **prod Supabase (no
staging)** → all DB/storage changes must be **additive, idempotent,
production-safe**. `main` auto-deploys → all code ships behind a **feature flag**.
Schema is **dashboard-managed** → migrations are **operator steps** (exact SQL
below; also commit the file under `supabase/migrations/` for traceability).

### 0.1 Module / file inventory (new + touched), by phase

| Phase | New files | Touched files |
|---|---|---|
| 0 Infra | `supabase/migrations/<ts>_voice_engine_v1.sql` | — (operator runs SQL in dashboard) |
| 1 Capture | `lib/voice/config.ts`, `lib/voice/client-recorder.ts`, `components/voice/VoiceRecorder.tsx`, `app/api/voice/upload-url/route.ts` | `app/(app)/memories/new/page.tsx` |
| 2 Transcribe | `lib/voice/transcribe.ts`, `app/api/voice/transcribe/route.ts` | `app/api/memories/create/route.ts` (extend), `lib/memory-media.ts` (audio attachment helper) |
| 3 Playback/UX | `app/api/voice/[id]/audio-url/route.ts`, `components/voice/VoiceMemoryPlayer.tsx` | `components/.../MemoryCard`, `TimelineCard` |
| 4 Search/quota | `lib/voice/quota.ts` (+ optional `voice_usage` ledger) | `app/api/voice/transcribe/route.ts` |
| 5 GDPR/hardening | `lib/voice/rate-limit.ts` | `lib/gdpr/execute-user-deletion.ts`, `app/api/gdpr/export/route.ts` |

### 0.2 Configuration constants (`lib/voice/config.ts`)

```ts
export const VOICE_BUCKET = "voice-recordings";
export const MAX_RECORDING_MS = 5 * 60 * 1000;        // 300_000 — D2
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;      // 26_214_400 (= Whisper cap = existing attachment cap)
export const AUDIO_MIME_ALLOWLIST = [
  "audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/ogg",
] as const;
export const SIGNED_UPLOAD_TTL_S = 120;
export const SIGNED_PLAYBACK_TTL_S = 300;
export const TRANSCRIBE_MODEL_PRIMARY = "gpt-4o-mini-transcribe";
export const TRANSCRIBE_MODEL_FALLBACK = "whisper-1";
export const TRANSCRIBE_TIMEOUT_MS = 60_000;
export const TRANSCRIBE_MAX_RETRIES = 2;              // app-level backoff (SDK maxRetries=0)
// Quota / tier (D1)
export const FREE_TRIAL_VOICE_MEMORIES = 3;
export const PREMIUM_MONTHLY_MINUTES_SOFT_CAP = 300;  // monitored, not hard-blocked in V1
export const VOICE_RATE_LIMIT_PER_MIN = 5;
export const VOICE_RATE_LIMIT_PER_DAY = 100;
// Kill switches
export const VOICE_ENABLED = process.env.VOICE_ENABLED === "true";              // server routes
// NEXT_PUBLIC_VOICE_ENABLED gates the UI (client)
export const STORAGE_PATH_RE =
  /^users\/[0-9a-f-]{36}\/voice\/[0-9a-f-]{36}\/\d+\.(webm|m4a|mp3|wav|ogg)$/;
```

---

## 1. Exact database migration(s)

> Run in the Supabase SQL editor (operator step, **needs approval**). Idempotent
> and additive — safe on the live prod DB. Save as
> `supabase/migrations/<timestamp>_voice_engine_v1.sql`.

```sql
-- ============================================================================
-- Voice Engine V1 — schema additions (additive, idempotent, production-safe)
-- ============================================================================

-- 1.1 Mark a memory's origin (text|voice|import) so voice memories can be
--     filtered/badged without scanning the attachments jsonb. Default keeps
--     every existing row valid (= 'text'); RLS inherited from `memories`.
alter table public.memories
  add column if not exists source text not null default 'text';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'memories_source_check') then
    alter table public.memories
      add constraint memories_source_check check (source in ('text','voice','import'));
  end if;
end $$;

-- 1.2 ANN index for embedding search at scale. INSPECT FIRST — do not duplicate:
--       select indexname, indexdef from pg_indexes where tablename='memories';
--     Only create if no vector index already exists. hnsw needs pgvector >= 0.5;
--     else use ivfflat (lists ~ rows/1000).
create index if not exists memories_embedding_hnsw_idx
  on public.memories using hnsw (embedding vector_cosine_ops);

-- 1.3 (OPTIONAL, Phase 4) per-period voice usage ledger for premium minute
--     accounting. Skip in V1 if count-based trial + soft cap is sufficient.
create table if not exists public.voice_usage (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null,
  memory_id    uuid,
  duration_ms  integer not null default 0,
  model        text,
  created_at   timestamptz not null default now()
);
alter table public.voice_usage enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='voice_usage' and policyname='voice_usage_owner_select') then
    create policy "voice_usage_owner_select" on public.voice_usage
      for select to authenticated using (user_id = (select auth.uid()));
  end if;
end $$;
-- Writes are service-role only (no insert/update/delete policy → RLS denies anon/auth).
```

**No new tables required for the core V1 path** (1.3 is optional). Transcript reuses
`memories.content`; vector reuses `memories.embedding`; audio metadata rides in the
attachment jsonb.

---

## 2. Exact storage bucket configuration

```sql
-- Private bucket for voice audio. public=false → only signed URLs or service-role.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voice-recordings', 'voice-recordings', false, 26214400,
  array['audio/webm','audio/mp4','audio/mpeg','audio/wav','audio/ogg']
)
on conflict (id) do update set
  public            = excluded.public,
  file_size_limit   = excluded.file_size_limit,
  allowed_mime_types= excluded.allowed_mime_types;
```

- **Path convention:** `users/{userId}/voice/{draftId}/{epochMs}.{ext}`
  (`draftId` = client-generated UUID; `userId` is **server-injected** from the
  session — never trusted from the client).
- **Access:** private; uploads via one-time **signed upload URL**, playback via
  short-TTL **signed download URL**. No public read, ever.
- **Mirrors** the existing `users/{userId}/…` prefix convention so GDPR
  prefix-cleanup generalises.

---

## 3. Exact RLS policies

`storage.objects` has RLS enabled by Supabase. Policies are defense-in-depth (the
server also constructs paths from the authenticated uid). Idempotent via drop-then-create.

```sql
-- INSERT (upload) — only into the caller's own users/{uid}/voice/ prefix
drop policy if exists "voice_owner_insert" on storage.objects;
create policy "voice_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'voice-recordings'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = (select auth.uid()::text)
  );

-- SELECT (read / signed-url issuance for the owner client)
drop policy if exists "voice_owner_select" on storage.objects;
create policy "voice_owner_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'voice-recordings'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = (select auth.uid()::text)
  );

-- UPDATE (overwrite, e.g. re-record)
drop policy if exists "voice_owner_update" on storage.objects;
create policy "voice_owner_update" on storage.objects
  for update to authenticated
  using      (bucket_id='voice-recordings' and (storage.foldername(name))[2]=(select auth.uid()::text))
  with check (bucket_id='voice-recordings' and (storage.foldername(name))[2]=(select auth.uid()::text));

-- DELETE (owner-initiated cleanup)
drop policy if exists "voice_owner_delete" on storage.objects;
create policy "voice_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id='voice-recordings' and (storage.foldername(name))[2]=(select auth.uid()::text));
```

> **Service-role bypasses RLS** (CLAUDE.md). Server routes that use `supabaseAdmin`
> (transcribe download, playback signed URL, GDPR delete) **must manually verify**
> `STORAGE_PATH_RE.test(path)` **and** `path` segment[1] === session `user.id`
> before any storage op. `memories`/`voice_usage` RLS is unchanged — voice
> memories inherit existing `memories` policies.

---

## 4. Exact API contracts

Conventions (existing): all under `/api` are session-protected by middleware;
`export const dynamic = "force-dynamic"`; errors return generic `{ error: string }`
+ status; service-role only where noted; **expected business failures return a
structured payload, never `throw`**. Every voice route first checks
`if (!VOICE_ENABLED) return 404`.

Shared error envelope: `{ error: string, code?: VoiceErrorCode }` (codes in §7).

### 4.1 `POST /api/voice/upload-url` — issue signed upload URL
- **Auth:** session. **Gate:** `VOICE_ENABLED`; tier/quota pre-check (§9).
- **Request:** `{ draftId: string /*uuid*/, ext: "webm"|"m4a"|"mp3"|"wav"|"ogg", mimeType: string, sizeBytes: number }`
- **Server:** validate `mimeType ∈ AUDIO_MIME_ALLOWLIST`, `sizeBytes ≤ MAX_AUDIO_BYTES`, `draftId` is uuid. Build `path = users/${user.id}/voice/${draftId}/${Date.now()}.${ext}`. `supabaseAdmin.storage.from(VOICE_BUCKET).createSignedUploadUrl(path)`.
- **Response 200:** `{ path: string, token: string, signedUrl: string, expiresInS: 120 }`
- **Errors:** 400 invalid mime/size/draftId · 401 no session · 402 over quota/free-tier · 429 rate-limited · 500.
- Client then `supabase.storage.from(VOICE_BUCKET).uploadToSignedUrl(path, token, blob)`.

### 4.2 `POST /api/voice/transcribe` — transcribe stored audio (does NOT persist)
- **Auth:** session. **Gate:** `VOICE_ENABLED`; tier/quota (§9); rate-limit (§8).
- **Request:** `{ storagePath: string, durationMs: number, mimeType: string }`
- **Server:** (1) `STORAGE_PATH_RE.test(storagePath)` **and** segment[1]===`user.id` → else 403. (2) `supabaseAdmin.storage.from(VOICE_BUCKET).download(storagePath)` → blob; re-check `size ≤ MAX_AUDIO_BYTES`, sniff magic bytes vs `mimeType`. (3) transcribe (§6). (4) clamp `durationMs` to `[0, MAX_RECORDING_MS]`.
- **Response 200:** `{ transcript: string, charCount: number, durationMs: number, language?: string, model: string }`
- **Errors:** 400 bad path/empty audio · 401 · 402 quota · 403 not owner · 404 object missing · 413 too large · 429 · 502 transcription upstream failed · 500. Empty transcript → 200 with `transcript:""` + `code:"empty_transcript"` (client lets user retry/keep).

### 4.3 `POST /api/memories/create` — **extend** existing route (no fork)
- **Added optional fields:** `source?: "text"|"voice"` (default `"text"`), `audioStoragePath?: string`, `transcript?: string`, `voiceMeta?: { durationMs: number; language?: string; model: string; mimeType: string }`.
- **When `source==="voice"`:** require+validate `audioStoragePath` ownership (as 4.2 step 1) and `transcript`. Set `content = transcript` (or user-edited text). Append attachment `{ type:"audio", storagePath, mimeType, size, metadata:{ durationMs, language, model }, uploadedAt }`. Set `source="voice"`. **Then run the existing pipeline unchanged**: `lib/ai-memory.ts` enrich (`ai_*`) + `lib/embeddings.ts` (`embedding`). Optionally insert `voice_usage` row (service-role).
- **Response 200:** created memory (existing shape) incl. `source` + audio attachment.
- **Degradation:** enrichment/embedding failure must **not** fail the save (§7).

### 4.4 `GET /api/voice/[id]/audio-url` — signed playback URL
- **Auth:** session. **Gate:** `VOICE_ENABLED`.
- **Server:** load memory by `id` scoped to `user_id = session` (RLS); find audio attachment; verify `storagePath` ownership; `supabaseAdmin.storage.from(VOICE_BUCKET).createSignedUrl(path, SIGNED_PLAYBACK_TTL_S)`.
- **Response 200:** `{ url: string, expiresInS: 300 }` · **Errors:** 401 · 403 · 404 (no memory / no audio) · 500.

### 4.5 Reused unchanged
`/api/search`, `/api/memories/search` (transcript embedded → auto-searchable),
`/api/memory-chat` (transcript in RAG context), `/api/timeline`. **No edits.**

---

## 5. Exact UI/UX flow

**Mount point:** `app/(app)/memories/new/page.tsx` gains a "Record voice" affordance
(rendered only when `NEXT_PUBLIC_VOICE_ENABLED==="true"`). Component:
`components/voice/VoiceRecorder.tsx` (client).

### 5.1 Recorder state machine

```
idle ──Record──▶ requesting_permission ──granted──▶ recording ──Stop/auto@5min──▶ preview
  ▲                      │ denied                       │                            │
  │                      ▼                               │                       ┌────┴───────┐
  └──────────────── error(permission) ◀──────────────────┘                  Re-record   Use this
                                                                                 │            │
                                                                                 ▼            ▼
                                                                               idle      uploading
                                                                                              │ ok
                                                                                              ▼
                                                                                        transcribing
                                                                                          │ ok    │ fail
                                                                                          ▼        ▼
                                                                                       review   error(retry/keep-audio)
                                                                                          │ Save
                                                                                          ▼
                                                                                        saving ──ok──▶ done(redirect to memory)
```

- **Capture:** `MediaRecorder` with mimeType preference
  `["audio/webm;codecs=opus","audio/mp4","audio/webm"]` (first `isTypeSupported`);
  `start(1000)` (1 s timeslice); UI timer; **auto-stop at `MAX_RECORDING_MS`**;
  compute `durationMs` from start/stop timestamps. Show level meter (optional).
- **Consent:** before first record, inline notice + checkbox:
  *"Your recording is transcribed by OpenAI and stored privately to create your
  memory. You can delete it anytime."* (links to privacy policy). Gate Record on consent.
- **Preview:** local `<audio>` from the Blob (object URL); Re-record / Use this.
- **Upload:** `POST /api/voice/upload-url` → `uploadToSignedUrl`. Progress UI.
- **Transcribe:** `POST /api/voice/transcribe`. Spinner + cancel.
- **Review:** editable transcript textarea (user may correct), profile/workspace
  selector (existing), Save. Empty transcript → allow keep-audio-only or retry.
- **Save:** `POST /api/memories/create {source:"voice", …}` → redirect to the memory.
- **Accessibility:** keyboard-operable controls, `aria-live` timer/status,
  visible focus, captions of state; honour `prefers-reduced-motion`.
- **Mobile:** iOS Safari requires a user gesture to start capture and may produce
  `audio/mp4`; the mimeType fallback handles it. Release the mic track on stop/unmount.

### 5.2 Playback (`components/voice/VoiceMemoryPlayer.tsx`)
On render in MemoryCard/TimelineCard for `source==="voice"`: lazily call
`GET /api/voice/[id]/audio-url`, set `<audio src=signedUrl>`; refetch on expiry.
Show transcript text + AI summary/tags (existing render).

---

## 6. Exact OpenAI API usage

Single existing client (`lib/openai.ts`). New `lib/voice/transcribe.ts`:

```ts
import { toFile } from "openai";
import { openai } from "@/lib/openai";
import {
  TRANSCRIBE_MODEL_PRIMARY, TRANSCRIBE_MODEL_FALLBACK,
  TRANSCRIBE_TIMEOUT_MS, TRANSCRIBE_MAX_RETRIES,
} from "./config";

type TranscribeOk = { ok: true; transcript: string; language?: string; durationMs?: number; model: string };
type TranscribeErr = { ok: false; code: "rate_limit"|"timeout"|"upstream"|"empty"; message: string };

export async function transcribeAudio(
  bytes: Buffer, filename: string, mimeType: string,
): Promise<TranscribeOk | TranscribeErr> {
  const file = await toFile(bytes, filename, { type: mimeType });

  // Primary: gpt-4o-mini-transcribe (cheapest). response_format "json" → { text }.
  // Fallback: whisper-1 with verbose_json → text + language + duration (segments).
  for (let attempt = 0; attempt <= TRANSCRIBE_MAX_RETRIES; attempt++) {
    try {
      const res = await openai.audio.transcriptions.create(
        { file, model: TRANSCRIBE_MODEL_PRIMARY, response_format: "json" },
        { timeout: TRANSCRIBE_TIMEOUT_MS, maxRetries: 0 },
      );
      const text = (res.text ?? "").trim();
      if (!text) return { ok: false, code: "empty", message: "No speech detected" };
      return { ok: true, transcript: text, model: TRANSCRIBE_MODEL_PRIMARY };
    } catch (e: any) {
      const status = e?.status ?? e?.response?.status;
      if (status === 429 || status >= 500) {                 // backoff & retry
        if (attempt < TRANSCRIBE_MAX_RETRIES) { await sleep(400 * 2 ** attempt); continue; }
      }
      // Final attempt → try fallback model once (verbose_json for duration/lang)
      try {
        const res = await openai.audio.transcriptions.create(
          { file, model: TRANSCRIBE_MODEL_FALLBACK, response_format: "verbose_json" },
          { timeout: TRANSCRIBE_TIMEOUT_MS, maxRetries: 0 },
        );
        const text = (res.text ?? "").trim();
        if (!text) return { ok: false, code: "empty", message: "No speech detected" };
        return { ok: true, transcript: text, language: (res as any).language,
                 durationMs: (res as any).duration ? Math.round((res as any).duration * 1000) : undefined,
                 model: TRANSCRIBE_MODEL_FALLBACK };
      } catch (e2: any) {
        const s2 = e2?.status ?? e2?.response?.status;
        return { ok: false,
          code: s2 === 429 ? "rate_limit" : s2 === 408 ? "timeout" : "upstream",
          message: "Transcription failed" };
      }
    }
  }
  return { ok: false, code: "upstream", message: "Transcription failed" };
}
```

- **Constraints:** 25 MB / file (enforced before call); ≤ 5 min audio (D2).
- **Enrichment + embedding:** **no new OpenAI code** — the create route calls the
  existing `lib/ai-memory.ts` (`gpt-4.1-mini`) and `lib/embeddings.ts`
  (`text-embedding-3-small`, 1536-d) with `content = transcript`.
- **Duration source:** primary model returns no duration → use client `durationMs`
  (clamped). When exact accounting matters, the whisper fallback's `verbose_json`
  duration is authoritative.
- **Data/training:** OpenAI API inputs are not used for training by default;
  confirm DPA (see §10).

---

## 7. Error handling strategy

Principle: **a voice memory must save even if AI enrichment/embedding fails**
(graceful degradation — matches the platform's non-throwing posture).

| Stage | Failure | HTTP | User message | Recovery | Log |
|---|---|---|---|---|---|
| Capture | mic permission denied | — | "Microphone access is blocked. Enable it in browser settings." | link to help; stay in `idle` | client only |
| Capture | no MediaRecorder / mime unsupported | — | "Recording isn't supported on this browser." | offer text memory | client |
| Upload-url | bad mime/size | 400 | "That audio type/size isn't supported." | re-record | server (no content) |
| Upload | signed PUT fails / network | — | "Upload failed — check your connection." | retry (same `draftId`) | client + server |
| Transcribe | not owner / bad path | 403 | generic "Something went wrong." | abort | server (path, uid) |
| Transcribe | object missing | 404 | "Recording not found." | re-record | server |
| Transcribe | too large | 413 | "Recording is too long/large (max 5 min)." | trim/re-record | server |
| Transcribe | 429 / 5xx upstream | 502 | "Transcription is busy — try again." | retry w/ backoff (≤2) then fallback model | server |
| Transcribe | empty transcript | 200 `code:empty_transcript` | "We couldn't hear speech." | keep audio-only or retry | server (no audio) |
| Create | enrichment fails | 200 (saved) | silent | save w/ null `ai_*`; flag for backfill | server (warn) |
| Create | embedding fails | 200 (saved) | silent | save w/ null `embedding`; backfill job re-embeds | server (warn) |
| Create | DB insert fails | 500 | "Couldn't save your memory." | retry; audio already in bucket (idempotent by `draftId`) | server |

- **Idempotency:** `storagePath` (and `draftId`) are stable keys — re-submitting the
  same path does not double-transcribe-charge if the create succeeded (guard on
  existing memory with that `audioStoragePath`).
- **Backfill:** memories with `source='voice'` and null `embedding`/`ai_*` are
  picked up by an existing/Phase-5 backfill pass (re-run enrich+embed).
- **No transcript/PII in error responses or logs** (see §11).

---

## 8. Cost control strategy

Transcription is the only material cost (≈ $0.003–0.006/min). Controls, in order:
1. **Premium gate** at `/api/voice/transcribe` and `/api/voice/upload-url` (D1) —
   the cost driver never runs for ineligible users.
2. **Free trial cap:** `count(memories where source='voice' and user_id=…) < FREE_TRIAL_VOICE_MEMORIES` → else 402.
3. **Hard length cap:** 5 min client auto-stop + server clamp + 25 MB reject (413).
4. **Rate limits:** `VOICE_RATE_LIMIT_PER_MIN` / `_PER_DAY` per user (`lib/voice/rate-limit.ts`; in-memory + DB/Upstash later) → 429.
5. **Idempotency:** never re-transcribe an already-saved `storagePath`.
6. **Cheapest model default** (`gpt-4o-mini-transcribe`); fallback only on failure.
7. **Monitoring:** log `{ userId, durationMs, model }` (no content); optional
   `voice_usage` ledger → dashboard alert if monthly minutes exceed
   `PREMIUM_MONTHLY_MINUTES_SOFT_CAP`.

**Budget math (verify live pricing):** ~$0.004–0.008 per 1-min memory →
1k/mo ≈ $4–8, 10k/mo ≈ $40–80. Storage negligible (~0.5–1 MB/min @ ~$0.021/GB-mo).

---

## 9. Premium / free quota strategy

**Tiering (D1):** voice is a **premium** feature with a **3-memory free trial**.

```ts
// lib/voice/quota.ts (server)
export async function checkVoiceQuota(userId, isPremium): Promise<
  { ok: true } | { ok: false; status: 402; reason: "trial_exhausted"|"free_blocked" }> {
  if (isPremium) {
    // V1: soft cap only (monitored). Hard monthly cap can be added via voice_usage.
    return { ok: true };
  }
  const used = await countVoiceMemories(userId);            // memories where source='voice'
  return used < FREE_TRIAL_VOICE_MEMORIES
    ? { ok: true }
    : { ok: false, status: 402, reason: "trial_exhausted" };
}
```

- **Enforcement points:** `/api/voice/upload-url` (early, before storing) **and**
  `/api/voice/transcribe` (authoritative, before spend). Reuse `lib/premium.ts`
  `isPremium` (same source as search's 402 gating).
- **402 payload:** `{ error, code:"premium_required"|"trial_exhausted", upgradeUrl }`
  → client shows upsell (consistent with semantic-search 402 UX).
- **Premium accounting:** V1 = unlimited-with-soft-cap + monitoring. If a hard cap is
  required, sum `voice_usage.duration_ms` in the current billing period (period from
  `profiles.current_period_end`) and block at the cap.

---

## 10. GDPR deletion / export flow

**Classification:** voice audio + transcript = personal data; in a care context a
transcript may reveal **Art. 9 (health)** data → explicit consent at capture (§5.1),
non-clinical AI posture retained.

### 10.1 Deletion (`lib/gdpr/execute-user-deletion.ts`)
- **Add `voice-recordings`** to the storage prefix-cleanup list (delete
  `users/{userId}/` in that bucket) — same retain-aware pattern as `memory-media`.
  Order unchanged: **storage → memories → … → auth (last)**. Transcripts are deleted
  with their `memories` rows; `voice_usage` rows deleted by `user_id` (add to step
  list). Verify nothing orphaned (list-then-delete; report `removedFiles`).

### 10.2 Export (`/api/gdpr/export`)
- Transcript already exported (it is `memories.content`). **Add an audio manifest:**
  per voice memory, include `{ memoryId, storagePath, durationMs, model, mimeType }`
  and a **short-TTL signed URL** (or a note that raw audio is available on request) —
  do not embed multi-MB blobs in the JSON.

### 10.3 Disclosures (compliance docs to update at implementation)
- `compliance/01-privacy-policy.md` + `08-ai-compliance-package.md`: add **OpenAI**
  as transcription sub-processor; state audio retention + erasure.
- `compliance/07-app-permissions-inventory.md`: add **microphone**; Apple labels
  (05) + Play data-safety (06); iOS `NSMicrophoneUsageDescription`.
- EU AI Act transparency: disclose AI transcription + enrichment.

---

## 11. Security review (threat model)

| Threat | Vector | Mitigation |
|---|---|---|
| Unauthorized audio access | guess/enumerate storage paths | **private bucket**, RLS (§3), short-TTL signed URLs only, server path-prefix check |
| Service-role over-reach | admin client bypasses RLS | every admin storage op gated by `STORAGE_PATH_RE` **and** `segment[1]===user.id` |
| Path traversal / spoofed uid | client supplies `storagePath`/uid | server **builds** path from session uid; transcribe/playback re-validate against `STORAGE_PATH_RE` + uid; reject mismatch (403) |
| Cost abuse | spam transcription | premium gate + free cap + rate-limit + length/size caps + idempotency (§8) |
| Payload DoS | huge upload through function | **signed direct upload** (client→storage), 25 MB bucket limit, `maxDuration` on routes |
| Mimetype spoofing | rename non-audio | server allowlist + **magic-byte sniff** before transcribe |
| Prompt injection via transcript | malicious speech → enrichment/RAG | treat transcript as untrusted (same as any memory content); non-diagnostic system prompts unchanged |
| Signed-URL leakage | URL shared/logged | TTL ≤ 300 s; **never log URLs**; regenerate per request |
| PII in logs | transcript/content logged | log only `{userId, durationMs, model, code}`; redact text; generic error responses |
| Replay / double-charge | resubmit transcribe | idempotency guard on saved `audioStoragePath` |

**Auth:** all `/api/voice/*` are session-protected by middleware; transcription &
playback additionally re-verify ownership. **Kill switch:** `VOICE_ENABLED=false`
makes every route return 404 (defense-in-depth with the UI flag).

---

## 12. Rollback plan

**Design enables instant, non-destructive rollback at every phase** (mandated by
prod-Supabase + auto-deploy reality).

- **Kill switches (no deploy needed):**
  - UI: set `NEXT_PUBLIC_VOICE_ENABLED=false` → recorder hidden.
  - Server: set `VOICE_ENABLED=false` → all voice routes 404; existing voice
    memories still render as normal memories (transcript text), audio simply not
    fetched.
- **DB:** the `source` column is **additive with default `'text'`** → no rollback
  required; nothing reads it destructively. `voice_usage` is isolated (drop if
  truly reverting: `drop table if exists public.voice_usage;`). The embedding index
  is harmless to keep.
- **Storage:** the private bucket can stay (empty) with zero impact; only remove
  manually if abandoning the feature. Already-uploaded audio remains owner-only.
- **Code:** each phase ships behind the flag → revert by flag, then remove files in
  the inverse of §0.1 if abandoning.

**Per-phase rollback:**

| Phase | Revert action | Data left behind | Safe? |
|---|---|---|---|
| 0 Infra | leave column/bucket (inert) or drop `voice_usage` | `source='text'` default | ✅ no impact |
| 1 Capture | `NEXT_PUBLIC_VOICE_ENABLED=false` | orphan draft audio (TTL-cleanable) | ✅ |
| 2 Transcribe | `VOICE_ENABLED=false` | any saved voice memories remain valid memories | ✅ |
| 3 Playback | hide player component | audio retained, just not played | ✅ |
| 4 Quota | disable gate / revert constants | usage rows inert | ✅ |
| 5 GDPR/hardening | keep (it only *adds* cleanup coverage) | — | ✅ |

**Failure during Phase-0 migration:** all statements are idempotent → safe re-run;
additive only → no data migration to undo.

---

## 13. Phase execution checklist & acceptance criteria

> Each phase is a separate EXECUTION task (investigate → implement → lint → build →
> validate → update docs → commit). Ship behind flags; flags flip on only after the
> phase's acceptance criteria pass.

- **Phase 0 — Infra (operator):** run §1 + §2 + §3 SQL on prod (approved); commit the
  migration file + this doc. **Accept:** bucket exists private; `source` column
  present (default 'text'); storage policies present; existing app unaffected
  (build/lint green; no behavior change).
- **Phase 1 — Capture & storage:** recorder + `/api/voice/upload-url` + direct upload,
  behind `NEXT_PUBLIC_VOICE_ENABLED`. **Accept:** record ≤5 min → audio object at
  `users/{uid}/voice/...`; non-owner cannot read; oversize/wrong-mime rejected.
- **Phase 2 — Transcribe → memory:** `/api/voice/transcribe` + extended
  `/api/memories/create`. **Accept:** voice memory persists with transcript in
  `content`, `source='voice'`, audio attachment; `ai_*` + `embedding` populated;
  enrichment/embedding failure still saves (degradation verified).
- **Phase 3 — Playback & UX:** `/api/voice/[id]/audio-url` + player + transcript
  edit. **Accept:** owner plays via signed URL (expires); non-owner 403.
- **Phase 4 — Search/RAG + quota:** confirm voice memories surface in `/api/search`
  + `/api/memory-chat`; premium gate + free trial + rate-limit live. **Accept:**
  transcript hits in search; free user blocked after 3 with 402 upsell; rate-limit
  returns 429.
- **Phase 5 — GDPR & hardening:** wire `voice-recordings` into deletion + export
  manifest; finalize logging redaction; ownership-isolation tests. **Accept:**
  delete-account removes all voice audio (`removedFiles` includes voice prefix) +
  memories; export includes transcript + audio manifest; no PII in logs.
- **Phase 6 — Future:** async long-form, waveform, multi-language.

**Definition of Done (per CLAUDE.md), each phase:** update `HANDOFF_CURRENT.md`;
update this doc's status; flip roadmap P3 voice → "in progress/done" as applicable;
update compliance disclosures (§10.3) at the phase that ships capture.

---

## Open decisions to confirm before Phase 0
D1 tier (premium + 3 free) · D2 length (5 min) · D3 retention (keep audio) ·
D4 voice-only private bucket · D5 `source` column. Defaults above are assumed
approved with the blueprint; flag any change before the Phase-0 SQL runs.
