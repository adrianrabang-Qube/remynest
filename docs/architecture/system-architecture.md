# System Architecture

Source-of-truth for how RemyNest is wired. Based on the actual codebase.

## App Router structure
Next.js 14.2.5 App Router. Top-level `app/` segments:
- `(app)` — authenticated product (dashboard, memories, timeline, reminders,
  insights, memory-chat, onboarding, settings). Has `app/(app)/layout.tsx`
  (server; includes delete-account failure-recovery hook) + `AppNavbar`.
- `(auth)` — `login`, `signup`, `register`.
- `(marketing)` — marketing surfaces.
- Public top-level: `/` (`app/page.tsx`), `/privacy`, `/terms`, `/cookies`,
  `/account-deletion`, `/search`.
- `app/api/*` — 25 route handlers.
- Root: `layout.tsx`, `error.tsx`, `global-error.tsx`, `manifest.ts`,
  `instrumentation.ts` (Sentry), `sentry.*.config.ts`.

## Route groups
`(app)` / `(auth)` / `(marketing)` are organisational groups (no URL segment).
Auth gating is by **middleware path lists**, not folder membership — adding a
page under `(app)` does NOT protect it unless its path is in `PROTECTED_ROUTES`.

## Middleware architecture (`middleware.ts`)
Path-classification gate:
- `PUBLIC_ROUTES`: `/`, `/login`, `/signup`, `/privacy`, `/terms`, `/cookies`,
  `/account-deletion`.
- `PROTECTED_ROUTES`: `/dashboard`, `/memories`, `/timeline`, `/reminders`,
  `/insights`, `/memory-chat`, `/settings`, `/api`.
- `PUBLIC_API_ROUTES`: `/api/stripe/webhook`, `/api/send-reminders`,
  `/api/send-notification`, `/api/cron`, `/api/health`.
- Session (`supabase.auth.getUser`) is fetched **only** for protected/auth
  routes. **Unclassified routes fail closed** → redirect `/login` (this is why a
  new page needs to be added to a list, not just created).
- Authenticated users on auth routes → redirect `/dashboard`.

## Auth flow
Supabase Auth (cookies, SSR). Login via `signInWithPassword`
(`app/(auth)/login/LoginClient.tsx`) or OAuth (`signInWithOAuth`). Middleware
verifies session; SSR pages read user via `createClient()` from
`@/lib/supabase/server` (or `@/utils/supabase/server`). Logout:
`app/auth/logout/route.ts`.

## Supabase integration
Three client flavours:
- **SSR (anon, RLS-enforced):** `lib/supabase/server.ts`, `utils/supabase/server.ts`.
- **Browser (anon):** `lib/supabase/client.ts`, `utils/supabase/client.ts`.
- **Admin (service role, RLS-bypassing):** `utils/supabase/admin.ts`
  (`supabaseAdmin`). Server-only. Used for GDPR export/deletion, cron.

## Storage flow
Bucket `memory-media` (public). Upload path `users/{userId}/memories/{ts}-{name}`
(`lib/memory-media.ts`). Memories store public URLs in `cover_image_url` /
`attachments`. Deletion enumerates the user prefix and removes (retain-aware for
anonymised cross-contributed memories).

## Stripe flow
`/api/stripe/checkout` (POST) creates a Checkout Session;
`/api/stripe/webhook` (POST, public, signature-verified) updates `profiles`
subscription columns; `/api/billing/status` (GET) reads them. `lib/stripe.ts`,
`lib/billing/*`. ⚠️ `/api/stripe/cancel` is referenced by UI but **not
implemented**.

## OneSignal flow
Web SDK + `onesignal-cordova-plugin` (native). `/api/register-device` stores
tokens in `device_registrations`. Reminder/notification delivery via
`/api/cron/send-due-reminders` → `send-reminder(s)` / `send-notification`,
gated by `CRON_SECRET`. ⚠️ `save-onesignal`/`save-subscription` target a missing
`users` table.

## AI flow
`lib/openai.ts` client. On memory create, `lib/ai-memory.ts` enriches (summary,
tags, mood, etc.) and `lib/embeddings.ts` writes `memories.embedding`. Semantic
search and `memory-chat` (RAG via `lib/retrieve-memory-context.ts`) consume the
embeddings. Insights use `lib/analytics/*` + `lib/cognition/*` (non-diagnostic).

## Data ownership model
- `profiles.id` = auth user id (1:1 with the account).
- `memory_profiles.created_by_account_id` = owner account.
- `memories.user_id` = author account; `memories.memory_profile_id` = the profile
  it belongs to.
- `reminders.user_id` / `memory_profile_id`; `*_clusters.user_id`;
  `device_registrations.user_id`.
- Sharing via `profile_relationships(memory_profile_id, caregiver_account_id)`.

## RLS model
RLS **enabled and enforcing** on all core tables (anon sees 0 rows; service-role
sees all). Policy text is dashboard-managed (not in repo) — read via
`pg_policies` when needed. App access to others' profiles is via
`profile_relationships`, not direct `user_id` match.

## Deletion model
See `features/gdpr-delete-account.md`. Ordered manual deletion (no auth cascade),
transactional RPC `delete_user_account`, storage prefix cleanup, auth user last,
`pending_account_deletions` for resumable auth-failure recovery. Tombstone author
for anonymised cross-contributed memories.
