# RemyNest — Real Device Acceptance Testing (RDAT) Plan

> **Operational acceptance plan — production launch validation.** Authored 2026-06-24.
> Owner: QA / operator. Status: **ready to execute** (no code in this document).

## Why this plan exists
The Direct-to-Storage upload architecture finished implementation, security review,
validation, hardening, and adversarial testing — **code-confidence baseline = 86/100**.
The remaining uncertainty is **not code correctness**; it is **real-world runtime
behavior on physical devices and networks** that cannot be proven by static analysis or
CI: actual camera/photo permission prompts, native notification delivery while locked,
WebView quirks, cellular interruptions, and cross-device layout.

This plan converts "code-correct" into "**runtime-verified**". Every test below is
grounded in the **actual** RemyNest implementation (quoting real UI labels, states, and
known device behavior) so a human tester can run it on a real phone and get an
unambiguous PASS/FAIL.

## Scope
**In scope:** Media uploads · Reminders & notifications · Care profiles & workspace
switching · Search · Mobile platforms (iPhone Safari/PWA/TestFlight, Android Chrome/Play)
· Offline / poor network. **Out of scope:** unit/integration tests (done in CI),
billing/Stripe flows (web-only, separate), GDPR export/delete (separate plan).

## Architecture facts every tester must know
- **iOS app = remote-URL Capacitor WebView** loading `https://www.remynest.com`. Web
  fixes ship via Vercel deploy (no native rebuild); a native build is only needed for
  native changes. The **Android** build is the same remote-URL wrapper.
- **Auth is email/password only** — there is **no** Sign in with Apple and **no** Google
  login. Do not test social login.
- **Uploads are direct-to-storage**: client → signed URL → Supabase Storage → JSON
  metadata to the API. Large videos work; **no raw bytes** pass through the function.
- **iOS reminders are device-local** (`@capacitor/local-notifications`) and fire
  **offline / locked / backgrounded / foregrounded**. **Android push needs FCM**
  (operator fast-follow) — Android notification *delivery* is a **known gap** today.
- **AI insights are deferred** — a new memory saves instantly; its AI title/tags/summary
  and **semantic-search** indexing appear a few seconds later.
- **Purchases are web-only on native** (Apple 3.1.1) — the storage-full modal hides the
  Upgrade CTA on iOS.

## How to use this plan
- **Run P0 (launch-critical) first**, then P1, then P2. A single P0/Blocker failure
  stops the launch (see §Launch Blockers).
- For **every** test, record: **build # · device model · OS version · network (Wi-Fi /
  LTE / 5G) · result · screenshot on FAIL**.
- Run the full pass on **at least:** 1 modern iPhone (Face-ID, notch) + 1 older/smaller
  iPhone (or iPhone SE) + 1 Android phone, each in **portrait and landscape**.
- Use **fresh accounts** so isolation tests are meaningful (see §Test Accounts).

### Result legend
`☐` not run · `✅ PASS` · `❌ FAIL` · `⚠️ PARTIAL` (works with a documented non-blocking
deviation) · `⊘ BLOCKED` (cannot run — a dependency is missing, e.g. Android FCM).

## Test accounts & data (set up before starting)
| Account | Purpose |
|---|---|
| **A — primary** | Main happy-path tester; has some existing memories/reminders. |
| **B — second fresh** | Cross-user **isolation** tests (B must never see A's data). |
| **C — near-quota** | Storage at ~95% of plan limit → quota-warning + 413 tests. |
| **D — FREE tier** | Confirms FREE limits + the native "no Upgrade CTA" path. |
| **Reviewer** | The App-Store reviewer account (populated, FREE) — run the P0 set as the reviewer would. |

Each account needs: a **My Nest** (personal) space and at least one **care profile**
(e.g. "Mum") with its own memories + reminders.

---

# 1. Test Cases by Domain

*80 cases · 43 P0 · 25 P1 · 12 P2. Severity-if-fail: 🔴 Blocker · 🟠 High · 🟡 Medium · 🟢 Low.*


## 1.1 Media uploads

> **Grounding (real implementation):** Authored from the live create/upload code, not assumptions. Grounding facts: (1) Upload is DIRECT-TO-STORAGE (lib/memory-direct-upload.ts): the client POSTs file metadata to /api/memories/upload-url (auth + quota pre-check + server-generated owner-scoped paths users/{userId}/memories/...), then uploads each file STRAIGHT to Supabase Storage via uploadToSignedUrl, then submits JSON attachment metadata (no raw bytes) to /api/memories/create. This bypasses the ~4.5 MB Vercel function-body limit, so large videos succeed — the key win. …


| ID | Title | Pri | If fail | Devices |
|---|---|---|---|---|
| `MEDIA-001` | Create a memory with a single photo | **P0** | 🔴 Blocker | iPhone (primary), Android |
| `MEDIA-002` | Create a memory with multiple photos and reorder them | **P0** | 🔴 Blocker | iPhone (primary), Android |
| `MEDIA-003` | Create a memory with a single video | **P0** | 🔴 Blocker | iPhone (primary), Android |
| `MEDIA-004` | Create a memory with multiple videos | **P1** | 🟠 High | iPhone (primary), Android |
| `MEDIA-005` | Create a memory with mixed photos and videos | **P0** | 🔴 Blocker | iPhone (primary), Android |
| `MEDIA-006` | Upload a LARGE video (over ~4.5 MB) — direct-to-storage success | **P0** | 🔴 Blocker | iPhone (primary), Android |
| `MEDIA-007` | Upload cancellation by navigating away mid-upload | **P1** | 🟡 Medium | iPhone (primary), Android |
| `MEDIA-008` | Backgrounding the app mid-upload | **P1** | 🟡 Medium | iPhone (primary), Android |
| `MEDIA-009` | Upload failure recovery — kill network mid-upload, then retry | **P0** | 🔴 Blocker | iPhone (primary), Android |
| `MEDIA-010` | Storage quota enforcement at the limit -> 413 Storage Full modal (native) | **P0** | 🔴 Blocker | iPhone (primary, native-guard critical), Android |
| `MEDIA-011` | Storage Full modal shows Upgrade CTA on web (not native) | **P1** | 🟡 Medium | Web browser only (desktop or mobile Safari/Chrome) |
| `MEDIA-012` | Near-full storage allows an upload that still fits | **P1** | 🟠 High | iPhone (primary), Android |
| `MEDIA-013` | Text-only memory (no media) is never blocked by quota | **P1** | 🟡 Medium | iPhone (primary), Android, Web |
| `MEDIA-014` | AI insights appear AFTER save (deferred enrichment), not blocking the upload | **P1** | 🟡 Medium | iPhone (primary), Android |
| `MEDIA-015` | Unsupported file type is rejected (no SVG / disallowed media) | **P2** | 🟡 Medium | iPhone (primary), Android |


#### ☐ `MEDIA-001` — Create a memory with a single photo
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone (primary), Android

- **Preconditions:** Logged in (email/password) on the iOS app. Account has storage available. Device camera roll has at least one photo.
- **Steps:**
  1. Open the app and tap the center "+" FAB to reach the New memory screen (or open Create Memory).
  2. Type a short title and at least 3 characters of memory text in "Write your memory...".
  3. Under "Photos", tap "Add photos or videos" and select ONE photo from the library.
  4. Confirm a thumbnail of that photo appears in the 3-column grid with an "x" remove button.
  5. Tap "Save Memory" and watch the button.
  6. Wait for the result.
- **Expected:** While saving, the button reads "Saving..." and is disabled (NO progress bar — only this loading state). On success a "Memory saved" toast appears, the title/text/photo clear from the form, and the new memory appears in the feed showing the photo. The memory is created immediately; AI title/tags/summary may be blank at first and fill in seconds later (deferred enrichment).
- **Pass/Fail:** PASS if the photo uploads, the "Memory saved" toast shows, and the memory appears with the image. FAIL if the photo is missing, an error banner shows, the button hangs on "Saving...", or the memory is not created.

#### ☐ `MEDIA-002` — Create a memory with multiple photos and reorder them
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone (primary), Android

- **Preconditions:** Logged in on iOS app with storage available. Library has 4+ photos.
- **Steps:**
  1. Open Create Memory and enter title + memory text.
  2. Tap "Add photos or videos" and select 4 photos at once.
  3. Confirm all 4 thumbnails appear in the grid, each with an "x" and, because there is more than one, "‹" / "›" reorder buttons.
  4. Tap "‹" on the last photo to move it earlier, and tap an "x" on one photo to remove it (should leave 3).
  5. Tap "Save Memory".
  6. Open the saved memory in the feed/detail view.
- **Expected:** All selected photos preview as thumbnails; reorder buttons move a photo left/right (first photo's "‹" and last photo's "›" are disabled); the "x" removes a single photo. After save, the memory shows the remaining 3 photos in the order set (cover = first). "Memory saved" toast appears.
- **Pass/Fail:** PASS if multi-select, reorder, and per-item remove all work and the saved memory reflects them. FAIL if any photo is dropped, order is wrong, reorder/remove controls are missing or do nothing, or save fails.

#### ☐ `MEDIA-003` — Create a memory with a single video
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone (primary), Android

- **Preconditions:** Logged in on iOS app with storage available. Library has a short video under the bucket object-size limit.
- **Steps:**
  1. Open Create Memory and enter title + memory text.
  2. Tap "Add photos or videos" and select ONE video.
  3. Confirm the video shows as a dark tile with a white play icon (NOT a still thumbnail; no inline video player in the picker).
  4. Tap "Save Memory" and wait.
  5. Open the saved memory and tap the video to view it.
- **Expected:** The picker shows the video as a play-icon tile. Save succeeds with "Memory saved" toast. In the feed the memory shows a play-icon media tile; opening the viewer plays the video with native controls.
- **Pass/Fail:** PASS if the video uploads, appears as a play tile, saves, and plays back. FAIL if the video is rejected, save fails, the tile is wrong, or playback does not work.

#### ☐ `MEDIA-004` — Create a memory with multiple videos
**P1** · 🟠 **High** if fail · _Devices:_ iPhone (primary), Android

- **Preconditions:** Logged in on iOS app with storage available. Library has 2+ short videos.
- **Steps:**
  1. Open Create Memory, enter title + text.
  2. Tap "Add photos or videos" and select 2 videos.
  3. Confirm 2 play-icon tiles appear with "x" and "‹"/"›" controls.
  4. Tap "Save Memory" and wait for completion.
  5. Open the saved memory and play each video.
- **Expected:** Both videos preview as play tiles, upload directly to storage, and save together ("Memory saved"). The saved memory contains both videos and each plays back.
- **Pass/Fail:** PASS if both videos upload and play. FAIL if either video is dropped, save fails/hangs, or playback fails.

#### ☐ `MEDIA-005` — Create a memory with mixed photos and videos
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone (primary), Android

- **Preconditions:** Logged in on iOS app with storage available. Library has both photos and videos.
- **Steps:**
  1. Open Create Memory, enter title + text.
  2. Tap "Add photos or videos" and select a mix (e.g. 2 photos + 1 video).
  3. Confirm photos show as image thumbnails and the video as a play-icon tile, all in the same grid.
  4. Reorder so the video is not first, then tap "Save Memory".
  5. Open the saved memory and confirm all items are present and the cover (first) item matches the chosen order.
- **Expected:** Photos and the video coexist in one memory's attachments; previews are type-correct (image thumb vs play tile). Save succeeds ("Memory saved"). The saved memory shows mixed media in the chosen order; photos open as images and the video plays.
- **Pass/Fail:** PASS if mixed media uploads in one memory with correct previews/order. FAIL if any item is dropped, type rendering is wrong, order is lost, or save fails.

#### ☐ `MEDIA-006` — Upload a LARGE video (over ~4.5 MB) — direct-to-storage success
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone (primary), Android

- **Preconditions:** Logged in on iOS app with enough remaining storage for the file. A video clearly larger than 4.5 MB (e.g. 30-200 MB, but under the operator-set Supabase bucket object-size limit) is in the library. Stable Wi-Fi recommended.
- **Steps:**
  1. Open Create Memory, enter title + text.
  2. Tap "Add photos or videos" and select the large video (play-icon tile appears).
  3. Tap "Save Memory". Note the button shows "Saving..." with NO percentage/progress bar — this may take a while on a large file.
  4. Wait for the upload to finish (do not background the app).
- **Expected:** The large video uploads successfully despite exceeding the ~4.5 MB request-body limit, because the file goes client -> Supabase Storage directly (not through the API route). On success the "Memory saved" toast appears and the video is in the memory. There is NO 413 unless this file would exceed the account's total storage quota.
- **Pass/Fail:** PASS if a >4.5 MB video saves successfully. FAIL if it errors with a size/413-not-quota error, the request is rejected, or save hangs indefinitely.

#### ☐ `MEDIA-007` — Upload cancellation by navigating away mid-upload
**P1** · 🟡 **Medium** if fail · _Devices:_ iPhone (primary), Android

- **Preconditions:** Logged in on iOS app. A moderately large video (large enough that upload takes several seconds) in the library.
- **Steps:**
  1. Open Create Memory, enter title + text, and add the large video.
  2. Tap "Save Memory"; while the button shows "Saving...", immediately navigate away (e.g. tap a different tab / back) before it completes.
  3. Return to the memories feed and refresh.
  4. Check the storage usage indicator ("... left").
- **Expected:** Leaving mid-upload cancels the in-flight request; no half-written memory should appear in the feed (the memory row is only inserted after the bytes finish and metadata POSTs). A cancelled upload may leave an orphaned storage object that is not counted toward quota (orphan-sweep is a known follow-up), so the usage indicator should not jump. The app must not crash or get stuck on "Saving...".
- **Pass/Fail:** PASS if no broken/empty memory is created and the app stays stable. FAIL if a corrupt/empty memory appears, the app crashes, storage usage is wrongly inflated, or the form is left permanently disabled.

#### ☐ `MEDIA-008` — Backgrounding the app mid-upload
**P1** · 🟡 **Medium** if fail · _Devices:_ iPhone (primary), Android

- **Preconditions:** Logged in on iOS app. A large video selected and ready to save.
- **Steps:**
  1. Start saving a memory with a large video (button shows "Saving...").
  2. Press the device Home gesture to background the app while uploading.
  3. Wait ~20-30 seconds, then reopen the app.
  4. Observe whether the upload completed or failed, and check the feed and storage usage.
- **Expected:** iOS may suspend the WebView and interrupt the upload. On return, EITHER the upload had completed and a "Memory saved" memory exists, OR it was interrupted and an error banner ("Upload failed. Please try again.") shows / no memory was created. In no case should a corrupt/empty memory be created or the form be stuck on "Saving...". The tester can retry by saving again.
- **Pass/Fail:** PASS if the outcome is a clean success OR a recoverable failure with no corruption. FAIL if a broken memory is created, the app crashes, or the form is permanently stuck.

#### ☐ `MEDIA-009` — Upload failure recovery — kill network mid-upload, then retry
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone (primary), Android

- **Preconditions:** Logged in on iOS app with storage available. A large video selected. Ability to toggle Airplane Mode / Wi-Fi.
- **Steps:**
  1. Open Create Memory, enter title + text, add the large video.
  2. Tap "Save Memory"; while "Saving..." is showing, turn ON Airplane Mode (or kill Wi-Fi) to break the connection mid-upload.
  3. Observe the form's response.
  4. Turn networking back ON.
  5. Tap "Save Memory" again to retry.
  6. Confirm the memory now saves.
- **Expected:** When the network drops, the upload fails and the form returns to an editable state with a red error banner ("Upload failed. Please try again." or a similar message) — the title/text/selected file are NOT lost. After reconnecting and tapping "Save Memory" again, the memory uploads and saves ("Memory saved"). No duplicate/corrupt memory is left behind from the failed attempt.
- **Pass/Fail:** PASS if the failure is clearly surfaced, the form stays editable with inputs intact, and a retry succeeds. FAIL if the app crashes, the error is silent, inputs are lost, the form is stuck on "Saving...", or the retry creates a duplicate/corrupt memory.

#### ☐ `MEDIA-010` — Storage quota enforcement at the limit -> 413 Storage Full modal (native)
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone (primary, native-guard critical), Android

- **Preconditions:** Logged in on the iOS app with an account whose storage is at/near full (operator sets the account to a low tier or pre-fills it). A photo/video whose size would push usage over the limit is in the library.
- **Steps:**
  1. Note the storage indicator under the picker reads a small "... of ... left".
  2. Open Create Memory, enter title + text, and add a file large enough to exceed the remaining quota.
  3. Tap "Save Memory".
  4. Read the modal that appears.
  5. Tap the close/primary button.
- **Expected:** The upload is BLOCKED with HTTP 413 and a "Storage full" modal: heading "Storage full", text "This upload would exceed your available storage.", and a breakdown of Current (used / limit), After this upload, and Remaining. On NATIVE iOS there is NO "Upgrade" button (Apple 3.1.1) — only a "Got it" button and the line "Remove photos or files you no longer need to free up space." The memory is NOT created and storage usage does not increase.
- **Pass/Fail:** PASS if the over-quota upload is blocked, the "Storage full" modal shows the usage breakdown, NO Upgrade/web-checkout CTA appears on native, and no memory is created. FAIL if the upload succeeds past the limit, the modal is missing/wrong, an Upgrade or "subscribe on the web" CTA appears on native, or a memory is created.

#### ☐ `MEDIA-011` — Storage Full modal shows Upgrade CTA on web (not native)
**P1** · 🟡 **Medium** if fail · _Devices:_ Web browser only (desktop or mobile Safari/Chrome)

- **Preconditions:** Logged in via a desktop/mobile WEB browser (www.remynest.com, NOT the iOS app) with an account at/near its storage limit.
- **Steps:**
  1. In the web browser, open Create Memory and add a file that exceeds remaining quota.
  2. Click "Save Memory".
  3. On the "Storage full" modal, observe the buttons.
  4. Click "Upgrade".
- **Expected:** On WEB the "Storage full" modal shows BOTH "Free up space" and an "Upgrade" button. Clicking "Upgrade" opens the storage upgrade modal (plan options). This Upgrade path must appear ONLY on web — confirming the native guard (MEDIA-010) is platform-specific, not a global removal.
- **Pass/Fail:** PASS if web shows the Upgrade button and it opens the upgrade modal. FAIL if Upgrade is missing on web, or if it errors.

#### ☐ `MEDIA-012` — Near-full storage allows an upload that still fits
**P1** · 🟠 **High** if fail · _Devices:_ iPhone (primary), Android

- **Preconditions:** Logged in on iOS app with an account near (but not over) its storage limit, with at least enough room for one small photo.
- **Steps:**
  1. Confirm the "... of ... left" indicator shows a small remaining amount.
  2. Open Create Memory, enter title + text, add ONE small photo that fits within the remaining space.
  3. Tap "Save Memory".
  4. Re-check the storage indicator after save.
- **Expected:** Because the file fits, NO 413 / Storage Full modal appears — the memory saves normally ("Memory saved") and the "... left" indicator decreases to reflect the new usage. Enforcement is by total storage used, so a fitting upload is never blocked.
- **Pass/Fail:** PASS if a fitting upload succeeds with no false 413 and usage updates. FAIL if a within-limit upload is wrongly blocked by the Storage Full modal, or usage does not update.

#### ☐ `MEDIA-013` — Text-only memory (no media) is never blocked by quota
**P1** · 🟡 **Medium** if fail · _Devices:_ iPhone (primary), Android, Web

- **Preconditions:** Logged in on iOS app. Account may be at/over its storage limit (a 0-byte upload batch should still pass).
- **Steps:**
  1. Open Create Memory, enter a title and at least 3 characters of memory text.
  2. Do NOT add any photo or video.
  3. Tap "Save Memory".
- **Expected:** A text-only memory saves successfully ("Memory saved") even if storage is full — a 0-byte batch always passes quota. No Storage Full modal appears.
- **Pass/Fail:** PASS if the text-only memory saves regardless of storage state. FAIL if a text-only memory is blocked by the Storage Full modal or errors.

#### ☐ `MEDIA-014` — AI insights appear AFTER save (deferred enrichment), not blocking the upload
**P1** · 🟡 **Medium** if fail · _Devices:_ iPhone (primary), Android

- **Preconditions:** Logged in on iOS app with storage available.
- **Steps:**
  1. Create and save a memory with a photo (see MEDIA-001).
  2. Immediately open the just-saved memory.
  3. Note that AI fields (tags, summary, category, mood) may be empty / generic at first.
  4. Wait several seconds and refresh / reopen the memory.
- **Expected:** The memory is saved and visible IMMEDIATELY with the user's own title and the photo — saving does NOT wait on AI. AI insights (summary/tags/category/mood) are populated by a separate background enrichment request and appear a few seconds later on refresh. A delay in insights is expected behavior, not a defect.
- **Pass/Fail:** PASS if the memory saves instantly with media and insights fill in later. FAIL if saving hangs waiting on AI, the memory is lost when enrichment is slow, or insights never appear after a reasonable wait.

#### ☐ `MEDIA-015` — Unsupported file type is rejected (no SVG / disallowed media)
**P2** · 🟡 **Medium** if fail · _Devices:_ iPhone (primary), Android

- **Preconditions:** Logged in on iOS app. If the picker can be made to surface a non-image/non-video file (e.g. via Files), attempt to attach an SVG or other disallowed type.
- **Steps:**
  1. Open Create Memory.
  2. Tap "Add photos or videos". Note the picker is restricted to photos/videos (image/*, video/*).
  3. If able to select an SVG or other non-allowed file, attempt to add it and save.
  4. Observe the result.
- **Expected:** The picker only offers photos and videos, so most disallowed types cannot be chosen. If a disallowed type (e.g. image/svg+xml) is forced through, the server rejects it with an "Unsupported file type" error and no memory/attachment is created. SVG is explicitly disallowed.
- **Pass/Fail:** PASS if only photos/videos can be added and any forced disallowed type is rejected with an error and not stored. FAIL if an SVG or other disallowed type is accepted and stored.

**Device notes:**
- Primary target is a physical iPhone running the remote-URL Capacitor iOS WebView (loads www.remynest.com). The native-platform behavior in MEDIA-010 (no Upgrade CTA in the Storage Full modal, Apple 3.1.1) MUST be verified on the actual iOS app, not a web browser — the server cannot distinguish platforms, so the guard is client-side via the Capacitor bridge.
- Run MEDIA-011 in a real WEB browser (desktop or mobile Safari/Chrome at www.remynest.com) to confirm the Upgrade CTA appears on web only — this is the contrast case to MEDIA-010.
- Re-run the full suite on the Android build; behavior should match iOS (Android is also a native Capacitor platform, so the no-Upgrade guard applies there too).
- Large-video tests (MEDIA-006, 007, 008, 009) are best on Wi-Fi; behavior on slow cellular is informative for the no-progress-bar limitation but is not the pass/fail gate.
- Auth is EMAIL/PASSWORD only — there is no Apple/Google sign-in; log in with email + password before every session.
- Storage-limit tests (MEDIA-010, 012, 013) require an operator to set the test account to a low storage tier or pre-fill its usage so the limit can be hit with a single reasonable file.

**Known limitations (expected behavior — not a FAIL):**
- NO granular upload progress bar — the only feedback during upload is the button switching to "Saving..." and being disabled. On large files/slow networks this can look frozen even though it is working (relevant to MEDIA-006, 008, 009). Do not fail a test solely for lack of a percentage indicator.
- The per-file maximum is the OPERATOR-SET Supabase bucket object-size limit (configured on the bucket, not in app code). The old per-file 25 MB cap has been removed (CLAUDE.md authoritative 2026-06-23) — the only effective bounds are this bucket object-size limit and the account's TOTAL storage quota. A file rejected purely for exceeding the bucket object-size limit (not quota) is an environment/config condition, not an app bug.
- Create-then-enrich is asynchronous: the memory row is inserted with neutral AI defaults and returned immediately, then a separate fire-and-forget POST /api/memories/{id}/enrich fills AI insights/tags/summary/embedding. Insights therefore appear LATER (seconds), not at save time (MEDIA-014).
- Cancelled/interrupted uploads (MEDIA-007, 008, 009) can leave orphaned storage objects that are not counted toward quota; an orphan-sweep cron is a documented (non-launch-blocking) follow-up, so usage should not inflate from a cancelled upload.
- Storage enforcement is by TOTAL storage used per account (purchased capacity), not by individual file size; a single file is only blocked when it would push total usage over the plan limit.
- Quota is enforced twice (sign-time pre-check on client-reported sizes, then create-time re-check against the REAL object size in storage); an unverifiable real size fails closed and that attachment is silently dropped rather than trusted.

## 1.2 Reminders + notifications (iOS device-local local notifications, with web/Android server-cron fallback)

> **Grounding (real implementation):** All tests are grounded in the actual code and docs. On native iOS, RemyNest reminders are scheduled ON-DEVICE via @capacitor/local-notifications (lib/native-reminders.ts) and fire entirely on-device through UNUserNotificationCenter — no OneSignal, no Vercel cron, no APNs round-trip required. They fire OFFLINE (airplane mode) and survive app quit/reboot because iOS holds the schedule. The reminders screen mounts <NativeReminderSync> (components/reminders/NativeReminderSync.tsx), which re-runs reconcileLocalReminders whenever the schedulable shape of the list changes (create/edit/delete/complete all re-render the server-rendered list, so one idempotent diff covers all four actions). …


| ID | Title | Pri | If fail | Devices |
|---|---|---|---|---|
| `REM-001` | Grant notification permission on first open of the reminders screen (iOS) | **P0** | 🔴 Blocker | iPhone (physical device, TestFlight/App Store build). Not the simulator — local notifications are only partially supported there. |
| `REM-002` | Create a My Nest (personal) one-time reminder and confirm it is stored and listed | **P0** | 🔴 Blocker | iPhone (physical). Spot-check the create flow on Android and web as well. |
| `REM-003` | My Nest one-time reminder DELIVERS while the app is in the FOREGROUND (app open) | **P0** | 🔴 Blocker | iPhone (physical). |
| `REM-004` | One-time reminder DELIVERS while the app is BACKGROUNDED (not quit) | **P0** | 🔴 Blocker | iPhone (physical). |
| `REM-005` | One-time reminder DELIVERS while the phone is LOCKED | **P0** | 🔴 Blocker | iPhone (physical). |
| `REM-006` | One-time reminder DELIVERS while the app is fully QUIT (force-closed) | **P0** | 🔴 Blocker | iPhone (physical). |
| `REM-007` | One-time reminder DELIVERS OFFLINE (airplane mode, no network) | **P0** | 🔴 Blocker | iPhone (physical). This offline path is iOS-only; web/Android use the online server cron and are out of scope for this offline test. |
| `REM-008` | Reminder schedule SURVIVES a device reboot | **P1** | 🟠 High | iPhone (physical). |
| `REM-009` | Create a CARE-PROFILE reminder and confirm it is stored, scoped, and listed | **P0** | 🔴 Blocker | iPhone (physical). Spot-check on web and Android. |
| `REM-010` | Care-profile reminder DELIVERS on-device (lock + background) | **P0** | 🔴 Blocker | iPhone (physical). |
| `REM-011` | Workspace isolation — My Nest and care reminders do not cross-contaminate | **P1** | 🟠 High | iPhone (physical), web. |
| `REM-012` | Add Reminder form RESETS after a successful create | **P1** | 🟡 Medium | iPhone (physical), web. |
| `REM-013` | Add Reminder form RESETS after switching workspaces | **P2** | 🟢 Low | iPhone (physical), web. |
| `REM-014` | Create a DAILY recurring reminder and confirm it fires daily at the same local time | **P0** | 🟠 High | iPhone (physical). |
| `REM-015` | Create a WEEKLY recurring reminder on the correct weekday | **P1** | 🟠 High | iPhone (physical). |
| `REM-016` | Create a MONTHLY recurring reminder; day 29-31 clamps to the 28th | **P2** | 🟡 Medium | iPhone (physical). |
| `REM-017` | EDIT/replace a reminder's time — old fire is cancelled, new time fires | **P0** | 🔴 Blocker | iPhone (physical). |
| `REM-018` | MARK COMPLETE a reminder before it fires — it does NOT deliver | **P0** | 🟠 High | iPhone (physical). |
| `REM-019` | REOPEN a completed reminder restores it to the active list | **P2** | 🟢 Low | iPhone (physical), web. |
| `REM-020` | DELETE a reminder before it fires — it is removed and does NOT deliver | **P0** | 🔴 Blocker | iPhone (physical), web. |
| `REM-021` | OneSignal remote push still works alongside local reminders (no regression) | **P1** | 🟠 High | iPhone (physical). |
| `REM-022` | Web/Android reminder create + display works via the server fallback path | **P1** | 🟠 High | Desktop/mobile web browser; Android build. |
| `REM-023` | Denied notification permission degrades gracefully (no crash, no schedule) | **P2** | 🟡 Medium | iPhone (physical). |


#### ☐ `REM-001` — Grant notification permission on first open of the reminders screen (iOS)
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone (physical device, TestFlight/App Store build). Not the simulator — local notifications are only partially supported there.

- **Preconditions:** Fresh install (or notifications previously reset for the RemyNest app in iOS Settings). Logged in with email/password. Network available.
- **Steps:**
  1. Open the RemyNest iOS app and sign in with your email and password.
  2. Navigate to the Reminders screen (Reminder Center) for the first time on this install.
  3. Observe the iOS system permission dialog.
  4. Tap 'Allow' on the iOS 'RemyNest Would Like to Send You Notifications' prompt.
  5. Open iOS Settings > Notifications > RemyNest and confirm 'Allow Notifications' is ON.
- **Expected:** On first visit to the Reminders screen, iOS presents the notification permission prompt. After tapping Allow, RemyNest > Notifications shows Allow Notifications ON, with Lock Screen, Notification Center, and Banners enabled. The Reminder Center page renders normally with the 'Reminder Center' heading and the 'Add a reminder' collapsible section. No crash or error.
- **Pass/Fail:** PASS if the permission prompt appears on first open and the page renders normally after granting; FAIL if no prompt appears, the page errors/crashes, or permission cannot be granted.

#### ☐ `REM-002` — Create a My Nest (personal) one-time reminder and confirm it is stored and listed
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone (physical). Spot-check the create flow on Android and web as well.

- **Preconditions:** Logged in. Notification permission already granted (REM-001). Currently in the My Nest / Personal workspace (not inside a care profile).
- **Steps:**
  1. From the My Nest workspace, open the Reminders screen.
  2. Tap 'Add a reminder' to expand the form.
  3. In the title field (placeholder 'Take medicine every Tuesday at 2PM...'), type a recognizable title, e.g. 'My Nest test reminder'.
  4. Set the date/time to about 3 minutes in the future (must be more than 1 minute ahead).
  5. Leave 'Recurring reminder' unchecked.
  6. Tap 'Create Reminder'.
  7. Observe the page after it reloads.
- **Expected:** After tapping Create Reminder the page reloads and the new reminder appears in the Reminder Center. The 'Add a reminder' form is reset/collapsed and empty (title cleared, no stale date). The reminder shows its title and a 'Scheduled' state chip, and the time is shown in your local timezone. If it is the soonest item it appears under 'Today's Focus' as 'Next up'.
- **Pass/Fail:** PASS if the reminder is created, listed with the correct local time and 'Scheduled' chip, and the form resets; FAIL if creation errors, the reminder does not appear, the time is wrong, or the form keeps the previous title/date.

#### ☐ `REM-003` — My Nest one-time reminder DELIVERS while the app is in the FOREGROUND (app open)
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone (physical).

- **Preconditions:** REM-002 reminder created ~3 minutes out. Notification permission granted. Device unlocked.
- **Steps:**
  1. Keep the RemyNest app open and in the foreground on the Reminders screen (do not background or lock).
  2. Wait until the reminder's scheduled time arrives.
  3. Observe the top of the screen at the fire time.
- **Expected:** At the scheduled time a notification banner slides down from the top WHILE the app is open, titled 'RemyNest Reminder' with the body showing the reminder's title (e.g. 'My Nest test reminder'), plays the notification sound, and an entry is added to Notification Center. This is the AppDelegate willPresent fix returning [.banner,.list,.sound,.badge] for local triggers.
- **Pass/Fail:** PASS if the banner + sound appear while the app is in the foreground; FAIL if nothing appears, only a silent badge appears, or there is no banner while the app is open (the pre-fix regression).

#### ☐ `REM-004` — One-time reminder DELIVERS while the app is BACKGROUNDED (not quit)
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone (physical).

- **Preconditions:** Create a fresh My Nest one-time reminder ~3 minutes out (per REM-002). Permission granted. Device unlocked.
- **Steps:**
  1. After creating the reminder, swipe up (or press Home) to send RemyNest to the background, leaving it running.
  2. Use another app or the Home Screen so RemyNest is not in the foreground.
  3. Wait until the reminder's scheduled time.
  4. Observe the device.
- **Expected:** At the scheduled time a notification banner titled 'RemyNest Reminder' with the reminder title as the body appears as a heads-up banner over the current app / Home Screen, plays sound, and lands in Notification Center — even though RemyNest is backgrounded.
- **Pass/Fail:** PASS if the notification fires while the app is backgrounded; FAIL if no notification fires.

#### ☐ `REM-005` — One-time reminder DELIVERS while the phone is LOCKED
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone (physical).

- **Preconditions:** Create a fresh My Nest one-time reminder ~3 minutes out. Permission granted.
- **Steps:**
  1. After creating the reminder, press the side button to LOCK the phone (screen off / lock screen).
  2. Leave the phone locked.
  3. Wait until the reminder's scheduled time.
  4. Wake the phone (do not unlock) and look at the lock screen.
- **Expected:** At the scheduled time the notification appears on the LOCK SCREEN titled 'RemyNest Reminder' with the reminder title as the body, plays sound/vibration per the ringer setting. Tapping/opening it takes you into the app.
- **Pass/Fail:** PASS if the notification shows on the lock screen at the right time; FAIL if no lock-screen notification appears.

#### ☐ `REM-006` — One-time reminder DELIVERS while the app is fully QUIT (force-closed)
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone (physical).

- **Preconditions:** Create a fresh My Nest one-time reminder ~3 minutes out. Permission granted.
- **Steps:**
  1. After creating the reminder, open the iOS App Switcher and swipe RemyNest UP to fully quit it.
  2. Confirm RemyNest is not running.
  3. Wait until the reminder's scheduled time.
  4. Observe the device.
- **Expected:** The notification still fires at the scheduled time even though the app is fully quit, because iOS holds the on-device schedule. Banner titled 'RemyNest Reminder' with the reminder title, with sound and a Notification Center entry.
- **Pass/Fail:** PASS if the notification fires while the app is fully quit; FAIL if nothing fires.

#### ☐ `REM-007` — One-time reminder DELIVERS OFFLINE (airplane mode, no network)
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone (physical). This offline path is iOS-only; web/Android use the online server cron and are out of scope for this offline test.

- **Preconditions:** Create a fresh My Nest one-time reminder ~3 minutes out while online (so it schedules on-device). Permission granted.
- **Steps:**
  1. After the reminder is created and the Reminders screen has loaded (so reconcile has run on-device), enable Airplane Mode (turn off Wi-Fi and cellular).
  2. Confirm there is no network connectivity.
  3. Background or lock the app.
  4. Wait until the reminder's scheduled time.
  5. Observe the device while still offline.
- **Expected:** The notification still fires at the scheduled time with NO network, because delivery is fully on-device (UNUserNotificationCenter) with no dependency on OneSignal, APNs, or the server cron. Banner 'RemyNest Reminder' with the reminder title and sound.
- **Pass/Fail:** PASS if the notification fires while in airplane mode; FAIL if it does not fire offline.

#### ☐ `REM-008` — Reminder schedule SURVIVES a device reboot
**P1** · 🟠 **High** if fail · _Devices:_ iPhone (physical).

- **Preconditions:** Create a My Nest one-time reminder ~5-6 minutes out (enough lead to reboot). Permission granted.
- **Steps:**
  1. After creating the reminder and letting the Reminders screen load, power the iPhone fully OFF and back ON.
  2. Do NOT reopen the RemyNest app after rebooting.
  3. Wait until the reminder's scheduled time.
  4. Observe the device.
- **Expected:** The notification still fires at the scheduled time after a reboot without reopening the app, because iOS persists scheduled local notifications across restarts.
- **Pass/Fail:** PASS if the notification fires after a reboot with the app unopened; FAIL if it does not fire.

#### ☐ `REM-009` — Create a CARE-PROFILE reminder and confirm it is stored, scoped, and listed
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone (physical). Spot-check on web and Android.

- **Preconditions:** Logged in. At least one care profile exists that you own or have caregiver access to. Permission granted.
- **Steps:**
  1. Open the workspace drawer in the header and switch into a care profile (e.g. the cared-for person).
  2. Open the Reminders screen for that care workspace.
  3. Expand 'Add a reminder', enter a title like 'Care profile test reminder', and set the time ~3 minutes out.
  4. Tap 'Create Reminder'.
  5. Confirm the new reminder appears.
  6. Scroll to the bottom and confirm the caregiver framing line is shown.
- **Expected:** The reminder is created under the active care profile and appears in that profile's Reminder Center with a 'Scheduled' chip and the correct local time. A line at the bottom reads "You're viewing the care reminders for <care profile name>." The reminder is associated with the care profile (memory_profile_id), not My Nest.
- **Pass/Fail:** PASS if the care reminder is created, listed, and the caregiver framing line shows the correct profile name; FAIL if creation errors, the reminder does not appear, or it leaks into the wrong workspace.

#### ☐ `REM-010` — Care-profile reminder DELIVERS on-device (lock + background)
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone (physical).

- **Preconditions:** REM-009 care reminder created ~3 minutes out while the care workspace's Reminders screen was open (so it scheduled). Permission granted.
- **Steps:**
  1. With the care reminder created and the care Reminders screen loaded, lock the phone (or background the app).
  2. Wait until the scheduled time.
  3. Observe the lock screen / banner.
- **Expected:** The care-profile reminder fires on-device exactly like a My Nest reminder: banner titled 'RemyNest Reminder' with the reminder's title as the body, on the lock screen / over the foreground app, with sound. Care reminders use the same on-device NativeReminderSync path.
- **Pass/Fail:** PASS if the care reminder delivers on lock/background; FAIL if it does not fire.

#### ☐ `REM-011` — Workspace isolation — My Nest and care reminders do not cross-contaminate
**P1** · 🟠 **High** if fail · _Devices:_ iPhone (physical), web.

- **Preconditions:** At least one My Nest reminder and one care-profile reminder exist with distinct titles. Logged in.
- **Steps:**
  1. Open the Reminders screen in the My Nest / Personal workspace and note which reminders are listed.
  2. Switch into the care profile via the workspace drawer and open the Reminders screen.
  3. Compare the two lists.
- **Expected:** The My Nest Reminders screen shows ONLY personal (null-profile) reminders owned by you; the care Reminders screen shows ONLY that care profile's reminders. The two distinct titles do not appear in the other workspace. No reminder leaks across workspaces.
- **Pass/Fail:** PASS if each workspace shows only its own reminders; FAIL if a reminder appears in the wrong workspace.

#### ☐ `REM-012` — Add Reminder form RESETS after a successful create
**P1** · 🟡 **Medium** if fail · _Devices:_ iPhone (physical), web.

- **Preconditions:** Logged in. On any Reminders screen.
- **Steps:**
  1. Expand 'Add a reminder' and enter a title and a future date/time.
  2. Optionally check 'Recurring reminder' and pick a frequency.
  3. Tap 'Create Reminder'.
  4. After the page reloads, expand 'Add a reminder' again and inspect the fields.
- **Expected:** After a successful create the form is reset: the title field is empty (placeholder 'Take medicine every Tuesday at 2PM...' shown), the date field is cleared, and the recurring controls return to defaults (unchecked, frequency 'Daily'). The previously entered title/date/recurrence are NOT retained.
- **Pass/Fail:** PASS if all fields reset to empty/defaults after create; FAIL if the form retains the prior title, date, or recurrence.

#### ☐ `REM-013` — Add Reminder form RESETS after switching workspaces
**P2** · 🟢 **Low** if fail · _Devices:_ iPhone (physical), web.

- **Preconditions:** Logged in. Access to both My Nest and a care profile.
- **Steps:**
  1. On the My Nest Reminders screen, expand 'Add a reminder' and type a title and date but do NOT submit.
  2. Switch to a care profile via the workspace drawer.
  3. Open the care profile's Reminders screen and expand 'Add a reminder'.
  4. Inspect the form fields.
- **Expected:** After switching workspaces the Add a reminder form is reset (empty title, cleared date, default recurrence) — the unsaved My Nest draft does not carry over into the care workspace's form.
- **Pass/Fail:** PASS if the form is empty after the workspace switch; FAIL if the prior draft title/date persists.

#### ☐ `REM-014` — Create a DAILY recurring reminder and confirm it fires daily at the same local time
**P0** · 🟠 **High** if fail · _Devices:_ iPhone (physical).

- **Preconditions:** Logged in, permission granted. Best run with a time a few minutes out so it can be observed today, then re-observed the next day.
- **Steps:**
  1. Expand 'Add a reminder', enter a title like 'Daily meds', set a time ~3 minutes out.
  2. Check 'Recurring reminder' and select 'Daily' from the frequency dropdown.
  3. Tap 'Create Reminder'.
  4. Confirm the reminder appears under 'Daily Routines' with the line '↻ Repeats daily'.
  5. Wait for the first fire time (lock or background the app) and confirm it delivers.
  6. On the NEXT day at the same local time, confirm it fires again.
- **Expected:** The reminder is listed under 'Daily Routines' showing '↻ Repeats daily'. It fires at the chosen local time on day one, and again at the same local time the next day (calendar trigger repeats). It is NOT removed after firing.
- **Pass/Fail:** PASS if it appears under Daily Routines, fires on day one, and fires again the next day at the same local time; FAIL if it does not repeat or fires at the wrong time.

#### ☐ `REM-015` — Create a WEEKLY recurring reminder on the correct weekday
**P1** · 🟠 **High** if fail · _Devices:_ iPhone (physical).

- **Preconditions:** Logged in, permission granted.
- **Steps:**
  1. Expand 'Add a reminder', enter a title like 'Weekly check-in'.
  2. Set the date to today's weekday at a time a few minutes out.
  3. Check 'Recurring reminder' and select 'Weekly'.
  4. Tap 'Create Reminder'.
  5. Confirm it appears under 'Daily Routines' with '↻ Repeats weekly'.
  6. Confirm it fires today at the set time.
- **Expected:** The reminder lists under Daily Routines with '↻ Repeats weekly', fires today at the set local time, and is scheduled to repeat on the same weekday each week (iOS weekday mapping derived from the chosen date in local time).
- **Pass/Fail:** PASS if it lists as weekly and fires on the correct weekday/time; FAIL if it fires on the wrong day or does not repeat.

#### ☐ `REM-016` — Create a MONTHLY recurring reminder; day 29-31 clamps to the 28th
**P2** · 🟡 **Medium** if fail · _Devices:_ iPhone (physical).

- **Preconditions:** Logged in, permission granted. This is a configuration/scheduling sanity check (full month-over-month observation is impractical in one session).
- **Steps:**
  1. Expand 'Add a reminder', enter a title like 'Monthly bill'.
  2. Set the date to the 31st (or 29th/30th) of a month at a chosen time.
  3. Check 'Recurring reminder' and select 'Monthly'.
  4. Tap 'Create Reminder'.
  5. Confirm it appears under 'Daily Routines' with '↻ Repeats monthly'.
- **Expected:** The reminder is created and listed under Daily Routines as '↻ Repeats monthly'. Per the scheduling logic, a day of 29-31 is clamped to the 28th so the monthly reminder fires in EVERY month (including short months like February) rather than being skipped.
- **Pass/Fail:** PASS if the monthly reminder is created and listed as repeating monthly; FAIL if creation errors or it is not listed as monthly. (Cross-month firing is a known design behavior, not separately observable in one session.)

#### ☐ `REM-017` — EDIT/replace a reminder's time — old fire is cancelled, new time fires
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone (physical).

- **Preconditions:** Logged in, permission granted. Note: the UI has no in-place edit; 'changing' a one-time reminder is done by deleting and recreating, or by toggling complete/reopen. Test the reschedule-by-replacement behavior.
- **Steps:**
  1. Create a one-time reminder ('Edit test A') set ~3 minutes out and let the Reminders screen load.
  2. Delete that reminder using its 'Delete' button.
  3. Immediately create a new reminder ('Edit test B') at a DIFFERENT future time ~3 minutes out.
  4. Wait through the original 'Edit test A' time and confirm nothing fires for it.
  5. Wait until 'Edit test B' time and confirm it fires.
- **Expected:** The replaced/old reminder does NOT fire at its original time (its on-device notification is cancelled on reconcile because its id is no longer in the desired set), and only the new reminder fires at the new time. No duplicate or stale notification.
- **Pass/Fail:** PASS if only the new reminder fires and the old one does not; FAIL if the old reminder still fires or a duplicate appears.

#### ☐ `REM-018` — MARK COMPLETE a reminder before it fires — it does NOT deliver
**P0** · 🟠 **High** if fail · _Devices:_ iPhone (physical).

- **Preconditions:** Logged in, permission granted.
- **Steps:**
  1. Create a one-time reminder ('Complete test') ~3 minutes out and let the Reminders screen load.
  2. On its card, tap 'Mark complete'.
  3. Confirm it moves to the 'Completed' section with a 'Completed' chip and the button now reads 'Reopen'.
  4. Wait past its original scheduled time.
  5. Observe the device (lock/background).
- **Expected:** After tapping 'Mark complete' the reminder moves to the Completed section (chip 'Completed', button 'Reopen'), and it does NOT fire a notification at its scheduled time, because completed reminders are cancelled on reconcile (isSchedulable returns false for completed).
- **Pass/Fail:** PASS if the completed reminder does not fire; FAIL if it still delivers a notification after being marked complete.

#### ☐ `REM-019` — REOPEN a completed reminder restores it to the active list
**P2** · 🟢 **Low** if fail · _Devices:_ iPhone (physical), web.

- **Preconditions:** A completed reminder exists (from REM-018). Logged in.
- **Steps:**
  1. In the 'Completed' section, find the completed reminder and tap 'Reopen'.
  2. Observe the list after the page reloads.
- **Expected:** The reminder moves back out of Completed into the active sections (Today's Focus / Upcoming / Daily Routines as appropriate) with a 'Scheduled' chip and the button reads 'Mark complete' again. (If its original time has already passed and it is one-time, it appears as 'Overdue' rather than rescheduling a past notification.)
- **Pass/Fail:** PASS if reopening returns the reminder to the active list with the 'Scheduled'/Overdue state; FAIL if it stays in Completed or errors.

#### ☐ `REM-020` — DELETE a reminder before it fires — it is removed and does NOT deliver
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone (physical), web.

- **Preconditions:** Logged in, permission granted.
- **Steps:**
  1. Create a one-time reminder ('Delete test') ~3 minutes out and let the Reminders screen load.
  2. On its card, tap 'Delete'.
  3. Confirm it disappears from the list immediately after the reload.
  4. Wait past its original scheduled time (lock or background the app).
  5. Observe the device.
- **Expected:** The reminder is removed from the Reminder Center and does NOT fire any notification at its original time, because the deleted reminder's on-device notification is cancelled on the next reconcile (its id is no longer in the desired set).
- **Pass/Fail:** PASS if the deleted reminder is gone from the list and never fires; FAIL if it remains listed or still delivers a notification.

#### ☐ `REM-021` — OneSignal remote push still works alongside local reminders (no regression)
**P1** · 🟠 **High** if fail · _Devices:_ iPhone (physical).

- **Preconditions:** Logged in on iOS with OneSignal push permission granted. A way to trigger a non-reminder push (e.g. a shared-memory alert / account event) is available.
- **Steps:**
  1. Confirm at least one local reminder is scheduled on the device.
  2. Trigger (or have an operator trigger) a non-reminder OneSignal push such as a shared-memory or account notification.
  3. Observe that the OneSignal push arrives.
  4. Separately confirm a local reminder still fires on its own schedule.
- **Expected:** OneSignal remote pushes (shared memories, AI updates, collaboration, account events) still arrive normally; they coexist with on-device local reminders. Remote pushes follow OneSignal's own foreground handling (willPresent returns [] for remote UNPushNotificationTrigger), and local reminders use the banner path — neither breaks the other.
- **Pass/Fail:** PASS if both OneSignal pushes and local reminders deliver independently; FAIL if enabling/using one suppresses the other.

#### ☐ `REM-022` — Web/Android reminder create + display works via the server fallback path
**P1** · 🟠 **High** if fail · _Devices:_ Desktop/mobile web browser; Android build.

- **Preconditions:** Logged in on the web app (browser) and/or the Android build.
- **Steps:**
  1. On web (www.remynest.com) or Android, open the Reminders screen.
  2. Create a reminder with a future time and (optionally) a recurrence.
  3. Confirm it appears in the Reminder Center with the correct LOCAL time.
  4. Confirm no JavaScript error/crash occurs (the on-device sync is a no-op off native iOS).
- **Expected:** Reminder create/list/complete/delete all work on web and Android with no errors. Reminders display in the browser's local timezone. On these platforms the on-device local-notification engine is a no-op; delivery relies on the existing server cron + OneSignal path (the hybrid fallback), so do NOT expect the offline/device-local guarantees from the iOS tests here.
- **Pass/Fail:** PASS if reminders create and display correctly with no errors on web/Android; FAIL if the page errors or reminders cannot be created/listed.

#### ☐ `REM-023` — Denied notification permission degrades gracefully (no crash, no schedule)
**P2** · 🟡 **Medium** if fail · _Devices:_ iPhone (physical).

- **Preconditions:** iOS device where notification permission for RemyNest is set to OFF (deny at the prompt, or disable in iOS Settings > Notifications > RemyNest).
- **Steps:**
  1. With notifications denied/off for RemyNest, open the Reminders screen.
  2. Create a reminder a few minutes out.
  3. Confirm the reminder still saves and lists in the Reminder Center.
  4. Wait past the scheduled time and confirm no notification appears (expected, since permission is off).
  5. Confirm the app does not crash or show an error.
- **Expected:** Reminder creation and the Reminder Center still work with notifications denied — the reminder saves and is listed. No notification fires (permission off), and the app does not crash. Re-granting permission and reopening the Reminders screen will resume on-device scheduling.
- **Pass/Fail:** PASS if reminders still save/list and the app is stable with permission denied; FAIL if the app crashes, errors, or the reminders screen breaks when permission is off.

**Device notes:**
- Run all delivery tests (foreground/background/lock/quit/offline/reboot) on a PHYSICAL iPhone via the TestFlight or App Store build — the iOS Simulator only partially supports local notifications and is not a valid environment for these tests.
- On-device local reminders are iOS-only. On web and Android the on-device engine is a no-op; those platforms rely on the existing server cron + OneSignal path, so the offline/device-local/quit/reboot guarantees do NOT apply there (cover create/display only on web/Android).
- First open of the Reminders screen triggers the iOS notification permission prompt; grant it before running any delivery test. If a device previously denied, reset via iOS Settings > Notifications > RemyNest.
- One-time reminders must be set MORE THAN ~1 minute in the future (60-second scheduling lead) or they will be silently skipped on iOS. Use ~2-3 minutes out for one-time delivery tests.
- Banner title is always the literal 'RemyNest Reminder'; the reminder's own title appears as the notification body. Don't mistake 'RemyNest Reminder' for a missing title.
- Reminder times are stored in UTC and displayed in the device/browser LOCAL timezone; the displayed time should match the local fire time. To sanity-check timezone handling, optionally repeat a delivery test after changing the device timezone.
- These are REGRESSION tests against a FROZEN, operator-validated system (TestFlight Build 8 passed lock/background/foreground). Any FAIL indicates a NEW defect and should be filed as a regression with the build number, device model, iOS version, and exact reminder time.

**Known limitations (expected behavior — not a FAIL):**
- The Reminders UI has no in-place EDIT for an existing reminder — changing a reminder is done by delete + recreate (or complete/reopen). The 'edit' regression (REM-017) therefore validates reschedule-by-replacement, which is the supported flow.
- Monthly recurring reminders set for the 29th-31st are intentionally clamped to fire on the 28th so they fire in EVERY month (iOS would otherwise skip short months). This is expected behavior, not a bug.
- Cross-month firing of monthly reminders and multi-week firing of weekly reminders cannot be fully observed in a single test session; REM-015/REM-016 verify correct scheduling/listing plus the first fire, not long-horizon repetition.
- Local-notification delivery cannot be validated on the iOS Simulator (partial support) — a physical device is required.
- iOS Focus modes, Do Not Disturb, Scheduled Summary, or a silenced/low-battery state can suppress or delay banners independent of RemyNest; verify the device is in a normal notification state before judging a delivery FAIL.
- OneSignal coexists with local notifications and owns the foreground path for REMOTE pushes; the foreground banner for LOCAL reminders depends on the AppDelegate willPresent delegate being registered before OneSignal.initialize — if a future build reorders or removes that delegate, foreground reminders go silent (the prior regression this fix addressed).
- The server cron + OneSignal fallback path for web/Android is online-only and subject to cron timing/APNs/network — it does not provide the offline guarantees of the iOS device-local path.
- The reminder lifecycle status fields (status/completed_at/priority/pinned/sent) are forward-compatible and may be no-ops until their schema migration is applied; the 'Awaiting confirmation' chip and Priority/Pinned sections may not appear in the current build.

## 1.3 Care profiles + workspace switching

> **Grounding (real implementation):** Grounded in WorkspaceSelector.tsx, CreateProfileForm.tsx, AddPersonButton.tsx, profiles/page.tsx, lib/active-profile.ts, lib/context-resolver.ts, lib/profile-access.ts, reminders/page.tsx, and the CLAUDE.md Workspace-navigation + Direct-to-Storage notes. The drawer lists only CARE profiles (My Nest row retired); switching calls setActiveProfile then closes the sheet immediately; the overlay is portaled to document.body to avoid the iOS backdrop-filter status-bar fragment leak. My Nest lives in the profile dropdown (setPersonalWorkspace, navigates to /home). …


| ID | Title | Pri | If fail | Devices |
|---|---|---|---|---|
| `CPW-01` | Create a care profile via Add a person in the workspace drawer | **P0** | 🔴 Blocker | iPhone (TestFlight), Android, desktop web |
| `CPW-02` | Create a care profile from the /profiles empty state | **P1** | 🟠 High | iPhone (TestFlight), Android, desktop web |
| `CPW-03` | Switch into a care profile via the workspace drawer | **P0** | 🔴 Blocker | iPhone (TestFlight), Android, desktop web |
| `CPW-04` | Return to My Nest via the profile dropdown not the drawer | **P0** | 🔴 Blocker | iPhone (TestFlight), Android, desktop web |
| `CPW-05` | Upload a memory into a care profile and confirm it lands there | **P0** | 🔴 Blocker | iPhone (TestFlight), Android |
| `CPW-06` | Create a reminder in a care profile and confirm scoping | **P0** | 🔴 Blocker | iPhone (TestFlight), Android |
| `CPW-07` | Isolation: a My Nest memory must not appear in a care profile and vice-versa | **P0** | 🔴 Blocker | iPhone (TestFlight), Android, desktop web |
| `CPW-08` | Isolation: a My Nest reminder must not appear in a care profile and vice-versa | **P0** | 🔴 Blocker | iPhone (TestFlight), Android, desktop web |
| `CPW-09` | Cross-user isolation: another user care data must not leak | **P0** | 🔴 Blocker | iPhone (TestFlight), Android, desktop web |
| `CPW-10` | Workspace drawer overlay is full-screen with no status-bar fragment leak on iOS | **P1** | 🟠 High | iPhone (TestFlight) primary; spot-check Android + desktop |
| `CPW-11` | Care-profile limit reached opens the Upgrade modal not an error | **P2** | 🟡 Medium | iPhone (TestFlight) for native gating, desktop web for the upgrade path |
| `CPW-12` | Active workspace persists across app relaunch | **P1** | 🟡 Medium | iPhone (TestFlight), Android, desktop web |


#### ☐ `CPW-01` — Create a care profile via Add a person in the workspace drawer
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone (TestFlight), Android, desktop web

- **Preconditions:** Logged in with an email/password account, under the care-profile plan limit.
- **Steps:**
  1. Tap the workspace selector button in the top bar.
  2. Tap Manage care profiles to expand it.
  3. Type a name into Their name (e.g. Grandma Mary).
  4. Optionally fill Preferred Name and Date of Birth.
  5. Tap Add Person.
- **Expected:** Button shows Adding while saving, a toast Person added appears, the drawer closes automatically, and the new person appears in the drawer and on the /profiles People list.
- **Pass/Fail:** PASS if created, toast shows, drawer closes, and profile appears; FAIL if the form errors, no toast, drawer stuck, or profile missing.

#### ☐ `CPW-02` — Create a care profile from the /profiles empty state
**P1** · 🟠 **High** if fail · _Devices:_ iPhone (TestFlight), Android, desktop web

- **Preconditions:** Logged in with an account that has no care profiles yet.
- **Steps:**
  1. Navigate to the People page (/profiles).
  2. Confirm the empty state reads No people yet with an Add a Person button.
  3. Tap Add a Person.
  4. Enter a name in Their name and tap Add Person.
  5. Re-open the modal and tap Cancel to confirm dismissal.
- **Expected:** The modal opens, the person saves with a Person added toast, the modal closes, and the new row replaces the empty state. Cancel dismisses with no change.
- **Pass/Fail:** PASS if empty state, modal, save, toast, refresh, and Cancel all work; FAIL if the button is missing, modal will not open/close, or save does not persist.

#### ☐ `CPW-03` — Switch into a care profile via the workspace drawer
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone (TestFlight), Android, desktop web

- **Preconditions:** Logged in with at least one care profile, currently in My Nest.
- **Steps:**
  1. Confirm the selector button reads My Nest.
  2. Tap it to open the drawer.
  3. Confirm the header reads Workspace and lists care profiles by name (no My Nest row here).
  4. Tap a care profile row.
- **Expected:** The drawer closes immediately, the selector label changes from My Nest to the care profile name, and the app refreshes into that care workspace. Re-opening the drawer shows a sage check on the active row.
- **Pass/Fail:** PASS if the drawer closes promptly, label updates, and the active profile shows a check; FAIL if the drawer locks, label unchanged, or no check.

#### ☐ `CPW-04` — Return to My Nest via the profile dropdown not the drawer
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone (TestFlight), Android, desktop web

- **Preconditions:** Logged in and inside a care profile workspace.
- **Steps:**
  1. Open the workspace drawer and confirm there is no My Nest row. Close it.
  2. Open the profile/account dropdown (ProfileHub).
  3. Tap the My Nest entry.
- **Expected:** The drawer never offers My Nest. The My Nest entry in the dropdown closes the menu, switches to the personal workspace, and navigates to /home. The selector now reads My Nest.
- **Pass/Fail:** PASS if My Nest is absent from the drawer, present in the dropdown, and selecting it lands on /home reading My Nest; FAIL if a My Nest row appears in the drawer, the entry is missing, or it does not switch/land on /home.

#### ☐ `CPW-05` — Upload a memory into a care profile and confirm it lands there
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone (TestFlight), Android

- **Preconditions:** Logged in, switched into a care profile, with a photo on device.
- **Steps:**
  1. Confirm the selector reads the care profile name.
  2. Open the memory creation flow, add a title/text plus a photo.
  3. Save the memory.
  4. Open it and confirm the photo loads, then switch to My Nest and confirm it is absent.
- **Expected:** The memory saves and appears in this care profile feed (memory_profile_id = the care profile id), the photo loads via its signed URL, and it is not visible in My Nest.
- **Pass/Fail:** PASS if it saves, appears in the care feed, the photo loads, and it is absent from My Nest; FAIL if the save fails, it appears in the wrong workspace, or the image fails to load.

#### ☐ `CPW-06` — Create a reminder in a care profile and confirm scoping
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone (TestFlight), Android

- **Preconditions:** Logged in, switched into a care profile.
- **Steps:**
  1. Confirm the selector reads the care profile name.
  2. Navigate to the Reminders page.
  3. Confirm the dashboard shows the care/caregiver framing for that profile.
  4. Create a reminder (title + date/time) and confirm it appears in this profile reminder list.
- **Expected:** The reminder is created and appears in the care profile reminder list (memory_profile_id = the care profile id), the dashboard reflects the care context, and the Add Reminder form resets after creation.
- **Pass/Fail:** PASS if it saves into the care profile, shows in that list, and the form resets; FAIL if it does not save, appears in the wrong workspace, or the form does not reset.

#### ☐ `CPW-07` — Isolation: a My Nest memory must not appear in a care profile and vice-versa
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone (TestFlight), Android, desktop web

- **Preconditions:** Logged in, with a memory in My Nest and one in a care profile.
- **Steps:**
  1. In My Nest note a distinctive memory (My Nest Test Memory).
  2. Switch into the care profile via the drawer.
  3. Browse the care feed and search and confirm My Nest Test Memory is absent.
  4. Note a distinctive care memory (Care Test Memory).
  5. Switch back to My Nest and confirm Care Test Memory is absent and My Nest Test Memory is present.
- **Expected:** My Nest memories (memory_profile_id IS NULL) are invisible inside any care profile, and care memories are invisible in My Nest. Each workspace shows only its own items in feed and search.
- **Pass/Fail:** PASS if no memory crosses in either direction; FAIL if any My Nest item appears in a care profile or any care item appears in My Nest.

#### ☐ `CPW-08` — Isolation: a My Nest reminder must not appear in a care profile and vice-versa
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone (TestFlight), Android, desktop web

- **Preconditions:** Logged in, with a reminder in My Nest and one in a care profile.
- **Steps:**
  1. In My Nest on Reminders note a distinctive reminder (My Nest Reminder).
  2. Switch into the care profile and confirm My Nest Reminder is absent on Reminders.
  3. Note a distinctive care reminder (Care Reminder).
  4. Switch back to My Nest and confirm Care Reminder is absent and My Nest Reminder is present.
- **Expected:** My Nest reminders (memory_profile_id IS NULL + user_id) are invisible inside the care profile, and care reminders are invisible in My Nest.
- **Pass/Fail:** PASS if reminders never cross in either direction; FAIL if any reminder appears under the wrong workspace.

#### ☐ `CPW-09` — Cross-user isolation: another user care data must not leak
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone (TestFlight), Android, desktop web

- **Preconditions:** Two accounts (User A and User B), each with a care profile the other is not invited to.
- **Steps:**
  1. Log in as User A and note A care profiles plus a distinctive memory and reminder.
  2. Log out and log in as User B.
  3. Open the workspace drawer and confirm none of A care profiles are listed.
  4. Confirm A memory and reminder are nowhere in B feed, search, or reminders.
  5. Confirm a deep link to A profile id does not expose A data.
- **Expected:** User B drawer lists only B owned profiles plus those explicitly shared with B. None of User A private profiles, memories, or reminders are visible to B, and a deep link to A profile id does not switch B into it or expose data.
- **Pass/Fail:** PASS if B sees none of A unshared profiles, memories, or reminders and cannot reach them by deep link; FAIL if any of A care data, names, or media is visible to B.

#### ☐ `CPW-10` — Workspace drawer overlay is full-screen with no status-bar fragment leak on iOS
**P1** · 🟠 **High** if fail · _Devices:_ iPhone (TestFlight) primary; spot-check Android + desktop

- **Preconditions:** iPhone (TestFlight), logged in, on the Home/My Nest screen with the blurred header present.
- **Steps:**
  1. Open the workspace drawer.
  2. Inspect the status-bar area while open.
  3. Expand Manage care profiles.
  4. Close via the dimmed backdrop, then re-open and close with the close button, then scroll the page.
- **Expected:** The overlay covers the full viewport with a dimmed backdrop; no Manage care profiles / Create profile / Add a person fragments leak under the status bar. Backdrop and close button both close cleanly, and the page scrolls after close.
- **Pass/Fail:** PASS if full-screen with no leaked fragments and scrolling works after close; FAIL if a fragment appears under the status bar, close fails, or scrolling stays locked.

#### ☐ `CPW-11` — Care-profile limit reached opens the Upgrade modal not an error
**P2** · 🟡 **Medium** if fail · _Devices:_ iPhone (TestFlight) for native gating, desktop web for the upgrade path

- **Preconditions:** An account already at its care-profile limit for its plan.
- **Steps:**
  1. Open the drawer, expand Manage care profiles, enter a name under Add a person.
  2. Tap Add Person and observe.
- **Expected:** Instead of a red error, the Upgrade modal opens (care-profile limit) showing the current plan and limit. On native iOS it shows a neutral premium state with no Stripe/web-checkout/subscribe link; web may offer the upgrade path.
- **Pass/Fail:** PASS if hitting the limit opens the Upgrade modal and native shows no external purchase link; FAIL if it shows a generic error, silently fails, or native surfaces a checkout/subscribe link.

#### ☐ `CPW-12` — Active workspace persists across app relaunch
**P1** · 🟡 **Medium** if fail · _Devices:_ iPhone (TestFlight), Android, desktop web

- **Preconditions:** Logged in with at least one care profile.
- **Steps:**
  1. Switch into a care profile via the drawer.
  2. Fully close the app (swipe-kill) or hard-refresh on web.
  3. Re-open the app and observe the selector label and which data loads.
- **Expected:** The app re-opens in the same care profile (the remynest-active-context cookie persists CARE), the selector still reads the care profile name, and that data loads. My Nest likewise persists.
- **Pass/Fail:** PASS if the active workspace persists across relaunch for both CARE and My Nest; FAIL if it resets or loses the context.

**Device notes:**
- Primary device is the iPhone via TestFlight; the app is the live www.remynest.com site loaded in a remote-URL Capacitor iOS WebView, so behavior depends on the deployed site, not a bundled build.
- iOS WebKit: the drawer overlay is portaled to document.body because the blurred backdrop-blur-md header would otherwise re-root a fixed overlay and leak fragments under the status bar (verify on iOS, CPW-10).
- Run isolation tests CPW-07, CPW-08, CPW-09 on iPhone plus a second context (Android or a second account/device).
- Auth is email/password only (no Apple/Google sign-in); CPW-09 needs two distinct email/password accounts.
- Switching closes the drawer immediately and refreshes in the background; over cellular the refresh may lag but the drawer must still close instantly.

**Known limitations (expected behavior — not a FAIL):**
- My Nest is a workspace state, not a page; there is no dedicated My Nest route (home is /home), no My Nest row in the drawer (retired), and only the single ProfileHub My Nest entry.
- Media uploads are direct-to-storage with server-generated owner-scoped paths (users/{userId}/); orphan objects uploaded but never attached are a known follow-up, not ledger-counted, no sweeper yet, out of scope here.
- Reminder creation, scheduling, delivery, and the form-reset are frozen and operator-validated (TestFlight Build 8 passed lock screen, background, foreground); CPW-06 and CPW-08 cover workspace scoping, not delivery.
- Supabase image transforms (thumbnails) are gated behind Pro plan plus MEMORY_IMAGE_TRANSFORMS_ENABLED=true and default off; with transforms off, images serve as untransformed originals.
- Care-profile limits depend on the account billing plan (FREE, PREMIUM, FAMILY); CPW-11 only triggers when the account is actually at its limit.

## 1.4 Search

> **Grounding (real implementation):** Grounded in the real code paths. Search UI lives on the Memories page (app/(app)/memories/page.tsx): a single input with placeholder "Search memories...", a black "Search" button, debounced 400ms, also triggered immediately on Enter. Typing calls POST /api/memories/search with { query, profileId, workspaceType }, but the SERVER (app/api/memories/search/route.ts) ignores the client profile and re-derives the active workspace via resolveActiveProfileId() (NULL = My Nest, a profile id = that care profile). …


| ID | Title | Pri | If fail | Devices |
|---|---|---|---|---|
| `SRCH-P0-01` | Keyword/semantic search returns scoped results for an existing memory (Premium) | **P0** | 🔴 Blocker | iPhone (TestFlight) and one Android device |
| `SRCH-P0-02` | Natural-language semantic search via Remy Ask returns a grounded answer (Premium) | **P0** | 🔴 Blocker | iPhone (TestFlight) and one Android device |
| `SRCH-P0-03` | Profile/workspace scoping — search results stay inside the active workspace | **P0** | 🔴 Blocker | iPhone (TestFlight) and one Android device |
| `SRCH-P1-01` | Deferred enrichment timing — a brand-new memory becomes semantically searchable after a short delay | **P1** | 🟠 High | iPhone (TestFlight) and one Android device |
| `SRCH-P1-02` | Mixed-media memory (photos + video) surfaces in search with media rendered | **P1** | 🟠 High | iPhone (TestFlight) and one Android device |
| `SRCH-P1-03` | Premium gate — non-premium account sees the neutral notice on native (no purchase CTA) | **P1** | 🟠 High | iPhone native app (TestFlight) only |
| `SRCH-P2-01` | No-results state and empty-query handling | **P2** | 🟢 Low | iPhone (TestFlight) and one Android device |
| `SRCH-P2-02` | Mobile sticky search bar stays reachable while scrolling the feed | **P2** | 🟢 Low | iPhone (TestFlight, incl. a notch/Dynamic-Island model) and one Android device |


#### ☐ `SRCH-P0-01` — Keyword/semantic search returns scoped results for an existing memory (Premium)
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone (TestFlight) and one Android device

- **Preconditions:** Physical device with the RemyNest app installed (TestFlight iOS build or Android). Logged in via email/password to a PREMIUM account. At least one OLDER memory (created minutes ago, so enrichment has finished) exists in the active workspace, e.g. a memory whose content mentions 'birthday at the beach'.
- **Steps:**
  1. Open the app and tap the bottom/side nav to reach the Memories page (heading 'Your Memories').
  2. Confirm the search field shows placeholder text 'Search memories...' with a black 'Search' button beside it.
  3. Tap the search field and type a word you know appears in an existing memory (e.g. 'beach').
  4. Wait about 1 second (search auto-runs ~400ms after you stop typing) OR tap the 'Search' button / press Return.
  5. Observe the transient 'Searching memories...' line, then the results.
- **Expected:** A 'Searching memories...' line appears briefly, then a results section headed 'Search results · N found' (N >= 1) listing the matching memory/memories. The matching memory's title and content are shown and its photo/video thumbnails render (images load; videos show a play-icon tile). No unrelated workspaces' memories appear.
- **Pass/Fail:** PASS if the known memory appears under 'Search results · N found' with its media rendered; FAIL if no results appear, the matching memory is missing, results error out, or media fails to load.

#### ☐ `SRCH-P0-02` — Natural-language semantic search via Remy Ask returns a grounded answer (Premium)
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone (TestFlight) and one Android device

- **Preconditions:** Premium account, logged in on a physical device. At least one OLDER memory (enrichment complete) exists in the active workspace describing a real event, e.g. content about 'Grandma's apple pie at Thanksgiving'.
- **Steps:**
  1. From Home, open Remy (the '/remy' companion screen, reachable via the Remy entry / avatar).
  2. Scroll to the 'Ask Remy' panel at the bottom of the screen.
  3. In the Ask Remy field, type a natural-language question that does NOT use the exact memory words, e.g. 'What desserts did we make for the holidays?'
  4. Submit (tap send / press Return).
  5. Wait for the answer to render.
- **Expected:** Remy returns a grounded answer card (sage-tinted bubble) referencing the relevant memory, followed by a line like 'Based on N memory/memories Remy found.' and an AI disclaimer footnote. The answer is derived only from your real memories (no fabricated facts).
- **Pass/Fail:** PASS if a grounded answer referencing the correct memory appears with the 'Based on N memories' line; FAIL if it answers 'I couldn't find any memories about that.' for a topic that clearly exists, fabricates content not in any memory, or errors.

#### ☐ `SRCH-P0-03` — Profile/workspace scoping — search results stay inside the active workspace
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone (TestFlight) and one Android device

- **Preconditions:** Premium account with at least TWO workspaces: My Nest (personal) AND a care profile. Each workspace contains a DISTINCT, enrichment-complete memory with a unique keyword (e.g. My Nest has 'lighthouse', the care profile has 'orchard'). Logged in on a physical device.
- **Steps:**
  1. Ensure the active workspace is My Nest (select 'My Nest' from the profile dropdown if needed).
  2. Go to Memories and search for the care-profile-only keyword ('orchard').
  3. Note the results.
  4. Open the workspace drawer (header) and switch into the care profile.
  5. Go to Memories and search for the My-Nest-only keyword ('lighthouse').
  6. Note the results.
  7. Now in the care profile, search for its own keyword ('orchard').
- **Expected:** Searching the care-only keyword while in My Nest returns 'No memories found.' (no cross-workspace leak). Searching the My-Nest-only keyword while in the care profile returns 'No memories found.' Searching the care keyword while in the care profile returns the 'orchard' memory under 'Search results · N found'. Results are always scoped to the currently active workspace only.
- **Pass/Fail:** PASS if each workspace only surfaces its own memories and the other workspace's keyword returns 'No memories found.'; FAIL if any search surfaces a memory from a different workspace.

#### ☐ `SRCH-P1-01` — Deferred enrichment timing — a brand-new memory becomes semantically searchable after a short delay
**P1** · 🟠 **High** if fail · _Devices:_ iPhone (TestFlight) and one Android device

- **Preconditions:** Premium account, logged in on a physical device. Network connectivity is good. You will create a NEW memory during this test.
- **Steps:**
  1. On the Memories page, tap '+ New Memory' and create a memory with a deliberately unusual unique phrase in the content (e.g. 'zephyr lantern picnic 1987'). Save it (toast 'Memory saved').
  2. IMMEDIATELY (within ~1-2 seconds) search for that unique phrase.
  3. Observe the result.
  4. Wait roughly 10-20 seconds, then search for the same phrase again (tap Search / press Return).
  5. Observe the result.
- **Expected:** The immediate search may return 'No memories found.' because semantic embeddings are populated by deferred background enrichment, not at save time. After waiting ~10-20 seconds (enrichment completes), the same search returns the new memory under 'Search results · 1 found'. The memory itself is always visible in the feed immediately regardless of search.
- **Pass/Fail:** PASS if the new memory is reliably found by semantic search after the short wait (even if the immediate search missed it); FAIL if the memory is still NOT semantically searchable after ~60 seconds, or if the memory never appears in the feed.

#### ☐ `SRCH-P1-02` — Mixed-media memory (photos + video) surfaces in search with media rendered
**P1** · 🟠 **High** if fail · _Devices:_ iPhone (TestFlight) and one Android device

- **Preconditions:** Premium account on a physical device. An enrichment-complete memory exists that contains BOTH at least one photo AND one video in the same memory, with a searchable keyword in its content (e.g. 'graduation day').
- **Steps:**
  1. On the Memories page, search for the keyword tied to the mixed-media memory ('graduation').
  2. Wait for 'Search results · N found'.
  3. Inspect the result card's media area.
  4. Tap the result to open it / tap a media tile.
- **Expected:** The mixed-media memory appears in the search results. Photo thumbnails load as images; the video appears as a play-icon tile (not a broken/blank box). Opening the memory shows photos and the video; the video plays with controls when tapped. All media is served via signed URLs (no broken images).
- **Pass/Fail:** PASS if the mixed-media memory surfaces with both its photo thumbnail and a video play-tile rendering correctly and the video plays on open; FAIL if media is missing/broken, the video tile does not render, or the memory does not appear.

#### ☐ `SRCH-P1-03` — Premium gate — non-premium account sees the neutral notice on native (no purchase CTA)
**P1** · 🟠 **High** if fail · _Devices:_ iPhone native app (TestFlight) only

- **Preconditions:** A NON-PREMIUM (Free) account logged in on a physical iPhone via the native app (TestFlight). At least one memory exists so the feed is non-empty.
- **Steps:**
  1. Open the Memories page on the native iOS app.
  2. Type any 2+ character query into 'Search memories...' (e.g. 'park').
  3. Wait for the search to run (or tap 'Search').
  4. Read the message shown in place of results.
  5. Confirm there is NO 'subscribe', 'upgrade on the web', external link, or purchase button anywhere in the search area.
- **Expected:** Search returns no results and instead shows the neutral notice 'Semantic search is a Premium feature.' in a sand-colored card. There is NO purchase/upgrade/checkout link or external 'subscribe on the web' text (Apple 3.1.1 compliance). The rest of the page (feed, create) remains usable.
- **Pass/Fail:** PASS if the exact neutral notice appears with no purchase CTA or external link; FAIL if a purchase/checkout/upgrade link appears on native, the app errors, or the search silently returns nothing with no explanation.

#### ☐ `SRCH-P2-01` — No-results state and empty-query handling
**P2** · 🟢 **Low** if fail · _Devices:_ iPhone (TestFlight) and one Android device

- **Preconditions:** Premium account, logged in on a physical device, on the Memories page.
- **Steps:**
  1. Search for a nonsense phrase that matches nothing (e.g. 'qwerty xyzzy nonexistent').
  2. Observe the message.
  3. Clear the search field completely (delete all text).
  4. Observe that the normal feed returns.
- **Expected:** For the nonsense query, after 'Searching memories...' the screen shows 'No memories found.' with the sub-line 'Try different keywords or phrases.' When the field is cleared, the search results disappear and the normal grouped feed (Today / This Week / Earlier sections) is shown again.
- **Pass/Fail:** PASS if the no-results message and sub-line appear for the nonsense query and clearing the field restores the normal feed; FAIL if the empty state is wrong/missing or clearing the field leaves a stale results view.

#### ☐ `SRCH-P2-02` — Mobile sticky search bar stays reachable while scrolling the feed
**P2** · 🟢 **Low** if fail · _Devices:_ iPhone (TestFlight, incl. a notch/Dynamic-Island model) and one Android device

- **Preconditions:** Logged in on a physical phone (iOS or Android). The active workspace has enough memories to require scrolling.
- **Steps:**
  1. Open the Memories page.
  2. Scroll the feed down several screens.
  3. Observe the search field while scrolling.
  4. Tap the (still-visible) search field and run a search.
- **Expected:** On mobile the search bar is sticky and remains pinned below the top bar (clear of the status bar / safe-area inset) while the feed scrolls, so it stays reachable. Tapping it and searching works normally from any scroll position.
- **Pass/Fail:** PASS if the search bar stays visible and usable while scrolling and is not hidden under the status bar; FAIL if it scrolls away, is obscured by the status bar/notch, or becomes untappable.

**Device notes:**
- App is a remote-URL Capacitor iOS WebView loading www.remynest.com plus an Android build; search runs against the LIVE production site, so a real network connection is required and behavior depends on the deployed site, not a local build.
- Auth is EMAIL/PASSWORD only — there is no Apple/Google sign-in. Have the test account credentials ready; sign in before testing search.
- Run native-gate tests (SRCH-P1-03) on the iOS native app specifically — the 'Semantic search is a Premium feature.' notice and the no-purchase-CTA behavior are native-only (Apple 3.1.1). On web, a non-premium 402 instead fails silently with no notice.
- Test the sticky-search-bar / safe-area behavior (SRCH-P2-02) on at least one notch / Dynamic Island iPhone, since the sticky offset uses env(safe-area-inset-top).
- Premium-gated tests require a PREMIUM account; scoping and no-results tests also assume Premium (Free accounts cannot run semantic search and will only see the gate notice on native).
- For workspace-scoping (SRCH-P0-03) the account needs both My Nest and at least one care profile, each with a distinct keyworded memory.

**Known limitations (expected behavior — not a FAIL):**
- Semantic embeddings are written by DEFERRED background enrichment (fire-and-forget POST /api/memories/[id]/enrich after create) — only enrichMemory writes the embedding column. A brand-new memory is therefore NOT semantically searchable for a few seconds (occasionally longer under load or AI/network latency). The memory is always visible in the feed immediately; only search lags.
- The Memories-page search is SEMANTIC-ONLY (embedding + match_memories RPC, threshold 0.2). There is no separate plain-substring keyword index; a query only matches if it is semantically close to enriched memory content, so very short/ambiguous keywords on un-enriched or thin memories may not match.
- Semantic search is PREMIUM-GATED at the API (HTTP 402). On native iOS this surfaces as the neutral notice 'Semantic search is a Premium feature.'; on WEB a 402 currently falls through to a silent failure (no results, no notice) by design.
- Videos are NOT served through Supabase image transforms (thumb/medium are image-only) — a video in results renders as a play-icon tile using the plain signed object URL; the actual video only loads on open (preload='none' for WKWebView safety).
- Results are capped: match_count 20 after over-fetching 100 candidates and scoping to the active workspace; a query with many matches will show at most 20, ranked by similarity.
- The Remy 'Ask' natural-language path is grounded — if workspace-scoped retrieval returns nothing it deliberately does NOT call the AI and replies 'I couldn't find any memories about that.' / 'No matching memories found.', which is expected behavior, not a search failure.

## 1.5 Mobile platforms + PWA

> **Grounding (real implementation):** Grounded in the actual RemyNest repo. (1) capacitor.config.ts: RemyNest is a REMOTE-URL Capacitor wrapper — server.url = https://www.remynest.com loaded in a WKWebView (appId com.remynest.app, appName "RemyNest"), so web fixes ship via Vercel and a native rebuild is only needed for native changes; allowNavigation is scoped to remynest.com + *.supabase.co + *.onesignal.com; iOS contentInset:'never' (web layer owns safe-area insets via env(safe-area-inset-*)); SplashScreen launchShowDuration 1500ms, white bg, no spinner. …


| ID | Title | Pri | If fail | Devices |
|---|---|---|---|---|
| `MOB-P0-01` | Install & launch iPhone TestFlight (Capacitor) build loads live site | **P0** | 🔴 Blocker | iPhone TestFlight |
| `MOB-P0-02` | Email/password login works on all five surfaces (no social login) | **P0** | 🔴 Blocker | All five (iPhone Safari, iPhone PWA, iPhone TestFlight, Android Chrome, Android Play build) |
| `MOB-P0-03` | iPhone camera permission prompt shows RemyNest purpose string | **P0** | 🔴 Blocker | iPhone TestFlight |
| `MOB-P0-04` | iPhone photo-library permission prompt shows RemyNest purpose string | **P0** | 🔴 Blocker | iPhone TestFlight |
| `MOB-P0-05` | iPhone native local reminder fires while app is backgrounded | **P0** | 🔴 Blocker | iPhone TestFlight |
| `MOB-P0-06` | iPhone native local reminder fires while RemyNest is in the FOREGROUND | **P0** | 🔴 Blocker | iPhone TestFlight |
| `MOB-P0-07` | iPhone reminder still fires in Airplane Mode (offline, device-local) | **P0** | 🟠 High | iPhone TestFlight |
| `MOB-P0-08` | Android scheduled reminder delivery — KNOWN GAP (no FCM) | **P0** | 🟠 High | Android Play Store build, Android Chrome |
| `MOB-P1-01` | iPhone PWA installs and launches standalone with brand chrome | **P1** | 🟡 Medium | iPhone PWA |
| `MOB-P1-02` | Landscape iPhone uses the MOBILE nav (lg breakpoint) | **P1** | 🟡 Medium | iPhone Safari, iPhone TestFlight |
| `MOB-P1-03` | iPhone safe-area insets correct on notched device (no header shift) | **P1** | 🟠 High | iPhone TestFlight |
| `MOB-P1-04` | Web-shipped fix reaches the iOS WebView without a native rebuild | **P1** | 🟡 Medium | iPhone TestFlight, iPhone Safari |
| `MOB-P1-05` | Reminder create/store/dashboard works across My Nest and a Care workspace | **P1** | 🟠 High | iPhone TestFlight, Android Play Store build |
| `MOB-P1-06` | Android Chrome photo upload via OS picker | **P1** | 🟡 Medium | Android Chrome, Android Play Store build |
| `MOB-P2-01` | iPhone recurring (daily) reminder fires on consecutive days | **P2** | 🟡 Medium | iPhone TestFlight |
| `MOB-P2-02` | iPhone reminder edit/delete cancels and reschedules the local notification | **P2** | 🟡 Medium | iPhone TestFlight |
| `MOB-P2-03` | OneSignal (non-reminder) push still arrives on iPhone — hybrid intact | **P2** | 🟡 Medium | iPhone TestFlight |
| `MOB-P2-04` | In-WebView top-level navigation stays inside the app (allowNavigation scope) | **P2** | 🟢 Low | iPhone TestFlight |


#### ☐ `MOB-P0-01` — Install & launch iPhone TestFlight (Capacitor) build loads live site
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone TestFlight

- **Preconditions:** A TestFlight invite for RemyNest (current baseline Build 8) is accepted; TestFlight app installed; device has internet.
- **Steps:**
  1. Open TestFlight, find RemyNest, tap Install (or Update to the latest build).
  2. From the iPhone Home Screen, tap the RemyNest app icon.
  3. Observe the launch/splash screen, then the first loaded screen.
  4. Confirm the app label under the icon reads 'RemyNest'.
- **Expected:** The app launches showing a brief splash (white background, no spinner, ~1.5s per SplashScreen config), then loads the live RemyNest site (www.remynest.com) inside the WebView — landing on the login screen if logged out, or /home if a session exists. The app name shows as 'RemyNest'. No browser address bar/Safari chrome is visible (it is a native shell).
- **Pass/Fail:** PASS if the native app launches, shows the splash, and loads the live RemyNest UI with no Safari chrome and the name 'RemyNest'. FAIL if it shows a blank/white screen, an unreachable-URL fallback, a crash, or never gets past the splash.

#### ☐ `MOB-P0-02` — Email/password login works on all five surfaces (no social login)
**P0** · 🔴 **Blocker** if fail · _Devices:_ All five (iPhone Safari, iPhone PWA, iPhone TestFlight, Android Chrome, Android Play build)

- **Preconditions:** A valid RemyNest account (confirmed email) exists. App/site freshly opened and logged out.
- **Steps:**
  1. Open RemyNest on the surface under test (iPhone Safari / iPhone PWA / iPhone TestFlight / Android Chrome / Android Play build).
  2. On the login screen, confirm the only sign-in method is email + password (no 'Sign in with Apple' / 'Continue with Google' buttons).
  3. Enter the account email and password.
  4. Tap the sign-in button and wait.
- **Expected:** The login screen offers only email/password fields (no Apple/Google buttons). On valid credentials the user is signed in and routed into the app (/home or onboarding if incomplete). The Supabase cookie session persists so a relaunch stays signed in.
- **Pass/Fail:** PASS if email/password login succeeds and the session persists, with no social-login UI present. FAIL if any social-login button appears, valid credentials are rejected, or the session does not persist across relaunch.

#### ☐ `MOB-P0-03` — iPhone camera permission prompt shows RemyNest purpose string
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone TestFlight

- **Preconditions:** Logged-in iPhone TestFlight build, fresh install (camera permission not yet granted). A memory create/edit screen with an Add Photo / camera option.
- **Steps:**
  1. Open Add Memory (or edit a memory) and choose the option to capture a new photo/video with the camera.
  2. When iOS shows the permission alert, read the body text of the alert.
  3. Tap Allow.
  4. Capture a photo and confirm it attaches to the memory.
- **Expected:** iOS presents the camera permission alert whose body text reads exactly: 'RemyNest uses your camera so you can capture photos and videos to add to your memories.' After Allow, the camera opens and the captured photo attaches to the memory.
- **Pass/Fail:** PASS if the prompt shows that exact RemyNest camera purpose string and capture works after Allow. FAIL if the prompt is generic/blank, shows a placeholder, never appears, or the app crashes when accessing the camera.

#### ☐ `MOB-P0-04` — iPhone photo-library permission prompt shows RemyNest purpose string
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone TestFlight

- **Preconditions:** Logged-in iPhone TestFlight build, photo-library permission not yet granted. A memory create/edit screen with an Add from Library option.
- **Steps:**
  1. Open Add Memory and choose to add an existing photo/video from the photo library.
  2. When iOS shows the photo-access permission alert, read its body text.
  3. Grant access (Allow Full Access or select photos).
  4. Pick a photo and confirm it attaches to the memory.
- **Expected:** iOS presents the photo-library permission alert whose body text reads exactly: 'RemyNest needs access to your photo library so you can add existing photos and videos to your memories.' After granting, the picker opens and the selected photo attaches.
- **Pass/Fail:** PASS if the prompt shows that exact RemyNest photo-library purpose string and the selected photo attaches. FAIL if the prompt is generic/blank/placeholder, never appears, or selection fails.

#### ☐ `MOB-P0-05` — iPhone native local reminder fires while app is backgrounded
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone TestFlight

- **Preconditions:** Logged-in iPhone TestFlight build (Build 8+) with notification permission granted on first visit to the Reminders screen. Device clock correct.
- **Steps:**
  1. Open the Reminders screen and grant notification permission if prompted.
  2. Create a one-time reminder set for about 3 minutes in the future, with a recognizable title.
  3. Press the Home gesture to background RemyNest (or open another app).
  4. Wait until the scheduled time.
  5. Observe the lock screen / notification banner.
- **Expected:** At the scheduled time a system notification fires on-device showing the reminder title, with sound/banner — delivered locally by iOS (no dependence on cron/OneSignal/network).
- **Pass/Fail:** PASS if the reminder notification appears at the scheduled time while backgrounded. FAIL if no notification fires, it fires at the wrong time, or it shows wrong/empty content.

#### ☐ `MOB-P0-06` — iPhone native local reminder fires while RemyNest is in the FOREGROUND
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone TestFlight

- **Preconditions:** Logged-in iPhone TestFlight build (Build 8+, includes the AppDelegate willPresent fix). Notification permission granted.
- **Steps:**
  1. Create a one-time reminder ~3 minutes out with a recognizable title.
  2. Keep RemyNest open and active in the foreground (stay on any screen inside the app).
  3. Wait until the scheduled time without leaving the app.
  4. Observe whether a banner appears over the app.
- **Expected:** At the scheduled time a notification banner (with sound) appears over the foreground app for the local reminder. This validates the AppDelegate UNUserNotificationCenterDelegate willPresent fix that returns [.banner,.list,.sound,.badge] for local triggers while OneSignal owns remote pushes.
- **Pass/Fail:** PASS if the reminder banner appears while the app is in the foreground. FAIL if the reminder is silent/invisible while foregrounded (the exact defect Build 8 fixed) — report as a NEW regression.

#### ☐ `MOB-P0-07` — iPhone reminder still fires in Airplane Mode (offline, device-local)
**P0** · 🟠 **High** if fail · _Devices:_ iPhone TestFlight

- **Preconditions:** Logged-in iPhone TestFlight build, notification permission granted.
- **Steps:**
  1. Create a one-time reminder ~3 minutes out with a recognizable title; confirm it saved (list shows it).
  2. Enable Airplane Mode (turn off Wi-Fi and cellular).
  3. Background or lock the device and wait until the scheduled time.
  4. Observe the notification.
- **Expected:** The reminder notification fires at the scheduled time even with no network, because iOS owns the scheduled local notification once it is set. Delivery does not depend on the server, cron, OneSignal, or APNs.
- **Pass/Fail:** PASS if the reminder fires offline at the correct time. FAIL if nothing fires while offline (would indicate the reminder is wrongly depending on the server path).

#### ☐ `MOB-P0-08` — Android scheduled reminder delivery — KNOWN GAP (no FCM)
**P0** · 🟠 **High** if fail · _Devices:_ Android Play Store build, Android Chrome

- **Preconditions:** Logged-in Android Play Store build (or Android Chrome). A reminder can be created in the UI.
- **Steps:**
  1. Open the Reminders screen; if Android 13+ prompts for notifications (POST_NOTIFICATIONS), allow it.
  2. Create a one-time reminder ~3-5 minutes out.
  3. Background or lock the device and wait until the scheduled time.
  4. Record whether any notification is delivered.
- **Expected:** Per current build state, no push/reminder notification is delivered on Android: google-services.json/FCM is not configured (build logs 'Push Notifications won't work'). This test DOCUMENTS the known gap — the reminder should still be created and visible in the dashboard, but delivery is expected to fail until the operator FCM fast-follow lands.
- **Pass/Fail:** PASS (expected, known limitation) if the reminder is created/visible but no notification is delivered — log it as the known Android delivery gap. Mark FAIL only if reminder CREATION/storage itself breaks, or if behavior differs from this documented gap (e.g. it unexpectedly DOES deliver — update the docs).

#### ☐ `MOB-P1-01` — iPhone PWA installs and launches standalone with brand chrome
**P1** · 🟡 **Medium** if fail · _Devices:_ iPhone PWA

- **Preconditions:** iPhone Safari open at https://www.remynest.com, logged in or able to log in.
- **Steps:**
  1. In Safari tap Share, then 'Add to Home Screen', then Add.
  2. Confirm the Home Screen icon is the RemyNest icon and labeled 'RemyNest'.
  3. Launch the app from the new Home Screen icon.
  4. Observe whether Safari address bar/toolbar is hidden, the splash/background color, and the orientation.
- **Expected:** The PWA installs as 'RemyNest' with the brand icon, launches in standalone mode (no Safari address bar or toolbar), shows the sand background (#F5F1EA) / sage theme (#4F6B5B), and runs in portrait per the manifest (display:standalone, orientation:portrait). The live RemyNest UI loads normally.
- **Pass/Fail:** PASS if the PWA launches full-screen standalone with the correct name, icon, and brand colors. FAIL if it opens in a Safari tab with chrome, shows a default/blank icon, or fails to load.

#### ☐ `MOB-P1-02` — Landscape iPhone uses the MOBILE nav (lg breakpoint)
**P1** · 🟡 **Medium** if fail · _Devices:_ iPhone Safari, iPhone TestFlight

- **Preconditions:** Logged-in session on iPhone Safari mobile web or iPhone TestFlight. Device orientation lock OFF.
- **Steps:**
  1. On /home, confirm in portrait that the mobile top bar and bottom navigation are shown.
  2. Rotate the iPhone to landscape.
  3. Observe the navigation chrome in landscape (top bar, bottom nav vs. a desktop navbar/sidebar).
- **Expected:** In both portrait and landscape the app shows the MOBILE navigation (MobileTopBar + MobileBottomNav), never the desktop AppNavbar. Because the nav breakpoint is lg (1024px) and all iPhones are below 1024px CSS width even in landscape, the desktop navbar must not appear.
- **Pass/Fail:** PASS if landscape still renders the mobile top bar + bottom nav. FAIL if rotating to landscape switches to the desktop navbar/sidebar or breaks the nav layout.

#### ☐ `MOB-P1-03` — iPhone safe-area insets correct on notched device (no header shift)
**P1** · 🟠 **High** if fail · _Devices:_ iPhone TestFlight

- **Preconditions:** Logged-in iPhone TestFlight build on a notched/Dynamic-Island iPhone (Pro/Pro Max).
- **Steps:**
  1. Open /home (and the My Nest / personal workspace home).
  2. Inspect the top header: confirm it sits below the status bar / Dynamic Island, not under it.
  3. Open a screen with the sticky mobile top bar and confirm the title/controls are not clipped by the notch or status bar.
  4. Rotate to landscape and confirm content respects the left/right safe-area insets (not under the notch).
- **Expected:** Headers and the sticky top bar pad themselves correctly using safe-area insets (contentInset:'never' lets the web layer own insets via env(safe-area-inset-*)). No content is hidden under the status bar/notch, and there is no top-left header shift (the historical 'My Nest' defect).
- **Pass/Fail:** PASS if all chrome respects the safe area in portrait and landscape with no notch clipping or header shift. FAIL if the header shifts to the top-left, content slides under the status bar/notch, or there is a double-inset gap.

#### ☐ `MOB-P1-04` — Web-shipped fix reaches the iOS WebView without a native rebuild
**P1** · 🟡 **Medium** if fail · _Devices:_ iPhone TestFlight, iPhone Safari

- **Preconditions:** Logged-in iPhone TestFlight build. A web-only change has been deployed to www.remynest.com via Vercel (or use any current production UI state as the reference).
- **Steps:**
  1. Confirm the latest production web build is live in iPhone Safari at www.remynest.com (reference surface).
  2. Fully close and relaunch the RemyNest TestFlight app.
  3. Navigate to the same screen in the app and compare it to Safari.
- **Expected:** The TestFlight app reflects the same live web UI as Safari, because the app is a remote-URL wrapper that loads www.remynest.com in the WebView — web/Vercel deploys appear in the app with no new native build (only native changes require a rebuild).
- **Pass/Fail:** PASS if the app shows the same current web UI as Safari after relaunch. FAIL if the app is stuck on a stale build or diverges from the live site for a web-only change.

#### ☐ `MOB-P1-05` — Reminder create/store/dashboard works across My Nest and a Care workspace
**P1** · 🟠 **High** if fail · _Devices:_ iPhone TestFlight, Android Play Store build

- **Preconditions:** Logged-in account with a personal (My Nest) workspace and at least one care profile.
- **Steps:**
  1. In the My Nest (personal) workspace, create a reminder with a clear title and time; confirm it appears in the reminder dashboard.
  2. Open the workspace drawer and switch to a Care profile.
  3. Confirm the My Nest reminder is NOT shown in the Care workspace.
  4. Create a reminder in the Care workspace; confirm it appears there.
  5. Switch back to My Nest and confirm only the My Nest reminder is shown (workspace isolation).
- **Expected:** Reminders are created, stored, and listed per workspace with correct isolation: a My Nest reminder shows only in My Nest, a Care reminder shows only in that Care profile. The Add Reminder form resets after each create and after a workspace switch.
- **Pass/Fail:** PASS if reminders are correctly scoped per workspace, the dashboard reflects them, and the form resets after create/switch. FAIL if reminders leak across workspaces, fail to save, or the form retains stale values after create/switch.

#### ☐ `MOB-P1-06` — Android Chrome photo upload via OS picker
**P1** · 🟡 **Medium** if fail · _Devices:_ Android Chrome, Android Play Store build

- **Preconditions:** Logged-in Android Chrome session at www.remynest.com.
- **Steps:**
  1. Open Add Memory and choose to add a photo.
  2. When the Android file/photo chooser opens, pick an image from the gallery (or capture with the camera).
  3. Grant any Android runtime permission prompt that appears.
  4. Confirm the image attaches and the memory saves.
- **Expected:** The Android OS photo chooser opens, the selected/captured image attaches to the memory, and the memory saves successfully (uploads work over the standard web flow).
- **Pass/Fail:** PASS if the photo attaches and the memory saves. FAIL if the picker does not open, the image fails to attach, or the save errors.

#### ☐ `MOB-P2-01` — iPhone recurring (daily) reminder fires on consecutive days
**P2** · 🟡 **Medium** if fail · _Devices:_ iPhone TestFlight

- **Preconditions:** Logged-in iPhone TestFlight build, notification permission granted. Test spans two days (or use a near-term time and verify next-day fire).
- **Steps:**
  1. Create a recurring DAILY reminder at a specific local time a few minutes ahead.
  2. Confirm it fires at that time on day one.
  3. Without re-creating it, wait until the same local time the next day.
  4. Confirm it fires again at the same local time.
- **Expected:** The daily reminder fires at the same local time on consecutive days (iOS UNCalendarNotificationTrigger repeats), and stays at the correct local time across day boundaries / DST.
- **Pass/Fail:** PASS if the reminder fires at the same local time on both days. FAIL if it fires only once, drifts to a wrong time, or stops repeating.

#### ☐ `MOB-P2-02` — iPhone reminder edit/delete cancels and reschedules the local notification
**P2** · 🟡 **Medium** if fail · _Devices:_ iPhone TestFlight

- **Preconditions:** Logged-in iPhone TestFlight build, notification permission granted.
- **Steps:**
  1. Create a one-time reminder ~5 minutes out (title A).
  2. Edit it: change the title to B and move the time later by a couple of minutes; save.
  3. Wait past the original time and confirm NO notification fires for the old time/title.
  4. Wait until the new time and confirm a notification fires with title B.
  5. Create another reminder, delete it before its time, and confirm it never fires.
- **Expected:** Editing cancels the old schedule and creates a new one — only the new time/title (B) fires; the old time produces nothing. A deleted reminder never fires. This validates the reconcile engine's diff (cancel old, schedule new).
- **Pass/Fail:** PASS if only the edited reminder fires at the new time and deleted reminders never fire. FAIL if the old reminder still fires, both fire, or a deleted reminder fires.

#### ☐ `MOB-P2-03` — OneSignal (non-reminder) push still arrives on iPhone — hybrid intact
**P2** · 🟡 **Medium** if fail · _Devices:_ iPhone TestFlight

- **Preconditions:** Logged-in iPhone TestFlight build, notification permission granted, OneSignal subscription active. A way to trigger a non-reminder notification (e.g. a shared-memory/account event, or operator test send).
- **Steps:**
  1. Confirm the device is subscribed in OneSignal (notification permission granted on this install).
  2. Trigger or have the operator send a non-reminder push (e.g. shared memory / account notification).
  3. Observe whether the push is received.
- **Expected:** Non-reminder pushes still arrive via OneSignal/APNs, confirming the hybrid model: local notifications handle reminders while OneSignal handles shared-memory/account/collaboration pushes. The AppDelegate change does not affect remote push behavior (returns [] for remote triggers).
- **Pass/Fail:** PASS if the non-reminder OneSignal push is received. FAIL if OneSignal pushes stop arriving (would indicate the local-notification delegate broke the remote path).

#### ☐ `MOB-P2-04` — In-WebView top-level navigation stays inside the app (allowNavigation scope)
**P2** · 🟢 **Low** if fail · _Devices:_ iPhone TestFlight

- **Preconditions:** Logged-in iPhone TestFlight build.
- **Steps:**
  1. Navigate around the app (home, memories, reminders, account) and confirm pages load inside the native shell.
  2. Trigger an action that touches an allowed external host inside the WebView context (e.g. a Supabase-backed action / signed media load).
  3. Observe that navigation/data flows stay in-app without bouncing to Safari.
- **Expected:** Top-level navigation to remynest.com stays inside the WebView, and XHR/fetch to Supabase/OneSignal works normally (allowNavigation covers www.remynest.com, remynest.com, *.supabase.co, *.onesignal.com). The app does not unexpectedly kick out to mobile Safari for normal in-app navigation.
- **Pass/Fail:** PASS if in-app navigation and data loads stay inside the native shell. FAIL if normal navigation force-opens Safari or in-app data/media fails to load.

**Known limitations (expected behavior — not a FAIL):**
- Android push/reminder delivery is NOT functional: no google-services.json is committed and android/app/build.gradle logs 'Push Notifications won't work'. Scheduled reminders will not deliver on Android (Chrome web or Play build) until the operator completes the FCM/google-services + keystore fast-follow. Android is ~55% launch-ready vs iOS ~90%.
- iOS local reminders are device-local via @capacitor/local-notifications and require the native TestFlight/App Store build (Build 8+). On iPhone Safari mobile web and the iPhone PWA there is NO on-device scheduling — those surfaces depend on the server/OneSignal path for reminder delivery, which is the fragile path the native local-notification system was built to bypass.
- reconcileLocalReminders is a NO-OP off native iOS (web + Android). Do not expect on-device offline/airplane-mode reminder firing anywhere except the native iOS app.
- Auth is EMAIL/PASSWORD only — there is no Sign in with Apple and no Google login on the app. Do not test or expect social-login buttons; signup may require email confirmation before first login.
- iOS reminder system is FROZEN/PROTECTED (validated Build 8). These tests are acceptance/regression checks for a human tester; any failure is a NEW defect to report, not a license to modify reminder/scheduling/AppDelegate/OneSignal code.
- PWA push on iOS is limited by Safari's web-push support and the app being a remote-URL wrapper; treat PWA reminder delivery as best-effort web push, not the validated native local path.
- One-time reminders must be scheduled more than ~60 seconds in the future to be accepted by iOS (per the local-notifications lead-margin); a reminder set under a minute out may not fire — set test reminders 2-3 minutes out.
- PWA manifest declares orientation:portrait, so an installed iPhone PWA is expected to lock to portrait; full landscape layout testing belongs on Safari mobile web and the native builds.

## 1.6 Offline / poor network

> **Grounding (real implementation):** probe 4 tiny


| ID | Title | Pri | If fail | Devices |
|---|---|---|---|---|
| `OFF-01` | Airplane mode mid-upload: clean fail | **P0** | 🟠 High | — |
| `OFF-02` | Reconnect retry = ONE memory | **P0** | 🟠 High | — |
| `OFF-03` | Double-tap Save: no dup | **P0** | 🔴 Blocker | — |
| `OFF-06` | Native reminder fires OFFLINE | **P0** | 🔴 Blocker | iPhone WebView ONLY |


#### ☐ `OFF-01` — Airplane mode mid-upload: clean fail
**P0** · 🟠 **High** if fail · _Devices:_ —
- **Steps:**
  1. New Memory+5MB photo; Save.
  2. While 'Saving...' Airplane mode.
- **Expected:** Upload throws; modal open with draft; 'Upload failed. Please try again.' or card rollback; no memory/dup/crash.
- **Pass/Fail:** PASS clean fail draft kept; FAIL crash/half/dup.

#### ☐ `OFF-02` — Reconnect retry = ONE memory
**P0** · 🟠 **High** if fail · _Devices:_ —
- **Steps:**
  1. Disable Airplane mode; Save once.
  2. Refetch; count.
- **Expected:** Succeeds; one memory; failed attempt left no record so no dup.
- **Pass/Fail:** PASS one memory; FAIL none/dup.

#### ☐ `OFF-03` — Double-tap Save: no dup
**P0** · 🔴 **Blocker** if fail · _Devices:_ —
- **Steps:**
  1. New Memory text-only.
  2. Tap Save twice fast; count.
- **Expected:** Guard (loading||isPending) + disabled 'Saving...' blocks 2nd tap; one memory.
- **Pass/Fail:** PASS one; FAIL two.

#### ☐ `OFF-06` — Native reminder fires OFFLINE
**P0** · 🔴 **Blocker** if fail · _Devices:_ iPhone WebView ONLY
- **Steps:**
  1. ONE-TIME reminder 3 min out; confirm.
  2. Airplane mode; lock; wait.
- **Expected:** 'RemyNest Reminder' fires on time offline via on-device UNUserNotificationCenter; no OneSignal/cron/APNs.
- **Pass/Fail:** PASS fires offline; FAIL doesn't/only after reconnect.


---

# 2. Pass / Fail Criteria

### Per-test outcomes
| Outcome | Meaning |
|---|---|
| ✅ **PASS** | The **Expected** result is met **exactly** on the device under test. |
| ❌ **FAIL** | Expected result not met **OR** any of the universal fail conditions below. |
| ⚠️ **PARTIAL** | Core behavior works but with a **documented, non-blocking** deviation (e.g. slow, cosmetic, a known limitation). Must link the limitation. |
| ⊘ **BLOCKED** | Cannot be run because a **dependency is missing** (e.g. Android FCM not yet configured). Excluded from the pass-rate denominator but tracked as a gap. |

### Universal FAIL conditions (any one = FAIL, regardless of the rest)
- **App crash / freeze / permanent hang** on a tested flow (e.g. "Saving…" never resolves).
- **Data loss** — a saved memory/reminder/photo/video disappears or never persisted.
- **Wrong-workspace data** — My Nest content shows in a care profile or vice-versa.
- **Cross-user leak** — account B sees account A's memory, media, reminder, or profile.
- **Security** — an over-quota upload succeeds; a foreign/edited storage path renders someone else's media; a disallowed file type is accepted.
- **Missing iOS permission purpose string** on the camera / photo-library prompt (App-Store reject + broken capture).
- **Notification non-delivery on iOS** for a scheduled reminder (lock / background / foreground) — this is a **regression** of a device-validated, frozen system.

### Domain pass threshold
A domain **passes** when **100% of its P0 cases PASS** and **≥ 90% of its P1 cases PASS**,
with **zero** universal-FAIL conditions triggered. P2 failures are logged but do not fail a domain.

---

# 3. Launch Blockers

A **launch blocker** is any result that must be fixed-and-retested before shipping to
production / submitting to the App Store.

### Blocking (do NOT launch if any occur)
- **Any P0 case FAILs**, or any 🔴 **Blocker**-severity case FAILs.
- **Any universal-FAIL condition** (§2) on any case (crash, data loss, cross-workspace,
  cross-user leak, quota/path/type security, missing permission string, iOS reminder non-delivery).
- **Memory create or media upload fails** on a supported iPhone (single photo / video / mixed / large video).
- **Storage quota not enforced** (an over-limit upload succeeds) or the **Storage-full modal** does not appear.
- **Care-profile isolation** breaks in either direction.
- **App-Store rejection triggers**: a purchase/upgrade CTA visible on native (3.1.1), a missing/incorrect permission string, or a core feature that visibly fails for the reviewer.

### Accepted, **non-blocking** (document + monitor — do NOT block launch)
- **Android push delivery** — FCM/`google-services` is an operator fast-follow; Android
  reminder *delivery* tests are **⊘ BLOCKED** until then. Android memory/upload/UI still tested.
- **No granular upload progress bar** — only a "Saving…" state (⚠️ PARTIAL at worst).
- **Semantic search of a brand-new memory** lags a few seconds (deferred enrichment).
- **AI title/tags/summary** appear seconds after save, not instantly (deferred enrichment).
- **Quota residuals** (concurrent-create TOCTOU overage; orphaned-but-unattached objects;
  real-content-type spoofing on the cross-origin storage bucket) — **monitor**; scheduled follow-ups.
- **App icon placeholder** if not yet replaced — blocks **App-Store submission** but not TestFlight testing.

---

# 4. Production Readiness Score — Update Methodology

The current **86/100** is a **code-confidence** score. RDAT produces a **runtime-verified**
score that supersedes it once execution is complete. Recompute as follows.

### Inputs
- Weight each case by priority: **P0 = 3, P1 = 2, P2 = 1**.
- Per result points: **PASS = full weight · PARTIAL = ½ weight · FAIL = 0 · BLOCKED = excluded** (removed from both numerator and denominator).

### Step 1 — Runtime Pass Rate (RPR)
```
RPR = Σ(weight × points-factor of every RUN case) / Σ(weight of every RUN case) × 100
```
(RUN = PASS + PARTIAL + FAIL; BLOCKED excluded.)

### Step 2 — Coverage gate
Let **P0-coverage = (P0 cases RUN) / (P0 cases total)**. If **P0-coverage < 95%**, the
score is **capped at 80** ("insufficient runtime evidence") regardless of RPR — you cannot
claim runtime-verified for flows you did not run.

### Step 3 — Readiness score
```
Readiness = round( min( RPR , 86 + bonus ) ) − hard_penalties
```
- **bonus:** +0 (RDAT cannot raise confidence above the code baseline of 86 unless every
  P0+P1 PASSes on ≥3 device classes, in which case cap rises to **95**).
- **hard_penalties:** each 🔴 Blocker FAIL → score forced **< 70** (Not Ready) until fixed;
  each 🟠 High FAIL → **−5**; 🟡 Medium FAIL → **−2**; 🟢 Low FAIL → **−1**; PARTIAL → **½** the
  same penalty.
- Apply the **Coverage gate** cap from Step 2.

### Interpretation bands
| Score | Meaning |
|---|---|
| **92–100** | Runtime-verified across device classes; no Blocker/High fails. |
| **80–91** | Solid; minor/known gaps under monitoring. |
| **70–79** | Material gaps — fix the High fails before launch. |
| **< 70** | A Blocker failed or P0 coverage too low — not launchable. |

> Record the computed RPR, P0-coverage, the penalty list, and the final Readiness score in
> the sign-off table below. The **86 baseline is replaced** by this number once the run completes.

---

# 5. Final Release Recommendation Criteria

Choose exactly one. All conditions in a tier must hold.

### 🟢 READY FOR PRODUCTION
- **100% of P0 cases PASS** on ≥ 2 iPhone classes + 1 Android (for non-push cases).
- **Zero** Blocker-severity fails and **zero** universal-FAIL conditions.
- **≥ 95% of P1 cases PASS**; all 🟠 High cases PASS.
- All iOS **permission strings present**; **no native purchase CTA**; reviewer happy-path clean.
- Operator prerequisites done: **`memory-media` bucket object-size limit set** for video,
  prod env (Stripe LIVE/Sentry) confirmed, build number bumped, web deploy live.
- **Readiness ≥ 92** with **P0-coverage = 100%**.

### 🟡 READY WITH MONITORING  *(expected outcome given the known Android-push gap)*
- **100% of P0 cases PASS** (excluding ⊘ BLOCKED Android-push delivery) and **zero** universal-FAIL.
- Remaining failures are **non-blocking and documented** with owners + a monitoring plan
  (e.g. Android push pending FCM; quota TOCTOU/orphan residuals; minor PARTIALs).
- **≥ 85% of P1 PASS**; a dashboard/alert exists for the monitored residuals.
- **Readiness 80–91**, **P0-coverage ≥ 95%**.

### 🔴 NOT READY
- **Any** P0/Blocker FAIL or **any** universal-FAIL condition (crash, data loss,
  cross-workspace/cross-user leak, quota/path/type security, iOS reminder non-delivery, missing permission string).
- **P0-coverage < 95%** (not enough device evidence).
- **Readiness < 80.**
- → Fix, then **re-run the affected domain(s) + a P0 regression sweep** before re-scoring.

---

# 6. Execution Tracker & Sign-off

### Run metadata (fill per device)
| Field | Value |
|---|---|
| Build # (iOS / Android / web commit) | |
| Device model · OS version | |
| Network (Wi-Fi / LTE / 5G) | |
| Tester · Date | |

### Domain roll-up
| Domain | P0 pass/total | P1 pass/total | P2 pass/total | Universal-FAILs | Domain result |
|---|---|---|---|---|---|
| Media uploads | / | / | / | | |
| Reminders & notifications | / | / | / | | |
| Care profiles & workspace | / | / | / | | |
| Search | / | / | / | | |
| Mobile platforms & PWA | / | / | / | | |
| Offline / poor network | / | / | / | | |

### Score & decision
| Field | Value |
|---|---|
| Runtime Pass Rate (RPR) | |
| P0-coverage % | |
| Hard penalties (list) | |
| **Final Readiness score** | **___ / 100** |
| **Release recommendation** | 🟢 Ready · 🟡 Ready w/ monitoring · 🔴 Not ready |
| Blockers to fix (if any) | |
| QA sign-off (name/date) | |
| Operator sign-off (name/date) | |

---

*Generated 2026-06-24. Test cases grounded in the live RemyNest implementation. This is an
operational plan — it contains no application code. Update it whenever a tested flow's
behavior changes (see CLAUDE.md "Documentation Maintenance Rule").*
