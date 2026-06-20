# Native iOS Local Notifications for Reminders (hybrid delivery)

**Branch:** `cognition-v2` · **Status:** code-complete, web-build-validated, **on-device-unverified** (needs `cap sync` + a native build + a device).

## Why
Reminder delivery via OneSignal + the Vercel cron is fragile (cron timing, APNs round-trips, alias/app-scoping, network). Reminders are the one notification type that should be **device-local**: scheduled directly on the iPhone so they fire **even if OneSignal fails, the servers are down, the device is offline, and without any cron or APNs**.

## Architecture
RemyNest is a **remote-URL Capacitor app** (the iOS app loads production in a WKWebView) and reminder CRUD is **server-side**, so notifications cannot be scheduled from the server. Instead a **client-side reconciliation engine** mirrors the server-rendered reminder list into on-device schedules.

```
[Supabase reminders]  ──server render──>  reminders/page.tsx (server component)
        │                                          │ passes the list as props
        ▼                                          ▼
   reminder CRUD                       <NativeReminderSync reminders=… />  (client, renders null)
 (server actions:                                  │ useEffect on list signature
  create/toggle/delete)                            ▼
        │ revalidate → re-render            reconcileLocalReminders(list)   [lib/native-reminders.ts]
        └───────────────────────────────────────►  │  isNativeReminderTarget()? (iOS only)
                                                    ▼
                                  @capacitor/local-notifications  →  UNUserNotificationCenter
                                  (getPending / cancel / schedule)     (OS fires on-device)
```

- **Reconciliation, not per-action hooks:** after any create/edit/delete/complete, the server action revalidates → the page re-renders with the new list → the client effect re-runs `reconcileLocalReminders`, which diffs and applies. One idempotent path covers all four actions.
- **Survives restart / offline / no-cron:** once `schedule()` runs, iOS owns the notification (persists across restarts/reboots, fires offline, no server/APNs/cron).
- **Low churn:** an in-session `notificationId → contentSignature` memo means editing one reminder re-schedules only that one; unchanged reminders are skipped. Notifications are scheduled **per-item** so one near-boundary entry can't drop the batch.

## Files
| File | Change |
|---|---|
| `lib/native-reminders.ts` | **new** — the device sync engine (permission, id mapping, schedule build, reconcile) |
| `components/reminders/NativeReminderSync.tsx` | **new** — client component; reconciles on render, renders `null` |
| `app/(app)/reminders/page.tsx` | wired: map server `reminders` → `LocalReminder[]`, mount `<NativeReminderSync>` |
| `package.json` / `package-lock.json` | `@capacitor/local-notifications@^8.2.0` |

## Recurring, timezone & DST (Phase 3)
- **daily** → `schedule.on = { hour, minute }` · **weekly** → `{ weekday, hour, minute }` (iOS 1=Sun..7=Sat) · **monthly** → `{ day, hour, minute }`.
- Components are derived from the reminder's instant in **device-local** time (`getHours()`/`getDay()`/`getDate()`), and iOS uses a `UNCalendarNotificationTrigger(repeats: true)` it re-evaluates each cycle → **DST/timezone-safe** ("daily at 9:00" stays 9:00 local across DST).
- **Monthly clamp:** days 29–31 are clamped to the **28th** so the reminder fires every month (iOS would otherwise skip short months).
- **One-time** → `schedule.at` (interval trigger from the absolute instant), kept fresh by reconcile-on-render; must be **> 60 s** in the future to schedule.

## Database impact
**None.** No schema change. The engine reads existing columns only: `id`, `title`, `remind_at`, `recurring`, `frequency`, `completed`. The server cron/OneSignal path is untouched (hybrid — see Phase 4).

## Hybrid model (Phase 4)
OneSignal remains for shared-memory alerts, AI updates, collaboration, account events, future social. **Reminder** delivery on native iOS moves to local notifications. (The web/Android still rely on the existing server path; `reconcileLocalReminders` is a no-op off native iOS.) The server cron is **not removed** — it remains the fallback for web/Android and a belt-and-suspenders, but iOS reminders no longer depend on it.

## Review fixes applied (adversarial pass)
API usage verified correct against live Capacitor v8 docs. Fixed: (HIGH) per-item scheduling + 60 s lead margin to avoid the native batch-reject when an `at` slips past; (HIGH) monthly day clamp; (MED) per-id signature diff to stop whole-list churn; (LOW) full-UUID FNV-1a id hash; (LOW) tightened recurring frequency guard; (LOW) softened one-time comment.

## Operator activation (native build required)
1. `npm install` (already in `package.json`).
2. `npx cap sync ios` (installs the pod + registers the plugin).
3. Build/run on a **physical iPhone** (local notifications work on device; the simulator is partial).
4. First open of the reminders screen prompts for notification permission; grant it.

## Testing plan
- Create a one-time reminder ~2–3 min out → background the app → it fires locally; **airplane mode** still fires.
- Edit the time/title → old cancels, new fires at the new time. Delete → no fire. Complete → no fire.
- Recurring daily/weekly/monthly → fires on schedule; **force-quit + reboot** → still fires (OS-persisted).
- DST: a daily reminder across a DST boundary stays at the same local time.
- `LocalNotifications.getPending()` count matches the schedulable reminder count.

## App Store implications
- Local notifications need **no special entitlement** (unlike push/APNs) — just runtime `UNUserNotificationCenter` authorization. No `aps-environment` dependency.
- No new background modes. No IAP/3.1.1 surface. Minimal review risk; add a notification-permission usage rationale if prompted.

## Remaining risks / limits
- **On-device-unverified here** — needs the native build + device test above.
- Reconciliation runs when the user is on the **reminders screen** (active profile's reminders). A reminder created on another device only schedules locally after that screen is opened on this device. *(Future: a global background sync.)*
- One-time reminders due in **< 60 s** are not locally scheduled (covered by the existing server path).
- iOS pending-notification cap (~64) — far above typical reminder counts.
- **Branch note:** `cognition-v2` is currently ~180 commits behind `main` (it predates this session's OneSignal fixes). This feature is self-contained and builds cleanly here, but reconcile with `main`'s reminder changes when merging.
