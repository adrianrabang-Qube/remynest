# TestFlight — Physical Device QA Checklist

**Purpose:** verify RemyNest on a real iPhone via the TestFlight build (Capacitor
remote-URL WebView → `https://www.remynest.com`). Run top-to-bottom on first
install. **Last updated:** 2026-06-12.

**Pre-req:** TestFlight build installed; tester account credentials ready; a second
fresh account for isolation/deletion tests. Note device model + iOS version.

Legend: ☐ pass · ✗ fail (log build #, steps, screenshot).

## 0. Install & launch
- ☐ App installs from TestFlight; launches to splash → loads the live site (no blank/white screen).
- ☐ App icon on home screen is the **RemyNest brand icon** (NOT the Capacitor placeholder). ⚠️ *Known gap — placeholder must be replaced before submission.*
- ☐ No console/network errors blocking first paint; offline → graceful message (not a crash).

## 1. Authentication
- ☐ **Signup** — create a new account (email/password); lands on onboarding/dashboard.
- ☐ **Login** — sign in with email/password; reaches dashboard.
- ☐ **Google OAuth** — "Continue with Google" completes in-WebView and returns authenticated.
- ☐ **Password reset** — request reset email; link opens; new password works on next login.
- ☐ **Logout** — signs out; returns to login; protected routes no longer accessible.
- ☐ **Session persistence** — fully **quit and relaunch** the app → still logged in (Supabase session persists in the WebView). Repeat after device lock/unlock.

## 2. Memories
- ☐ **Create memory** — text memory saves; appears on dashboard/timeline.
- ☐ **Edit memory** — change title/content; save persists after reload.
- ☐ **Delete memory** — delete; removed from lists; not resurrected on refresh.
- ☐ **Camera upload** — "Take Photo" → **camera permission prompt shows the RemyNest purpose string**; capture; photo attaches and uploads.
- ☐ **Photo library upload** — "Choose from Library" → **photo-library permission prompt shows the purpose string**; pick existing photo/video; attaches and uploads.
- ☐ Media renders back in the memory card after save (and after relaunch).

## 3. Discovery
- ☐ **Timeline** — memories ordered by memory_date; media thumbnails render; scroll is smooth.
- ☐ **Search** — premium user: semantic search returns relevant results. Free user: receives the 402/upgrade prompt (no crash).
- ☐ **AI enrichment** — a newly created memory shows AI summary/tags/mood after processing; **AI disclaimer is visible**; **no clinical/diagnostic language** anywhere.

## 4. Notifications
- ☐ **Push permission** — notifications permission prompt appears at the appropriate time.
- ☐ **Push delivery** — send a test via OneSignal → notification arrives on device. ⚠️ *Known limitation: the current OneSignal **Web SDK** in a WKWebView does not deliver native iOS push reliably — native OneSignal init is a tracked post-TestFlight task. Record the actual on-device result here.*

## 5. Billing
- ☐ **Subscription status** — Settings → Billing shows correct current plan/status.
- ☐ **Cancel** — tap "Cancel Subscription" → UI updates to **"Subscription scheduled to cancel"** (cancel_at_period_end). ⚠️ *Stripe web checkout for upgrades is an Apple 3.1.1 concern on iOS — IAP-vs-hide decision is a pre-submission App Store item, not a TestFlight blocker.*
- ☐ **Manage** — "Manage Subscription" opens the Stripe Customer Portal.

## 6. GDPR
- ☐ **Export** — Settings → request data export → full JSON download/email contains memories + profile.
- ☐ **Delete account** — Settings → Danger Zone → Delete Account → **re-auth** (password / recent OAuth) → account + data removed; signed out; cannot log back in. *(This is the App Review 5.1.1(v) flow — the reviewer must be able to complete it end-to-end.)*

## 7. Cross-cutting
- ☐ Profile/workspace switching works; correct data scoping (no cross-account leakage — test with the second account).
- ☐ Dashboard, Remy avatar (all moods render from the blueprint sheet in the WebView), insights, memory chat (disclaimer present) all load.
- ☐ No layout breakage on the device's safe-area/notch; orientation behaves; back-gesture/navigation sane.

## Sign-off
- Device / iOS: __________  · Build #: ______ · Tester: __________ · Date: ______
- Blocking failures: __________  · Decision: ☐ proceed to App Store submission ☐ fix & re-test
