# Feature: Notifications

## Current implementation
Push via OneSignal (web SDK + `onesignal-cordova-plugin` for native). Reminder
delivery driven by Vercel Cron.

## Architecture
- Device registration: `/api/register-device` → `device_registrations`.
- Client init: `components/OneSignalInit.tsx`.
- Delivery: `/api/cron/send-due-reminders` (Vercel Cron, `CRON_SECRET`) →
  `/api/send-reminders` / `/api/send-notification` (both public + CRON_SECRET).
- `lib/cron-auth.ts` enforces `Authorization: Bearer <CRON_SECRET>` (fail-closed).

## Database dependencies
`device_registrations(user_id, …)`. (Note: `reminders` drive what is sent.)

## API routes
`/api/register-device` (POST), `/api/send-notification` (GET, CRON_SECRET),
`/api/send-reminder` (POST), `/api/send-reminders` (GET, CRON_SECRET),
`/api/cron/send-due-reminders` (GET, CRON_SECRET).

## UI components
`components/OneSignalInit.tsx`; `app/test-notification/page.tsx`;
`components/profile/sections/NotificationsSection.tsx` (placeholder — no prefs
backend).

## Limitations
- ⚠️ `/api/save-onesignal` + `/api/save-subscription` write to a **missing
  `users` table** → broken; the working registry is `device_registrations`.
- No notification-preferences persistence (Settings section is placeholder).
- **Native push** (APNs/FCM) not yet wired for the Capacitor apps — the remote
  WebView uses the Web SDK, not the native plugin.

## Future enhancements
Native push (APNs key + FCM `google-services.json` + OneSignal native init);
preferences backend (`notification_preferences`); remove dead `users`-table
endpoints.
