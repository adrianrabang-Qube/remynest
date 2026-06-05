# Feature: Reminders

## Current implementation
Reminders tied to a memory profile, with natural-language parsing and scheduled
delivery via cron + OneSignal.

## Architecture
- NL parse: `/api/parse-reminder` (OpenAI) → structured reminder.
- Create: `/api/create-reminder`.
- Delivery: Vercel Cron → `/api/cron/send-due-reminders` → `send-reminder(s)` /
  `send-notification` (OneSignal). Cron guarded by `CRON_SECRET`.

## Database dependencies
`reminders` (`user_id`, `memory_profile_id` **FK→memory_profiles**, schedule
fields _(verify)_).

## API routes
`/api/parse-reminder` (POST), `/api/create-reminder` (POST),
`/api/send-reminder` (POST), `/api/send-reminders` (GET, CRON_SECRET),
`/api/cron/send-due-reminders` (GET, CRON_SECRET).

## UI components
`app/(app)/reminders/page.tsx`, `reminders/new/page.tsx`, `reminders/[id]/page.tsx`.

## Limitations
- `parse-reminder` error handling / timezone handling _(verify)_.
- Delivery depends on OneSignal device registration being correct (note the
  broken `save-onesignal` path; real registry is `device_registrations`).

## Future enhancements
Recurring reminders; smarter scheduling; per-caregiver reminder routing.
