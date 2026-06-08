# Feature: Reminders

## Current implementation
Reminders tied to a memory profile, with scheduled delivery via cron + OneSignal.

## Architecture
- Create: `/api/create-reminder` (session-auth, profile-ownership verified) and
  the reminders-page `createReminder` server action.
- Delivery: Vercel Cron → `/api/cron/send-due-reminders` → `send-reminder(s)` /
  `send-notification` (OneSignal). Cron guarded by `CRON_SECRET`.

## Database dependencies
`reminders` (`user_id`, `memory_profile_id` **FK→memory_profiles**, schedule
fields _(verify)_).

## API routes
`/api/create-reminder` (POST), `/api/send-reminder` (POST),
`/api/send-reminders` (GET, CRON_SECRET),
`/api/cron/send-due-reminders` (GET, CRON_SECRET).

## UI components
`app/(app)/reminders/page.tsx`, `reminders/new/page.tsx`, `reminders/[id]/page.tsx`.

## Limitations
- Delivery depends on OneSignal device registration being correct (note the
  broken `save-onesignal` path; real registry is `device_registrations`).

## Future enhancements
Recurring reminders; smarter scheduling; per-caregiver reminder routing.
