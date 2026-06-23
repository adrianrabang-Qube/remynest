# Apple App Store — Rejection Risk Audit

Severity key: **🔴 High** (likely rejection if unaddressed) · **🟠 Medium** (common
reviewer query) · **🟡 Low** (edge case / polish). Each row maps to the relevant App
Store Review Guideline.

| # | Risk | Guideline | Severity | Mitigation |
|---|---|---|---|---|
| 1 | **Web-wrapper / "minimum functionality"** — Capacitor app perceived as just a website | 4.2 | 🔴 | Ship native value: push notifications, native camera/photo capture, native splash/navigation; reviewer note explains integrated native features; ensure app works smoothly and offline-degrades gracefully. Demonstrate it is not a generic web view. |
| 2 | **Implied medical/diagnostic claims** ("dementia", "memory loss") read as health claims | 1.4.1, 2.3.1, 5.x | 🔴 | Explicit non-medical disclaimers in app, listing and Terms; AI Transparency Statement; reviewer notes clarifying non-clinical "support"; avoid words like "diagnose", "treat", "clinical", "assessment". |
| 3 | **No working account deletion** in-app | 5.1.1(v) | 🔴 | In-app **Delete my account** flow (live), plus /account-deletion page. Verify reviewer can complete deletion end-to-end. |
| 4 | **Reviewer can't access features** (no demo account / login wall) | 2.1 | 🔴 | Provide email/password demo credentials + sample data in App Review notes; verify the demo account signs in successfully. |
| 5 | **Sign in with Apple** | 4.8 | ✅ N/A | RemyNest offers **email/password authentication only** — no Google/Apple/third-party login is offered, so Sign in with Apple is **NOT required** (4.8 applies only when a third-party login is offered). |
| 6 | **Privacy nutrition labels inaccurate / inconsistent** with behaviour | 5.1.1, 5.1.2 | 🟠 | Use `05-apple-privacy-nutrition-labels.md`; keep consistent with Privacy Policy and actual SDKs; declare "Data Not Used to Track You." |
| 7 | **Permission purpose strings** missing/empty/generic | 5.1.1 | 🟠 | Add specific `NS*UsageDescription` strings for camera, photo library, (future) microphone; request just-in-time. Do **not** add microphone string until feature ships. |
| 8 | **Tracking/ATT mismatch** — analytics that counts as tracking without ATT | 5.1.2 | 🟠 | Launch without ad tracking; if analytics enabled, ensure it is not "tracking" per Apple; otherwise implement ATT. Keep IDFA uncollected. |
| 9 | **UGC safety controls** absent (user-generated content + sharing) | 1.2 | 🟠 | Provide content reporting/blocking for shared content, a way to filter objectionable content, EULA prohibiting abusive content, and a contact for reports. |
| 10 | **Subscription model** — web-only Stripe (no native purchase) | 3.1.1 | 🟠 | Subscriptions are sold **web-only via Stripe**; native exposes **no purchase UI** (3.1.1 render + handler gating via `lib/platform.ts`). No Apple IAP and **no Restore Purchases** (N/A — there are no native purchases to restore). Link functional Privacy Policy + Terms. |
| 11 | **External purchase / payment links** for digital goods | 3.1.1, 3.1.3 | 🟠 | On native the app shows a **neutral Premium state with no purchase UI, no checkout, and no external / "subscribe on the web" links or steering** (3.1.3). Web checkout is reachable only from the website, never inside the native app. |
| 12 | **Privacy Policy link** broken or not in-app + listing | 5.1.1 | 🟡 | Publish https://www.remynest.com/privacy; link in App Store Connect and in-app. |
| 13 | **AI content moderation** — AI features could surface objectionable output | 1.1, 4.2.3 | 🟡 | AI operates on user's own content; add safeguards/disclaimers; no open-ended public AI content generation. |
| 14 | **Crash on review / beta feel / placeholder content** | 2.1, 2.2 | 🟡 | QA on device; remove placeholder icons/text; ensure stable build; verify on current iOS. |
| 15 | **Data collection without consent** (EU) on first run | 5.1.1, 5.1.2 | 🟡 | Consent for non-essential analytics; no unexpected data collection before account creation. |
| 16 | **Default/placeholder app icon** or low-quality assets | 2.3.7 | 🟡 | Replace Capacitor placeholder icon with final brand icon (opaque, all sizes) and screenshots. |
| 17 | **Account creation but no deletion path surfaced** | 5.1.1(v) | 🟡 | Ensure deletion is discoverable (Settings → Privacy), not buried. |
| 18 | **Children's data / age rating** mismatch | 1.3, 5.1.4 | 🟡 | Set appropriate age rating; not child-directed; no kids-category enrollment. |

## Pre-submission "must-pass" gate (the 🔴 items)
1. Native value demonstrated (anti-4.2). 2. No medical claims anywhere. 3. Working in-app
account deletion. 4. Reviewer demo account + working **email/password** sign-in. (Sign in
with Apple is **N/A** — email/password only, no third-party login.) Do not submit until
all four are true.
