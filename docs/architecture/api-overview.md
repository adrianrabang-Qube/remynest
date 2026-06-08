# API Overview

25 route handlers under `app/api`. **Auth column** derives from `middleware.ts`:
everything under `/api` is protected (requires session) **except**
`PUBLIC_API_ROUTES`: `/api/stripe/webhook`, `/api/send-reminders`,
`/api/send-notification`, `/api/cron/*`, `/api/health`. Public notification/cron
endpoints are additionally guarded by `CRON_SECRET` (`lib/cron-auth.ts`).

Payloads marked _(verify)_ were inferred from route name/usage, not line-by-line
confirmed — open the file before relying on exact field names.

| Path | Methods | Auth | Purpose | Request | Response |
|---|---|---|---|---|---|
| `/api/health` | GET | Public | Liveness | – | `{status, service, timestamp, commit}` |
| `/api/active-profile` | GET, POST | Session | Get/set active memory profile | POST `{profileId}` _(verify)_ | active profile |
| `/api/profile` | PATCH | Session | Update own profile (name) | `{firstName, preferredName}` | `{ok}` |
| `/api/billing/status` | GET | Session | Subscription status | – | `{plan,status,renewalDate,...}` |
| `/api/stripe/checkout` | POST | Session | Start Checkout | `{plan, interval}` | `{url}` |
| `/api/stripe/webhook` | POST | Public (sig) | Stripe events → update profiles | Stripe event | `{received}` _(verify)_ |
| `/api/memories` | GET | Session | List memories | query _(verify)_ | memories[] |
| `/api/memories/create` | POST | Session | Create memory (+AI enrich, embed) | memory fields | created memory _(verify)_ |
| `/api/memories/[id]` | PUT, DELETE | Session | Update / delete a memory | PUT body _(verify)_ | ok/memory |
| `/api/memories/search` | POST | Session (premium) | Semantic search | `{query}` _(verify)_ | matches[]; **402** for free |
| `/api/search` | POST | Session (premium) | Semantic search | `{query}` _(verify)_ | matches[]; **402** for free |
| `/api/timeline` | GET | Session | Timeline feed | query _(verify)_ | items[] |
| `/api/memory-chat` | POST | Session | RAG chat over memories | `{input}` (+history _(verify)_) | AI reply |
| `/api/create-reminder` | POST | Session | Create reminder (profile-ownership verified) | reminder fields | created reminder |
| `/api/build-relationships` | POST | Session | Build/derive caregiver relationships | _(verify)_ | result |
| `/api/register-device` | POST | Session | Register push device | `{token/deviceId}` _(verify)_ | ok |
| `/api/save-onesignal` | POST | Session | ⚠️ Save OneSignal id → **broken** (`users` table missing) | `{email,onesignal_id}` | error |
| `/api/save-subscription` | POST | Session | ⚠️ → **broken** (`users` table missing) | `{email,onesignal_id}` | error |
| `/api/send-notification` | GET | Public (CRON_SECRET) | Send a notification | – | result |
| `/api/send-reminders` | GET | Public (CRON_SECRET) | Batch reminder send | – | result |
| `/api/cron/send-due-reminders` | GET | Public (CRON_SECRET) | Vercel Cron entry | Bearer CRON_SECRET | `{processed}` _(verify)_ |
| `/api/gdpr/export` | GET | Session | Export all user data (JSON) | – | full export payload |
| `/api/gdpr/delete-account` | GET, DELETE | Session (+re-auth) | GET=dry-run plan; DELETE=execute | DELETE `{password?, deleteContributed}` | plan / `{status,removedFiles,keptFiles}` |

## Conventions
- Auth check pattern: `supabase.auth.getUser()` → 401 if absent.
- Error responses are **generic** (`{error}`); details logged server-side.
- Service-role (`supabaseAdmin`) used in GDPR/cron paths only.
- `dynamic = "force-dynamic"` on session/cookie routes.

## Known API issues
- `/api/stripe/cancel` — **referenced by `BillingSection` but does not exist**.
- `/api/save-onesignal`, `/api/save-subscription` — write to **missing `users`**
  table.
- Several payloads above are _(verify)_ — confirm before integrating.
