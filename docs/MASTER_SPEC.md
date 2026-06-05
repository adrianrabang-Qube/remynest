# RemyNest — Master Specification (Single Source of Truth)

> Generated from the actual codebase. Where a fact is inferred rather than
> code-confirmed, it is marked _(verify)_. Keep this file current; it is the
> primary context document for future sessions.

**Stack:** Next.js 14.2.5 (App Router, TypeScript) · Supabase (Postgres + Auth +
Storage, RLS) · Stripe · OpenAI · OneSignal · Sentry · Tailwind · Capacitor
(mobile wrapper). **Hosting:** Vercel (push to `main` auto-deploys prod;
`www.remynest.com`).

---

## 1. Product Overview
RemyNest is an AI-powered **memory-preservation platform** for individuals,
families, and caregivers. Users capture memories (notes, photos, videos) into
**memory profiles** (a person's memory record), organise them with AI, search
them semantically, receive reminders, and share access with caregivers.

## 2. Mission
Help people — including those affected by memory loss — preserve, organise, and
share life's memories in a private, supportive space. **Non-clinical:** RemyNest
is explicitly **not** a medical/diagnostic device; all cognitive/insight features
carry non-diagnostic disclaimers.

## 3. Core User Types
- **Individuals** preserving their own memories.
- **Families** sharing memories.
- **Caregivers** with delegated access to another person's memory profile.
- **Care recipients** (memory profiles) — the subject of a memory record.

## 4. Caregiver Model
Sharing is via `profile_relationships` linking a `caregiver_account_id` to a
`memory_profile_id`. Fields: `relationship_type` (`owner` | `caregiver`),
`access_level` (`admin` | `read`), `invite_status` (`accepted` …),
`invited_by_account_id`. Invites flow through `caregiver_invites` (keyed by
`email`). Access control is enforced by RLS + app logic
(`lib/profile-access.ts`, `lib/active-profile.ts`, `lib/context-resolver.ts`).

## 5. Memory Profile Model
`memory_profiles` represents a person whose memories are kept. Key columns:
`profile_name`, `preferred_name`, `date_of_birth`, `profile_photo`,
`created_by_account_id` (owner), `subscription_status`. A profile can be shared
with multiple caregivers. The "active profile" the user is operating within is
resolved server-side (`lib/active-profile.ts`, `/api/active-profile`).

## 6. Memory System
`memories` holds the content. Columns include `title`, `content`, `summary`,
`tags`, `cover_image_url`, `attachments` (jsonb array), `memory_profile_id`
(which profile), `user_id` (author), `workspace_type`, plus AI fields
(`ai_summary`, `ai_tags`, `ai_title`, `ai_category`, `ai_mood`, `ai_importance`,
`ai_sentiment`, `ai_emotional_weight`, `embedding` [pgvector]) and scoring
(`importance_score`, `emotional_score`, `retrieval_count`, `last_accessed_at`).
CRUD: `/api/memories` (GET list), `/api/memories/create` (POST),
`/api/memories/[id]` (PUT/DELETE); UI under `app/(app)/memories`.

## 7. Reminder System
`reminders` (FK → `memory_profiles`) drive scheduled prompts. Natural-language
parsing via `/api/parse-reminder` (OpenAI). Creation `/api/create-reminder`;
UI `app/(app)/reminders`. Delivery via the cron pipeline (see §11).

## 8. AI Features
OpenAI-backed (`lib/openai.ts`, `lib/ai-memory.ts`, `lib/embeddings.ts`):
- Memory enrichment (summary/tags/title/category/mood) on create.
- **Semantic search** via `embedding` (pgvector) — `/api/search`,
  `/api/memories/search`.
- **Memory chat** — `/api/memory-chat` (RAG over the user's memories,
  `lib/retrieve-memory-context.ts`).
- **Insights / cognitive engine** — `app/(app)/insights`, powered by
  `lib/analytics/*` and `lib/cognition/*` (frequency, streaks, emotional
  volatility, drift, continuity, risk signals). **Non-diagnostic** by design
  (`lib/constants/disclaimers.ts`). _(Depth of each engine: verify per file.)_

## 9. Media Upload System
Bucket **`memory-media`** (PUBLIC), path `users/{userId}/memories/{ts}-{file}`.
Pipeline: `lib/memory-media.ts`, `lib/memory-media-upload.ts`,
`lib/memory-media-pipeline.ts`, `lib/memory-upload-client.ts`. Media is
referenced from memories via `cover_image_url` + `attachments[].url` (public
URLs).

## 10. Search System
Semantic search over memory embeddings; premium-gated (free tier → **402**).
Routes: `/api/search`, `/api/memories/search` (POST). Page: `app/search`.

## 11. Notification System
OneSignal (web SDK + `onesignal-cordova-plugin` for native). Device tokens in
`device_registrations` (via `/api/register-device`). Reminder delivery:
`/api/cron/send-due-reminders` (Vercel Cron) → `send-reminder(s)` /
`send-notification`. Cron/public notification endpoints are **fail-closed**
behind `CRON_SECRET` (`lib/cron-auth.ts`). ⚠️ `/api/save-onesignal` and
`/api/save-subscription` write to a **non-existent `users` table** (broken — see
Known Constraints).

## 12. Subscription System
Stripe. Plans in `lib/billing/plans.ts` (PREMIUM, FAMILY); guards in
`lib/billing/subscription-guards.ts`, limits in `usage-limits.ts`, premium check
in `lib/premium.ts`. Routes: `/api/stripe/checkout` (POST), `/api/stripe/webhook`
(POST, public, signature-verified), `/api/billing/status` (GET). ⚠️
`BillingSection` calls `/api/stripe/cancel` which **does not exist** (broken
cancel).

## 13. GDPR System
- **Export:** `/api/gdpr/export` (GET) → JSON of all user data
  (`lib/gdpr/collect-user-data.ts`). Working.
- **Deletion:** `/api/gdpr/delete-account` (GET=dry-run plan via
  `plan-user-deletion.ts`; DELETE=executes via `execute-user-deletion.ts`).
  Ownership transfer for shared profiles; cross-contributed memories anonymised
  to a tombstone author (default) or deleted (opt-in). Requires re-auth.
  ⚠️ Backing SQL migration (`supabase/migrations/…_delete_account.sql`) is
  **written but not yet applied**; tombstone strategy pending FK confirmation
  (recommended: sentinel UUID). Public info page `/account-deletion`.

## 14. Authentication System
Supabase Auth. Email/password (`signInWithPassword`) confirmed; OAuth
(Google/Apple) supported (`signInWithOAuth`, provider checks in delete flow)
_(verify provider config in dashboard)_. SSR session via cookies; middleware
gates routes. Clients: `lib/supabase/server.ts` + `utils/supabase/server.ts`
(SSR), `lib/supabase/client.ts` + `utils/supabase/client.ts` (browser),
`utils/supabase/admin.ts` (service role).

## 15. Security Model
- **RLS enabled and enforcing** on all core tables (anon reads return 0 rows).
- Middleware auth gate (fail-closed for unclassified routes).
- Service-role used only server-side (admin client) — **bypasses RLS**, so all
  admin queries must be explicitly user-scoped.
- `CRON_SECRET` fail-closed on cron/notification endpoints.
- Error responses sanitised (no internal leakage); server-side logging retained.
- Sentry wired (inert until env set).

## 16. Database Overview
Postgres (Supabase). Core tables: `profiles`, `memory_profiles`, `memories`,
`reminders`, `profile_relationships`, `caregiver_invites`, `memory_clusters`,
`device_registrations` (+ new `pending_account_deletions` from the delete
migration). **No SQL migrations in repo** except the new delete-account one —
schema lives in the Supabase dashboard. See
`architecture/database-overview.md`. Notable: `memories` has **no declared FK**
on `user_id`/`memory_profile_id`; `profile_relationships`→`memory_profiles` and
`reminders`→`memory_profiles` FKs exist; `auth.users` has **no cascade**.

## 17. Storage Architecture
Single bucket `memory-media` (**public**), per-user prefix `users/{userId}/`.
Deletion uses prefix listing + remove. Public bucket = media URLs are publicly
resolvable (pre-existing privacy consideration).

## 18. Current Production Architecture
Vercel-hosted Next.js; `main` → auto-deploy to `www.remynest.com`. Mobile:
Capacitor **remote-URL wrapper** (loads the live site; iOS build verified;
Android pending SDK). `CRON_SECRET` set in Vercel; **Sentry env vars not set**.
Launch-hardening (security automation, AI disclaimers, premium 402, GDPR export,
legal pages, cron auth, health endpoint, error sanitisation) already merged.

## 19. Known Constraints
- `users` table **does not exist** → `save-onesignal`, `save-subscription` broken.
- `/api/stripe/cancel` **missing** → BillingSection cancel broken.
- `UserProfileDropdown` shows **hardcoded** profile data.
- Delete-account **migration not applied**; tombstone FK strategy unconfirmed.
- Sentry **inactive** (no env). Dev uses **prod Supabase** (no staging).
- Schema not version-controlled (dashboard-managed).
- `npm audit`: Next.js 14.2.5 / postcss advisories outstanding.
- Settings dropdown vs page: two divergent render paths; export logic duplicated.

## 20. Future Vision
Voice memories + transcription; richer caregiver collaboration; cognitive-insight
expansion (kept non-clinical); native push (APNs/FCM) for the Capacitor apps;
App Store + Google Play release; staging environment; schema-as-migrations.
