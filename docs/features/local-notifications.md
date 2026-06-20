# Native iOS Local Notifications for Reminders (hybrid delivery)

**Branch:** `main` · **Status:** code-complete, lint-clean, web-build-validated, **on-device-unverified** (needs `pod install` + a native iOS build + a physical device).

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
| `components/reminders/NativeReminderSync.tsx` | **new** — client component; reconciles on render via a list-signature effect, renders `null` |
| `app/(app)/reminders/page.tsx` | wired: map server `reminders` → `LocalReminder[]`, mount `<NativeReminderSync>` above `<ReminderCenter>` |
| `ios/App/Podfile` | **+1 line** — `pod 'CapacitorLocalNotifications'` added to `capacitor_pods` (CocoaPods — see below) |
| `package.json` / `package-lock.json` | `@capacitor/local-notifications@^8.2.0` |

## Native wiring on main — CocoaPods, NOT SPM (authoritative)
main's iOS project links Capacitor plugins via **CocoaPods** (`ios/App/App.xcworkspace` + `ios/App/Podfile`'s `capacitor_pods` function + a Pods integration in `project.pbxproj`), with **OneSignal as a direct pod** (`pod 'OneSignalXCFramework', '5.5.2'`) in the `target 'App'` block.

Capacitor 8's `npx cap sync ios` **defaults to Swift Package Manager** — it writes a `CapApp-SPM/Package.swift` listing the plugins and does **not** touch the Podfile. On main that `Package.swift` is **inert**: the Xcode project has **zero** references to `CapApp-SPM` (it links via Pods), so the SPM file was **removed** and the plugin was instead declared in the **Podfile** to match the other five Capacitor plugins. This keeps a single, consistent linking mechanism and leaves the OneSignal native integration untouched.

- **Do not** migrate main to SPM or re-add `CapApp-SPM` — it would create a dual-link mismatch and risk the OneSignal pod.
- **Do not** regenerate the iOS project (`cap add ios`) or replace the Podfile/AppDelegate — they carry the OneSignal native init + bridge/ack and the APNs entitlements.
- `OneSignalInit.tsx`, `AppDelegate.swift`, and the entitlements were **not modified** by this feature.

## Recurring, timezone & DST
- **daily** → `schedule.on = { hour, minute }` · **weekly** → `{ weekday, hour, minute }` (iOS 1=Sun..7=Sat) · **monthly** → `{ day, hour, minute }`.
- Components are derived from the reminder's instant in **device-local** time (`getHours()`/`getDay()`/`getDate()`), and iOS uses a `UNCalendarNotificationTrigger(repeats: true)` it re-evaluates each cycle → **DST/timezone-safe** ("daily at 9:00" stays 9:00 local across DST).
- **Monthly clamp:** days 29–31 are clamped to the **28th** so the reminder fires every month (iOS would otherwise skip short months).
- **One-time** → `schedule.at` (interval trigger from the absolute instant), kept fresh by reconcile-on-render; must be **> 60 s** in the future to schedule.

## Database impact
**None.** No schema change. The engine reads existing columns only: `id`, `title`, `remind_at`, `recurring`, `frequency`, `completed`. The server cron/OneSignal path is untouched (hybrid — see below).

## Hybrid model
OneSignal remains for shared-memory alerts, AI updates, collaboration, account events, future social. **Reminder** delivery on native iOS moves to local notifications. The web/Android still rely on the existing server path; `reconcileLocalReminders` is a **no-op off native iOS**. The server cron is **not removed** — it remains the fallback for web/Android and a belt-and-suspenders, but iOS reminders no longer depend on it.

## Review fixes applied (adversarial pass on the original cognition-v2 build)
API usage verified correct against live Capacitor v8 docs. Fixed: (HIGH) per-item scheduling + 60 s lead margin to avoid the native batch-reject when an `at` slips past; (HIGH) monthly day clamp; (MED) per-id signature diff to stop whole-list churn; (LOW) full-UUID FNV-1a id hash; (LOW) tightened recurring frequency guard. Port to main additionally fixed (HIGH) a `react-hooks/refs` error (ref synced in an effect, not during render) with **no eslint-disable**.

## Operator activation (native build required)
The web layer auto-deploys with `main` (no-op in browsers). To activate on iOS:
1. `npm install` (the dep is already in `package.json`).
2. `cd ios/App && pod install` — links `CapacitorLocalNotifications` into the CocoaPods workspace (`Pods/` is gitignored, so every build machine runs this; it also reconciles `Podfile.lock`).
3. Open `ios/App/App.xcworkspace` in Xcode, set the Development Team, build/run on a **physical iPhone** (local notifications work on device; the simulator is partial).
4. First open of the reminders screen prompts for notification permission; grant it.

## Testing plan
- **One-time:** create a reminder ~2–3 min out → background the app → it fires locally; **airplane mode** still fires; reboot the phone → it still fires.
- **Edit/delete/complete:** change the time/title → old cancels, new fires at the new time; delete → no fire; mark complete → no fire.
- **Recurring:** create a daily reminder → it fires at the same local time on consecutive days; (sanity) a monthly reminder set for the 31st fires on the 28th of short months.
- **OneSignal unaffected:** non-reminder pushes (shared memories, account) still arrive via OneSignal.
