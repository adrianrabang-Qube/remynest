# Project Map — Discovery Audit

> Entry point for all future audits. Generated from the actual repo. Re-run the
> discovery sweep (see CLAUDE_WORKFLOW) if structure changes.

## Folder structure (top level)
```
app/            Next.js App Router (pages, route groups, 25 API routes)
  (app)/        authenticated product (+ server actions, layout w/ delete-recovery)
  (auth)/       login, signup, register
  (marketing)/  marketing
  api/          25 route handlers
  auth/logout/  logout route
  account-deletion, privacy, terms, cookies, search, test-notification, page.tsx
components/     UI (+ ai, insights, legal, marketing, navigation, profile subdirs)
lib/            domain logic (supabase, billing, gdpr, ai, analytics, cognition, …)
utils/supabase/ admin (service role), client, server
middleware.ts   auth/route gate
supabase/migrations/  ONLY the delete-account migration (rest is dashboard-managed)
android/ ios/ mobile/ capacitor.config.ts   Capacitor mobile (remote-URL wrapper)
e2e/            Playwright tests
public/         static assets
instrumentation.ts, sentry.*.config.ts       Sentry
docs/           this documentation system
vercel.json     cron config
playwright-report/ test-results/             ⚠️ build artifacts present in tree
SECURITY_VALIDATION_REPORT.md                ⚠️ stray report at repo root
```

## Major modules (`lib/`)
- **Supabase clients:** `lib/supabase.ts` (legacy single-file), `lib/supabase/{client,server}.ts`, `utils/supabase/{admin,client,server}.ts`.
- **Billing:** `lib/billing/{plans,subscription-guards,usage-limits,billing-telemetry}.ts`, `lib/stripe.ts`, `lib/premium.ts`.
- **GDPR:** `lib/gdpr/{collect-user-data,plan-user-deletion,execute-user-deletion,retry-pending-deletion,tombstone}.ts`.
- **AI:** `lib/openai.ts`, `lib/ai-memory.ts`, `lib/embeddings.ts`, `lib/retrieve-memory-context.ts`.
- **Insights/cognition:** `lib/analytics/*` (6 modules), `lib/cognition/*` (7 engines), `lib/insights/*`, `lib/data/insights.ts`.
- **Profiles/sharing:** `lib/active-profile.ts`, `lib/profile-access.ts`, `lib/context-resolver.ts`, `lib/workspace-context.ts`, `lib/build-relationships.ts`, `lib/build-clusters.ts`.
- **Media:** `lib/memory-media*.ts`, `lib/memory-upload-client.ts`.
- **Misc:** `lib/cron-auth.ts`, `lib/constants/disclaimers.ts`, `lib/types/*`, `lib/toastMessages.ts`.

## Dependency map (integration → file count)
- `@supabase/*` → **14 files** (DB/auth/storage everywhere).
- `onesignal` → **9** (notifications).
- `stripe` → **7** (billing).
- `openai` → **5** (AI).
- `@sentry` → **4** (instrumentation + boundaries).
- `@capacitor` → **0 app-code imports** (mobile is a remote-URL wrapper; native
  projects live in `ios/`, `android/`).

## Active integrations
| Integration | Status | Entry points |
|---|---|---|
| Supabase DB/Auth/Storage | ✅ active | SSR/browser/admin clients; RLS enforcing |
| Stripe | ✅ active (partial) | `/api/stripe/checkout`, `/webhook`, `/billing/status` |
| OpenAI | ✅ active | `lib/ai-memory`, `embeddings`, `/api/memory-chat`, search |
| OneSignal | ⚠️ partial | `register-device`, `OneSignalInit`; native push NOT wired |
| Sentry | ⚠️ inert | wired but env vars not set in Vercel |
| Capacitor | ✅ (iOS verified) | remote wrapper → `www.remynest.com` |
| Vercel Cron | ✅ active | `vercel.json` → `/api/cron/send-due-reminders` |

## Cron / background jobs / edge / server actions
- **Cron:** `vercel.json` — **1 job**, `/api/cron/send-due-reminders`, schedule
  `* * * * *` (**every minute** — ⚠️ aggressive; review). Guarded by `CRON_SECRET`.
- **Background jobs:** none beyond cron (no queue/worker).
- **Edge functions:** none (`supabase/functions` absent).
- **Server actions (`"use server"`):** `app/(app)/dashboard/actions.ts`,
  `dashboard/profile-actions.ts`, `memories/actions.ts`, plus inline in
  `onboarding/page.tsx`, `reminders/page.tsx`, `reminders/new/page.tsx`.

## Dead / broken code discovered
- ⛔ `/api/save-onesignal`, `/api/save-subscription` → write to **non-existent
  `users` table** (broken).
- ⛔ `/api/stripe/cancel` → **referenced by `BillingSection`, not implemented**.
- ⚠️ `lib/supabase.ts` → likely **legacy** duplicate of `lib/supabase/` /
  `utils/supabase/` (confirm references; consolidate).
- ⚠️ `UserProfileDropdown` → **hardcoded** profile object (dead data path).
- ⚠️ `SECURITY_VALIDATION_REPORT.md` at root, `playwright-report/`,
  `test-results/` in tree → stray/artifacts.

## Duplicate implementations discovered
- **Supabase clients in 3 places:** `lib/supabase.ts`, `lib/supabase/*`,
  `utils/supabase/*` (server + client variants duplicated across `lib` and
  `utils`). Standardise on one.
- **Data export logic** duplicated: `GDPRSection` vs `ExportDataSection`.
- **Semantic search** duplicated: `/api/search` vs `/api/memories/search`.
- **Memory creation** paths: `/api/memories/create` + `memories/actions.ts`
  server action + `CreateMemoryForm`/`CreateMemoryModal`/`MemoryForm` — confirm
  which is canonical _(verify)_.
- **Two render paths** for profile: dropdown (`ProfileHub`) vs `/settings` page.

## Architecture risks discovered
1. **Every-minute cron** — load/cost; ensure idempotent + fast; consider less
   frequent or due-window batching.
2. **Public storage bucket** (`memory-media`) — media publicly resolvable.
3. **No staging** — dev uses **prod Supabase**; data-loss/contamination risk.
4. **Schema not version-controlled** — only dashboard; drift risk; document via
   migrations.
5. **Service-role bypasses RLS** — admin queries must be user-scoped (GDPR/cron).
6. **`memories` has no DB FKs** — integrity is app-enforced; ordered deletion
   mandatory.
7. **Sentry inert** — no prod error visibility until env set.
8. **Broken endpoints in prod** (`users` table, stripe cancel) — see above.
9. **Client duplication** — three Supabase client locations invite drift/misuse.
10. **Hardcoded dropdown data** — misrepresents plan/role in UI.

## How to refresh this map
Run the discovery sweep from `docs/CLAUDE_WORKFLOW.md` ("Useful read-only
probes") plus: `find app -name page.tsx`, `find app/api -name route.ts`,
`cat vercel.json`, `grep -rln "use server"`, and the integration import counts.
