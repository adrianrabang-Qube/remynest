# Handoff — Current

> Update every session (it's part of Definition of Done — see CLAUDE.md). Keep
> short and truthful. Sections below are the mandated HANDOFF standard.

**Last updated:** 2026-06-12

## Current status
Web app **live in production** (Vercel → `www.remynest.com`). **Delete Account
shipped and validated** end-to-end. Single authoritative workflow established in
`CLAUDE.md` (Investigation/Execution modes). **Dashboard V3** shipped (reminder-driven
command center). **Reminder Lifecycle Sprint 1** is paused pending operator migration
(`20260609120000_reminder_lifecycle_foundation.sql` committed, NOT applied).

- **Profile V2 — digital identity layer** (new `/profile` route; Settings becomes secondary).
  Before: no profile page — "profile" was the `ProfileHub` account/settings menu (avatar dropdown +
  drawer); memory intelligence was invisible outside the dashboard.
  - New `/profile` (`app/(app)/profile/page.tsx`) — mobile-first identity surface composing 4 new
    presentational cards (`components/profile/identity/`): **ProfileOverviewCard** (photo/name/age —
    care subject's dob/photo in a care workspace, account name/avatar in My Nest),
    **ProfileLifeSnapshot** (Memories/Collections/Connections/Chapters counts, 2-up cards),
    **ProfileCoverageCard** (first/latest memory date + `computeCoverage` %), **Relationships**
    (people-in-care count), **ProfileHighlightsCard** (top chapter / top collection / strongest
    connection from existing Remy intelligence), and an **Account → /settings** link.
  - **Reuses existing intelligence** (`getRemyCollections/Connections/LifeChapters`,
    `computeCoverage`, `getAccessibleProfiles`, `resolveAccountIdentity` / `resolveActiveProfileId`)
    — **no new data system, no AI generation, no social features.** Memory counts replicate the
    dashboard's **workspace-scoped** pattern (`memory_profile_id = active | IS NULL`) so RLS/workspace
    scoping is unchanged. `bio`/`location` shown only if available (not in schema → omitted).
  - Reachable via a "View profile" link in `ProfileHub` (avatar menu). Settings page + ProfileHub
    sections untouched.
  - No auth/RLS/GDPR/billing/caregiver/workspace/notification/reminder/ownership/sharing/settings
    regression. Validated: lint (0 new), build ✓ (`/profile`), no eslint-disable.
- **Dashboard V4 — Home cleanup (post-Library)** (removes the duplicate intelligence wall now
  that Library is canonical). Removed the 6 Library widget **renders** from `dashboard/page.tsx`
  (`RemyCollections/Connections/LifeChapters/StoryMode/Biography/MemoryBook` + the two
  `MobileExpandable` wrappers + their imports) — ~1,440px of duplicate mobile cards. Replaced with
  one compact **`DashboardStoryPreview`** (~160px): Collections/Connections/Chapters counts +
  narrative chips (Story/Biography/Memory Book) + "Continue reading →" (latest story) +
  **Open Library →**.
  - **Data generation preserved** (per the brief): all 6 synthesizers still run in the dashboard
    (`getRemyCollections/Connections/LifeChapters/Stories/Biography/MemoryBook`) — they feed
    `RemyNotifications`/`RemyTimeline` (unchanged) **and** the new preview's counts/chips, so
    nothing is orphaned. **Only the renders were removed. No change to synthesizers, routes
    (`/library`, `/collections`, …), or data models.** `MobileExpandable.tsx` is now unused (kept;
    deletable in a follow-up).
  - `RemyTimeline` / `RemyNotifications` / Stats / etc. kept (not Library duplicates).
  - No auth/RLS/GDPR/billing/workspace/caregiver/reminder/ownership change. Dashboard bundle
    10.2→9.95 kB. Est. **−1,280px (~−25–30% whole-dashboard)** mobile scroll. Validated: lint
    (0 new), build ✓, no eslint-disable.
- **Library V2 — unified discovery hub** (consolidates Collections/Connections/Chapters/Story/
  Biography/Memory Book). Before: Collections/Connections/Chapters were standalone routes;
  **Story/Biography had no route** (dashboard-widget-only); Memory Book had only `/print`; **none
  were in the nav** — discovery meant scrolling the dashboard widget stack.
  - New `/library` landing (`app/(app)/library/page.tsx` + `components/library/LibraryView.tsx`):
    a single mobile-first hub — one search box + a sticky **horizontal filter-chip** row + **6
    compact destination rows** (≤80px, CompactRow pattern).
  - New routes **`/library/story`, `/library/biography`, `/library/memory-book`** — thin server
    pages that **reuse the existing widgets** (`RemyStoryMode`/`RemyBiography`/`RemyMemoryBook`)
    and synthesizers (`getRemyLifeChapters/Collections/Connections` → `getRemyStories` →
    `getRemyBiography` → `getRemyMemoryBook`). Promotes the 3 dashboard-trapped narratives to
    real destinations. **No new data system.**
  - Collections/Connections/Chapters **keep their routes** (Library links to them — folding them
    into subsections was churn with no UX gain).
  - **Nav:** added "Library" to `nav-config.ts` (drawer item → mobile drawer + desktop top nav).
  - No permission/RLS/GDPR/auth/workspace/caregiver/ownership change (new routes reuse the auth
    guard + the same read-only synthesizers). Validated: lint (0 new), build ✓ (4 routes), no
    eslint-disable. **Live device pass pending. Follow-up: trim dashboard widgets to previews;
    aggregate cross-surface content search.**
- **Timeline V2 — mobile-first feed** (`< md` only; **desktop unchanged**; nothing deleted —
  intelligence/related relocated to detail). Timeline was a desktop card experience:
  `TimelineCard` `<details>` (`p-7`, `text-4xl` title, `text-2xl` preview, per-card
  `IntelligenceStrip` + expanded `RelatedMemories`) ≈ 450–600px each; `text-5xl` header;
  `flex-wrap` chip-wall filters; `p-5` search card; `LifeChapterCard` `p-7`/`text-3xl` ≈ 450px.
  - New `TimelineRow.tsx` (~76px): thumbnail/icon · title · 1-line preview · date · category ·
    chevron → links to `/memories/[id]` (full content + AI intelligence + related live there).
  - New `CompactChapterRow.tsx` (~72px): title · date range · memory count · chevron → chapter view.
  - `TimelineDayGroup` / `ChaptersView`: render rows on mobile (`md:hidden`) + the **unchanged**
    `TimelineCard` / `LifeChapterCard` on desktop (`hidden md:block`). `IntelligenceStrip` +
    `RelatedMemories` are omitted from the row → auto-relocated to detail.
  - Chrome: header `max-md:text-2xl`; categories → **horizontal chip scroll**; search compact
    (`max-md:p-2`); toggle compact; toggle+search+filters sit in a **sticky control bar** on
    mobile (`top-14`); day headers compact + sticky below (`max-md:top-[12.5rem]`). Container
    `p-6 → p-4 md:p-6`.
  - Desktop untouched (all `max-md:`/`md:hidden`; control-bar wrapper keeps `space-y-6` on desktop).
    Est. **~80% mobile feed scroll reduction**; chapters ~84%; chrome ~60%. Validated: lint (0 new),
    build ✓, no eslint-disable. **Caveat: sticky offset `top-[12.5rem]` is an estimate needing
    one-line device tuning; a single-row control bar is a recommended follow-up.**
- **Mobile Memory feed — CompactMemoryRow** (Phase 2; `< md` only; **desktop keeps MemoryCard**;
  no information removed — moved deeper). Memories were a single-column stack of full-content
  `MemoryCard`s (~300px each: untruncated content + 3 thumbs + summary + tags + inline
  Edit/Delete → ~6,000px for 20 memories).
  - New `components/memories/CompactMemoryRow.tsx`: ~76px row — leading thumbnail (`next/image`)
    or fallback icon · title + 1-line preview · `date · ai_category · attachment count` · chevron.
    The whole row links to the existing `/memories/[id]` detail (full content lives there).
    Edit/Delete moved into an overflow "…" menu (no inline button clusters). 44px touch targets +
    aria labels.
  - New `components/memories/MemorySection.tsx` (generic over the caller's memory type): a
    **sticky** group header + responsive split — mobile = divided CompactMemoryRow list; desktop =
    the **unchanged** MemoryCard stack.
  - `app/(app)/memories/page.tsx`: the 3 date groups (Today/This Week/Earlier) + search results
    now render via `MemorySection`; the search bar is **compact + sticky on mobile**; container
    padding `p-6 → p-4 md:p-6` (drops the double-padding). **No filter system exists** (semantic
    search only) — none invented.
  - Desktop untouched (all changes `max-md:`/`md:hidden`). Est. **~70–75% mobile memories scroll
    reduction**. Validated: lint (0 new), build ✓. **Live 375/390/430 pass pending on-device**.
- **Global Workspace Selector — IA migration** (workspace switching is now a first-class,
  always-visible top-bar control on **every** authenticated screen; mobile + desktop).
  - New `components/navigation/WorkspaceSelector.tsx`: a chip `[ {workspace} ▾ ]` → responsive
    sheet (bottom-sheet on mobile, top-right dropdown on desktop) listing **My Nest** + every
    accessible care profile (✓ on active). **Reuses the existing permission-guarded server
    actions** `setActiveProfile(id)` (runs `validateProfileId`) / `setPersonalWorkspace()` +
    `router.refresh()` → global context update + full data refresh + cookie persistence
    (`remynest-active-context`). **No switching/permission logic changed.**
  - Care-profile **management relocated into the sheet** — "Manage care profiles" reveals
    `InviteCaregiverForm` (active profile) + `CreateProfileForm` (add a person).
  - `(app)/layout.tsx` loads `getAccessibleProfiles()` (RLS-scoped) → nav; wired into desktop
    `AppNavbar` (replaces display-only `WorkspaceIndicator`) and `MobileTopBar`
    (now `[Workspace ▾] … [avatar]`).
  - **Dashboard cleanup:** removed `ProfileSwitcher`, `EnterCareProfileList`,
    `DashboardProfilePanel`, `WorkspaceContextPanel`, the "Account & Workspace" 2-card grid, and
    `DashboardCreateProfile`; replaced with a single compact **Workspace Summary Row**
    (Workspace: {name} · N memories · N profiles). Dashboard bundle 12.9→10.2 kB.
  - Critical systems intact (auth, workspace permissions, caregiver/ownership via the reused
    `validateProfileId` + RLS loader, GDPR). Validated: lint (0 new), build ✓. **Runtime checks
    (switch from every screen, invite, persistence after refresh) pending on-device** (auth-gated).
  - Deferred: a full edit/remove-profile CRUD screen (sheet currently does switch + invite + add).
- **Mobile dashboard redesign — layout-first** (`< md` only; **desktop unchanged at `md+`**;
  no content/feature/data removed). Replaces the earlier clamp-heavy attempt — height is now cut
  by real re-layout, with Show-more reserved for the two true long-form documents. All mobile
  overrides use Tailwind `max-md:` so **desktop classes stay byte-identical**.
  - **Width:** removed the *double* horizontal padding (shell `<main>` + dashboard inner `<main>`
    both `px-6`). Shell → `px-4 md:px-6`; inner → `px-0 md:px-6` (~295px → ~343px usable @375).
  - **Rhythm:** inner `<main>` → `py-6 space-y-4 md:py-10 md:space-y-8`; card roots `p-4 md:p-6`.
  - **Header:** avatar inline + smaller, greeting `max-md:text-2xl`, smaller badges, one-line
    mobile summary (full sentence kept at `md:`).
  - **Companion:** `max-md:p-4`, smaller avatar, tighter separator/secondary list.
    `components/remy/RemyAvatar.tsx` gained an optional `className` prop (backward-compatible).
  - **Stats:** `md:grid-cols-2`→`grid-cols-2` (2-up on phones, was stacked), `max-md:p-4`, smaller numbers.
  - **Collections / Connections / Chapters:** `sm:grid-cols-2`→`grid-cols-2` (2-up on phones;
    desktop already 2-col ≥640 so unchanged); sub-cards `p-4 md:p-6`; tighter gaps.
  - **Timeline / Activity / Notifications / Story Mode:** denser rows + `max-md:` spacing/heading.
  - **Biography (expandable kept):** `max-md:p-5`, `h2 max-md:text-2xl`, `mt-8→mt-4`, `space-y-10→space-y-5`.
  - **Memory Book (expandable kept):** TOC → **horizontal chip scroll** on mobile
    (`max-md:flex-nowrap overflow-x-auto`, chips `shrink-0`); smaller headings/padding.
  - **Expandables reduced 6→2:** unwrapped Timeline/Collections/Connections/Chapters (now
    re-laid-out); `MobileExpandable` kept only on Biography + Memory Book.
  - Critical systems (nav, profile/workspace switching, reminders, notifications, memory creation,
    GDPR/account) untouched. Est. **~45–50% mobile scroll reduction** on content-rich dashboards.
    Validated: lint (0 new), build ✓. **Live 375/390/430 visual pass pending on device** (auth-gated).
- **Hybrid mobile navigation — implemented** (fixes the `< md` navbar overflow audited
  earlier; **desktop unchanged at `md+`**). New `components/navigation/nav-config.ts` is the
  **single source of truth** for routes — desktop `NavLinks` and the mobile nav both derive
  from it. Mobile (`< md`): `MobileTopBar` (brand + avatar) · `MobileBottomNav` (Dashboard,
  Memories, center **New**, Timeline, **More**) · `MobileNavDrawer` ("More" → Memory
  Chat/Reminders/Insights + reused `ProfileHub` for Settings/Billing/Support/Profile/
  **workspace switching**/sign-out). `AppNavbar` desktop bar gated `hidden md:flex`; mobile
  pieces `md:hidden`. **Preserved:** active highlighting (`isNavItemActive`), `?context=`
  query handling (Suspense-wrapped `useSearchParams`), workspace switching + profile + route
  permissions (via `ProfileHub`). **iOS safe areas:** `viewport-fit=cover` (root `viewport`
  export) + `env(safe-area-inset-bottom)` on the bottom nav/drawer. Shell `<main>` →
  `pt-6 pb-24 md:pb-6` so content clears the fixed bottom nav. Validated: lint **4 errors/160
  warnings (0 new)**, build ✓, no fixed-width overflow at 375px (bottom nav `flex-1`, drawer
  `w-[88%]` overlay), all 7 routes + account reachable. (Left `body{overflow-x:hidden}` as a
  safety net — the mobile overflow source is gone regardless; revisit later.) **Live 375px
  visual check pending on device/browser.**
- **Native push — double-init conflict fixed** (follow-up to the `5c74190` audit). The
  `onesignal-cordova-plugin` auto-swizzled `didFinishLaunchingWithOptions` and called
  `OneSignal.initialize(nil)` at launch, conflicting with AppDelegate's native
  `initialize(realAppId)` (two inits/launch; nil could win → broken push). The plugin's JS
  is never injected into the remote-URL page → it gave **no usable runtime API** → removed:
  - `npm uninstall onesignal-cordova-plugin`; added **direct** `pod 'OneSignalXCFramework',
    '5.5.2'` to `ios/App/Podfile` (was only transitive via the plugin — needed so
    `import OneSignalFramework` survives).
  - `cap sync` → **0 Cordova plugins**, `CordovaPluginsStatic` + `OneSignalPush.m` nil-init
    swizzle gone. **Exactly one `OneSignal.initialize`** remains (AppDelegate).
  - **No regression:** web push (`/public/OneSignalSDK*Worker.js` + Web SDK CDN), reminder
    delivery, external_id targeting, and notification APIs (`register-device`/`send-*`/`cron`)
    are server-/web-side and untouched; `OneSignalInit.tsx` web branch unchanged.
  - Validated: lint **4 errors/160 warnings** (fewer — removed the plugin's flagged JS; 0
    introduced), web build ✓, `cap sync` ✓, **unsigned iOS build `BUILD SUCCEEDED`** (App
    links `OneSignalFramework` directly, no `CordovaPluginsStatic`).
  - Integration path (OneSignal v5): App ID via Info.plist `ONESIGNAL_APP_ID` (operator
    replaces placeholder — real id is env-only/public, not committed); until then the native
    init safely no-ops (no crash, no push).
- **Native iOS push notifications — implemented** (fixes "reminders arrive on Mac, not
  iPhone"). Root cause (investigated): the remote-URL WKWebView ran the OneSignal **Web
  SDK**, which cannot create an iOS APNs subscription → no iOS device ever existed for
  reminders to target. No DB schema, no API-contract, no reminder-pipeline change.
  - `ios/App/App/AppDelegate.swift` — native `OneSignal.initialize(appId, withLaunchOptions:)`
    + `Notifications.requestPermission` (OneSignal swizzles the APNs callbacks → creates the
    iOS subscription). App ID read from Info.plist `ONESIGNAL_APP_ID`.
  - **Identity bridge** — AppDelegate registers a `WKScriptMessageHandler` (`oneSignalBridge`)
    on the Capacitor WebView; after auth the web app posts the Supabase user id → native
    `OneSignal.login(externalId)`, so reminder **external_id** targeting reaches the iPhone.
  - `components/OneSignalInit.tsx` — branches on `Capacitor.isNativePlatform()`: native →
    bridge login (Web SDK left inert); browser → **unchanged** Web SDK + `/api/register-device`.
    **Web push preserved.**
  - `Info.plist` — `ONESIGNAL_APP_ID` placeholder (operator replaces with the public id).
  - Validated: lint (0 new errors), web build ✓, `npx cap sync ios` ✓, **unsigned iOS build
    `BUILD SUCCEEDED`** (App now links `OneSignalFramework` + WebKit; AppDelegate compiles).
  - **Operator actions to make push DELIVER (config side):** (1) Apple Developer → create
    **APNs Auth Key** + enable **Push** on App ID `com.remynest.app`; (2) **OneSignal dashboard**
    → add the iOS platform with that APNs key (Key ID, Team ID, bundle id), under the **same**
    OneSignal app as web; (3) replace `ONESIGNAL_APP_ID` in Info.plist with the real id;
    (4) set signing **Team** → archive → TestFlight; (5) on device, confirm the iPhone shows
    as an **iOS** subscription in OneSignal and a reminder delivers.
- **TestFlight Readiness — Phase A+B (code portion)** (no new features; no schema change).
  Cleared the code-ownable launch-gap items from the TestFlight Readiness Report:
  - **iOS permission strings** — added `NSCameraUsageDescription`,
    `NSPhotoLibraryUsageDescription`, `NSPhotoLibraryAddUsageDescription` to
    `ios/App/App/Info.plist` (fixes on-device camera/library crash; copy from
    `compliance/07`). **No microphone string** (voice not shipped — per `09`/`12`).
  - **Push scaffolding** — `ios/App/App/App.entitlements` (`aps-environment=development`)
    + `UIBackgroundModes=[remote-notification]` in Info.plist, now **linked into the build**
    via `CODE_SIGN_ENTITLEMENTS = App/App.entitlements` in `project.pbxproj` (Debug+Release).
    Validated: `plutil -lint` OK, `xcodebuild -showBuildSettings -scheme App` resolves the
    entitlement. The Push capability is wired in the project (no manual Xcode link needed) —
    operator still enables Push on the App ID + sets the signing Team.
  - **Stripe cancel** — new `app/api/stripe/cancel/route.ts`: cancels at period end
    (`cancel_at_period_end`), resolves customer by email like checkout, structured
    non-throwing results; webhook syncs the profile. Fixes the BillingSection cancel
    button (was a 404). Pairs with the existing `/api/stripe/portal`.
  - **OneSignal cleanup** — removed dead `/api/save-onesignal` + `/api/save-subscription`
    (wrote to the non-existent `users` table via anon client; no references). Real push
    registry remains `/api/register-device` (called by `OneSignalInit.tsx`, Web SDK).
  - **Sentry validation** — `scripts/validate-sentry-env.mjs` + `npm run validate:sentry-env`
    (read-only preflight; locally reports all 5 vars MISSING — confirms the prod gap).
  - Validated: lint (no new errors — 6 pre-existing generated-worker errors only),
    build ✓ (cancel route present, dead routes absent), plists `plutil`-OK.
  - **iOS build-ready (validated 2026-06-12):** `npx cap sync ios` clean
    (onesignal-cordova-plugin@5.3.11 recognized, `pod install` OK); **unsigned simulator
    build `BUILD SUCCEEDED`** (Xcode 26.5) with the Push entitlement linked. The native
    project compiles end-to-end — only **code signing** (Development Team + provisioning,
    both requiring the Apple Developer account) remains before `xcodebuild archive` /
    Xcode Organizer → App Store Connect upload.
  - **Operator / Xcode-required (cannot be performed or validated from the CLI env):**
    (a) create APNs auth key in Apple Developer portal → upload to OneSignal; (b) enable
    **Push Notifications** on the App ID + set the signing **Team** (the `App.entitlements`
    file is already linked via `CODE_SIGN_ENTITLEMENTS` — no manual Xcode link needed);
    (c) native OneSignal push for the **remote-URL** WebView
    is non-trivial — the cordova plugin JS isn't injected into the remote page, so it needs
    a dedicated native-init task (track separately); (d) set the 5 **Sentry env vars in
    Vercel** (`vercel env add …`); (e) run the **physical-iPhone QA** workflow — full
    checklist in `docs/QA_TESTFLIGHT_DEVICE.md`; (f) **replace the placeholder app icon** —
    the current `AppIcon-512@2x.png` is the **default Capacitor placeholder** (blue
    cross-hatch), an App Store 2.3.7 reject risk; regenerate the iOS icon from the RemyNest
    brand (`/public/logo.png` / Remy mark). The icon set is structurally complete (modern
    single-size 1024) — only the artwork must change.
  - **Re-validated 2026-06-12 (build-readiness):** `npm run lint` (6 pre-existing errors,
    0 new), `npm run build` ✓, `npx cap sync ios` clean, **unsigned iOS simulator build
    `BUILD SUCCEEDED`**. Version 1.0 (build 1) — bump `CURRENT_PROJECT_VERSION` per upload.
    Entitlements linked in Debug+Release. **The only gate to archive is the signing Team
    (operator selects it in Xcode).**
- **Resting avatar crop finalized** (`remy-sprite-map.ts` only — resting line + comment;
  the other 8 moods byte-identical). Visual review on `/dev/remy-avatar-test` flagged
  resting as the last bad mood (face too far left, too much body, head too small). Root
  cause: `{0.783,0.658,0.085,0.085}` started above the sprite (top whitespace), ran right
  into the empty gap so the bird sat left, clipped the pendant, and caught the neighbor's
  gold pendant on the right edge. Re-measured by **decoding the 1254² PNG and visually
  inspecting extracted crops** (not guessing): resting is a **curled sitting bird** (NOT a
  bust) — bounds x[0.775-0.857] y[0.670-0.756], closed eyes ≈ (0.806,0.708), heart pendant
  ≈ (0.798,0.742). New crop **{0.77,0.665,0.088,0.088}** centers the whole bird
  head-forward: closed eyes + beak + scarf + pendant in, head ≈ 63% (matches the busts),
  no neighbor bleed (singing bird ends 0.766 left, wing starts 0.871 right, strutter feet
  end 0.649 top, UI panel starts 0.79 bottom). Validated by rendering the exact crop with
  the same normalized→background-position math; `next dev` /dev page 200, blueprint asset
  200 image/png; lint (no new errors — 6 pre-existing `no-assign-module-variable` in
  generated workers), build (49 routes). **All 9 moods now calibrated.**
- **Removed: temp avatar QA tooling** (all 9 moods calibrated → the QA grid is no longer
  needed). Deleted `app/dev/remy-avatar-test/` (and the now-empty `app/dev/`), removed the
  `/dev` exemption from `middleware.ts` `PUBLIC_ROUTES`, and removed the dev-only
  avatar-test link from the dashboard header. `Link` import kept (still used elsewhere on
  the page). No route now exposes the calibration grid. Verified: build ✓ (**48** static
  pages, was 49 — the `/dev` page is gone), lint unchanged (6 pre-existing
  generated-worker `no-assign-module-variable` errors, none introduced here), and the
  dashboard header avatar still renders from the blueprint sheet (`DashboardHeader` →
  `<RemyAvatar mood={remyHeaderMood}>`).
- **Avatar crop calibration — 4 problem moods finalized** (`remy-sprite-map.ts` only).
  After visual review on `/dev/remy-avatar-test`, re-measured welcoming/reflecting/
  neutral/resting from the decoded 1254² PNG (row/column band profiling — no
  guessing) and fixed: **welcoming** {0.846,0.79,0.1,0.1}→{0.868,0.796,0.1,0.1}
  (drop the purple speech-bubble blob at x≤0.868, center the bird at x[0.871-0.962]);
  **neutral** {0.817,0.175,0.17,0.17}→{0.832,0.199,0.145,0.145} (row2 bust
  y[0.207-0.335]; old crop started at 0.175 → showed row1's pendant); **reflecting**
  {0.821,0.307,0.17,0.17}→{0.835,0.338,0.145,0.145} (row3 bust y[0.346-0.475]);
  **resting** {0.792,0.57,0.12,0.12}→{0.783,0.658,0.085,0.085} (the eyes-closed
  sprite is Poses row2-middle y[0.671-0.751]; old crop at y0.57 was the wrong/row1
  sprite). Validated: all 9 in-bounds+square, no clipping, no neighbor bleed; the 5
  GOOD moods (listening/thinking/analyzing/sharing/celebrating) unchanged. lint
  clean; build (49 routes).
- **Avatar crop calibration (all 9 moods)** (`components/remy/avatar/remy-sprite-map.ts`
  only — architecture/middleware/mood-system/dashboard/animation untouched). The crop
  regions were too loose (included stars/wing-tips/surrounding art). Measured the real
  sprite positions by decoding the 1254² blueprint PNG (pure Node zlib) and computing
  the foreground bounding box / centroid per mood window, then set tight **square**,
  head-centered crops (head + scarf + heart pendant, no labels/stars): In-App busts
  0.10² at y0.79 (below stars, above the dark labels), Expressions faces 0.17² (drawn
  larger on the sheet → same in-avatar head size), resting 0.12² on the head (excludes
  feet). All 9 in-bounds + square; centers within ~0.01–0.02 of measured centroids.
  Validated: lint clean, build (48), asset 200 image/png, dashboard 307 (auth intact).
  Final framing should be eyeballed once in-browser; nudge values in the one file.
- **Fix: static assets redirected by auth middleware** (`middleware.ts`). Root cause:
  the matcher excluded only `_next/*` + a named allowlist, so `/remy/remy-blueprint.png`
  entered the middleware; being neither protected, public, nor allow-listed, the
  catch-all `!user && !publicRoute` branch 307-redirected it to `/login`, which (for an
  authenticated session) bounced to `/dashboard` — so the avatar's `<img>`/CSS
  background received HTML, errored, and showed the gold-heart fallback. Fix:
  `isBypassRequest()` now bypasses `/remy/` **and any path with a file extension**
  (`/\.[a-zA-Z0-9]+$/`) so all `/public` static files serve directly; the matcher also
  excludes `remy/` (middleware never runs for the sheet). Validated against the running
  prod server: `/remy/remy-blueprint.png` → **200 image/png (2.12 MB)**, `/logo.png` →
  200, `/dashboard` (unauth) → **307 /login** (auth unchanged). The Remy avatar sprite
  sheet now serves real artwork instead of the fallback. No auth weakening; app
  routes/`/api/*` (no file extension) are unaffected.
- **Remy Avatar Evolution V1** (UI only; no DB/queries/AI; character NOT redesigned).
  Maps the existing Remy intelligence onto the emotional/visual states in the
  official **Remy Avatar Blueprint** (the canonical spec).
  - **Architecture (`components/remy/avatar/`):** `remy-moods.ts` — canonical
    `RemyMood` (welcoming/listening/thinking/analyzing/reflecting/sharing/
    celebrating/resting/neutral) each grounded in a blueprint state
    (`REMY_MOOD_SPECS`), + the **state mapping** `REMY_CONTEXT_MOOD` /
    `remyMoodForContext(context)`. `remy-assets.ts` — mood → `RemyAvatarAsset`
    (`src` = official `/public/remy/remy-<mood>.png`, **null until provided** →
    brand-styled fallback: Remy's purple palette + the mood's expression glyph).
    `RemyAvatar.tsx` — `<RemyAvatar mood size />` (xs–xl), renders official art
    when present else the fallback; mobile responsive; a11y (role=img/alt or
    decorative). Existing `components/remy/RemyAvatar.tsx` (companion ✦) left
    untouched.
  - **State mapping:** dashboard→welcoming · notifications→sharing · timeline→
    analyzing · story-mode/biography/memory-book→reflecting (Thoughtful) · family→
    sharing (caring) · milestone→celebrating. Each maps to a blueprint state; no
    invented expressions.
  - **Integration:** `DashboardHeader` now renders `<RemyAvatar size="lg">`; the
    dashboard derives the header mood from existing notifications (a new chapter/
    family discovery → **celebrating**, else welcoming) — **no new query**.
  - **Validation:** real data → header shows celebrating Remy (chapter notification
    present); mapping verified for all surfaces; lint clean; build passes (48
    routes). **Scalability:** O(1) static render + constant-time mood lookups; 0
    queries, 0 DB; header derivation O(notifications ≤ 10). Constant at any scale.
  - **Future:** drop the official blueprint exports into `/public/remy/` and set
    `src` in `remy-assets.ts` — every surface (web/iOS/Android/notifications/voice/
    Story Mode/Biography/Memory Book) gains the real art with no other change; the
    same `RemyMood` + mapping drive future animation/Voice Engine V2.
  - **Sprite-sheet pass (current):** replaced the 9 per-mood PNGs with ONE
    blueprint sprite sheet `/remy/remy-blueprint.png`. New
    `components/remy/avatar/remy-sprite-map.ts` (`BLUEPRINT_SRC`, `REMY_SPRITE_MAP`
    of normalized `{x,y,w,h}` crop regions per mood, `remySpriteStyle()` →
    background-size/position math) + `RemyAvatarSprite.tsx` (pure-CSS crop).
    `RemyAvatar` now renders `RemyAvatarSprite` layers (crossfade preserved) and
    falls back to the gold-heart brand mark if the sheet is absent (a hidden
    `<img>` onError detects it). `remy-assets.ts` dropped the per-mood `src` (keeps
    alt/ring/gradient). Mood map: In-App-Usage busts → listening/thinking/
    analyzing/sharing/celebrating + Chatting→welcoming; Expressions → neutral/
    reflecting; Poses → resting. Regions are calibrated to the blueprint layout and
    tunable in one file. Validated: all 9 regions in-bounds, valid crop math; lint
    clean; build (48). **Scalability:** one image (one fetch, browser-cached) shared
    by every avatar; crop is pure CSS, O(1) per avatar; no DB/queries. **Asset
    step:** drop `remy-blueprint.png` in `/public/remy/` (cannot be generated
    in-repo) — recalibrate `remy-sprite-map.ts` if the export framing differs.
  - **(superseded) Real-artwork pass:** emoji rendering **removed**. `RemyAvatar` rendered
    Remy's real art via `next/image` from `/remy/remy-<mood>.png` (set in
    `remy-assets.ts`; `remy-moods.ts` `cue` replaced the emoji), with a **smooth
    crossfade** between moods (`.remy-fade-in` keyframe in `globals.css` + a
    two-layer stack) and a **brand fallback** (Remy's purple + gold heart pendant
    SVG — never an emoji) when an export is absent. **Asset contract** in
    `public/remy/README.md`: 9 square transparent bust PNGs (`remy-<mood>.png`)
    cropped from the blueprint sprites. NOTE: the raster PNGs are a design/export
    step (cannot be generated in-repo) — the code renders them the instant they're
    added; until then the brand fallback shows. No redesign, no new moods, no
    DB/queries/AI; V1 architecture intact.
- **Export Engine V1 — PDF-ready export layer** (read-only; no cloud/sharing/
  email/AI/migrations). Converts a MemoryBook/Biography into a printable document
  and generates a PDF via the browser print engine (zero new deps).
  - **Architecture (3 parts):** (1) `lib/remy/export-document.ts` — pure flattening
    of `MemoryBook`/`Biography` into an `ExportDocument {title, subtitle, blocks[],
    meta}` of `ExportBlock {type: title|subtitle|heading|subheading|paragraph|
    divider|pagebreak, text?}` (`buildExportDocumentFromMemoryBook` /
    `…FromBiography` / `buildExportDocument`); reuses prose verbatim, generates
    nothing, returns null when empty. (2) **PDF generation:** print page
    `app/(app)/memory-book/print/page.tsx` assembles the same book the dashboard
    builds (chapters/collections-details/connections/coverage/family → story →
    biography → book), renders `ExportDocumentView` (serif, page-break blocks),
    print-isolated via `#remy-export` CSS in `app/globals.css`. (3) **Download
    flow:** `PrintButton` (`window.print()` → Save as PDF) + an "Export as PDF →"
    link on the dashboard Memory Book.
  - **Validation (real data):** book → ExportDocument of 26 bounded blocks (title,
    subtitle, divider, Contents + 5 TOC, 5 sections each pagebreak+heading+content,
    5 page breaks). Empty account → book null → print page shows "Nothing to export
    yet" + /memory-dates link. lint clean; build passes (48 routes; /memory-book/print).
  - **Scalability:** export model = 0 queries, O(sections + chapters + paragraphs)
    (~≤50 blocks) → constant. Print page = ~6 bounded model reads, **on-demand only**
    (off the dashboard hot path). PDF = browser print over a bounded doc; no server
    PDF lib, no deps, no N²; constant at 10/100/1k/10k memories. **Future:** a PDF
    library or print/share/cloud consume the same `ExportDocument` unchanged.
- **Remy Memory Books V1 — structured book model** (read-only; no AI/queries/
  migrations/schema). NOT PDF/print/share/AI — the deterministic book structure
  future export/print/share will consume. Pure COMPOSITION of Biography V1 (+
  Story Mode chapter titles) into a cover + table of contents + navigable book.
  - **Investigation:** Biography V1 already contains every book section as prose
    (Introduction/Life Chapters/Important Themes/Connected Stories/Family Impact/
    Reflection); Story Mode supplies titled per-chapter entries. Reuse verbatim;
    recompute nothing; empty biography → empty book.
  - **Architecture:** `lib/remy/memory-book.ts` — `getRemyMemoryBook({biography,
    stories})` PURE (0 queries) → `MemoryBook {title, subtitle, cover, tableOfContents[],
    sections[]}`; `MemoryBookSection {id, title, paragraphs[], chapters?, href?}`;
    `MemoryBookChapter {id, number, title, paragraphs[], href?}`. Each biography
    section → a book section (in order); the "Life Chapters" section carries titled
    `MemoryBookChapter` entries from Story Mode; TOC = numbered section list.
    Returns null when biography is null.
  - **UI:** `components/remy/RemyMemoryBook.tsx` — book preview: cover + contents
    navigator (click a chapter to read it; client state, no nested scroll); mobile
    responsive (TOC wraps above content); hidden when null. Preview only — no
    export/PDF.
  - **Placement:** Biography → **Memory Book** → Collections/Connections/Chapters —
    the bound, navigable book form of the biography, above the drill-downs.
    Progression: Timeline → Story Mode → Biography → Memory Book → drill-downs.
    0 query delta.
  - **Validation (real data):** "A Life in Memories" (1980) · 5 TOC entries
    (Introduction, Life Chapters, Important Themes, Connected Stories, Reflection)
    · Life Chapters → 1 chapter ("The 1980s"); empty account → null → hidden.
  - **Scalability:** 0 queries; transform O(biography sections + stories) — both
    bounded → constant; render shows one active section. No memory-proportional
    work, no N², constant at 10/100/1k/10k memories. **Future:** PDF export /
    printing / sharing consume the same `MemoryBook` model unchanged.
- **Remy Biography V1 — structured life narrative** (read-only; no AI/migrations/
  schema/raw-memory queries). NOT AI writing / LLM / chatbot — a pure COMPOSITION
  that assembles a long-form life document from existing intelligence, reusing
  existing summaries verbatim and only templating plain facts (counts, spans).
  - **Investigation:** all narrative info already exists — Story Mode `summary`
    (ready chapter narratives), Chapters/Collections/Connections summaries, Family
    observations/members, `coverage.total/dated`. No per-user memory total beyond
    `coverage` (used for intro/reflection). Sparse → fewer sections; empty → null.
  - **Architecture:** `lib/remy/biography.ts` — `getRemyBiography(input)` PURE (0
    queries) → `RemyBiography {title, subtitle, sections[]}` /
    `RemyBiographySection {id, title, paragraphs[], href?}`. Sections (omitted when
    empty): **Introduction** (facts), **Life Chapters** (reuses Story Mode
    narratives, else chapter summaries), **Important Themes** (collection summaries),
    **Connected Stories** (deduped connection summaries, diverse only), **Family
    Impact** (family members + shared-theme observation), **Reflection** (facts).
    `null` when no chapters/collections/connections/family.
  - **UI:** `components/remy/RemyBiography.tsx` — readable document style (serif-ish
    title, span subtitle, prose sections in a `max-w-2xl` column, Explore links);
    mobile responsive; no nested scroll / fixed heights; hidden when null.
  - **Placement:** Timeline → Story Mode → **Biography** → Collections/Connections/
    Chapters. The long-form culmination of the narrative layers (chronology →
    guided journeys → full document), above the analytical drill-downs. 0 query
    delta (reuses already-computed intelligence).
  - **Validation (real data, top user):** "A Life in Memories" (1980) — Introduction
    (45 memories · 1 chapter) · Life Chapters ("The 1980s was a period shaped by
    Personal Memory and Social.") · Important Themes (Health & Fitness / Fitness
    summaries) · Connected Stories (deduped) · Reflection (2 of 45 placed in time);
    Family omitted single-profile; empty account → null → hidden.
  - **Scalability:** 0 queries; synthesis O(stories + chapters + collections +
    connections + family) all bounded → constant; render O(sections × paragraphs)
    ≤ ~25. No memory-proportional work, no N², constant at 10/100/1k/10k memories.
    **Future:** PDF/voice/sharing consume the same `RemyBiography`; richer prose as
    date adoption adds chapters and cross-era connections.
- **Remy Story Mode V1 — guided narrative journey** (read-only; no AI/migrations/
  schema). NOT AI generation / biography writer / chat — a pure COMPOSITION over
  existing intelligence, built on the Timeline V1 chapter backbone.
  - **Investigation:** narrative primitives already exist — Life Chapters
    (`title`, `summary`, `startYear/endYear`, **`themes[]`**), Collections
    (`id`=category slug, `summary`, year range), Connections (`summary`,
    `startYear/endYear`, `spansEras`, `diversityScore`). Story paths buildable
    today: one story per chapter; sections = chapter `themes[]` (linked to matching
    Collections by `slugify(theme)===collection.id`) + overlapping Connections;
    narrative composed from themes + `chapter.summary`. Recompute nothing; fetch no
    raw memories.
  - **Architecture:** `lib/remy/story-mode.ts` — `getRemyStories(input)` PURE (0
    queries). `RemyStory {id, title, summary, startYear, endYear, sections[],
    href}`; `RemyStorySection {id, title, description?, href?, kind:"theme"|
    "connection"}`. One story per chapter (chronological, cap 8); ≤3 theme + ≤2
    connection sections; narrative "The 1980s was a period shaped by X and Y.".
  - **UI:** `components/remy/RemyStoryMode.tsx` ("Story Mode") — card-based journey
    (title · range · narrative · vertical section rail with Explore links · "Walk
    through <chapter>"); mobile responsive; no nested scroll / fixed heights;
    hidden when empty.
  - **Dashboard placement:** Timeline → **Story Mode** → Collections/Connections/
    Chapters. Sits directly after the Timeline backbone and above the drill-downs:
    timeline plots chronology, Story Mode walks it, sections are deep exploration.
  - **Validation (real data, top user):** 1 story — "The 1980s" → summary "The
    1980s was a period shaped by Personal Memory and Social." → sections Personal
    Memory → Social → nav /chapters/1980s; empty account → [] → hidden.
  - **Scalability:** 0 queries (reuses chapters/collections/connections already
    computed). Synthesis O(chapters × (themes + connections)), all bounded
    (chapters ≤ #decades, cap 8; ≤3 themes; ≤ connections window) → constant;
    render O(stories × sections) ≤ ~40. No memory-proportional work, no N², constant
    at 10/100/1k/10k memories. **Future:** Story Mode V2 / Biography Generator
    consume the same `RemyStory[]`; connection sections enrich as date adoption
    creates cross-era overlaps.
- **Remy Timeline V1 — visual narrative layer** (read-only; no AI/migrations/
  schema). NOT a calendar / list of memories / new engine — a pure SYNTHESIZER
  that turns existing intelligence into a chronological story.
  - **Investigation:** timeline is fully buildable from already-computed dashboard
    intelligence. Year availability: Life Chapters V2 (`startYear` always) ✅,
    Connections V2 (`startYear` always; use `spansEras` only) ✅, Collections V2
    (`startYear` only with `includeDetails`) ⚠️, date-coverage = counts only.
    Reuse `RemyLifeChapter`/`RemyConnection`/`RemyCollection`; do NOT re-derive or
    fetch raw dated memories.
  - **Architecture:** `lib/remy/timeline.ts` — `getRemyTimeline(input)` PURE (0
    queries) → `RemyTimelineEvent {id,title,description,year,category,href,
    priority}`; categories `chapter|collection|connection|memory|family`. Events:
    each chapter ("The 1980s became a chapter" @ decade), each cross-era
    connection ("A connected story spans these years" @ startYear), each detailed
    collection ("<Theme> memories begin appearing" @ startYear). Sort **year asc**
    (ties: priority chapter 90 > connection 75 > collection 70), cap 24.
    `groupTimelineByYear` for rendering.
  - **UI:** `components/remy/RemyTimeline.tsx` ("Your Story") — vertical timeline
    with a left rail + year dots → year → event title → description; mobile
    responsive; no nested scroll / fixed heights; hidden when empty.
  - **Dashboard placement:** rendered immediately **above the Collections/
    Connections/Chapters drill-down trio** (it's their narrative parent — story
    first, then explore). The only query delta: the existing dashboard collections
    call now uses `includeDetails:true` (one bounded member fetch) so collections
    carry a year; Timeline itself adds **0 queries**.
  - **Validation (real data, top user):** 1980 "The 1980s became a chapter" →
    2026 "Health & Fitness / Fitness memories begin appearing"; chronological;
    no cross-era connections (all ~2026); empty account → hidden.
  - **Scalability:** Timeline = O(chapters + collections + connections), all
    already bounded (≤4 each on dashboard; intrinsically #decades / #categories /
    window), event cap 24, render O(≤24). **0 timeline queries** (net dashboard
    delta +1 bounded collections detail fetch). Constant cost at 10/100/1k/10k
    memories; no N². **Future:** Story Mode, Biography Generator consume the same
    events; family milestones plug into the reserved `family` category.
- **Remy Notifications V1 — intelligence-driven updates layer** (read-only; no
  push/email/persistence/cron/AI/migrations). The synthesis engine that turns
  existing Remy intelligence into ranked notification candidates; future Digest
  Emails / Push will CONSUME this rather than re-deriving.
  - **Investigation:** `generateRemyObservations()` = `RemySignals → RemyObservation[]`
    (`{id,surface,tone,mood,priority,text,cta?}`, priority desc, tone→mood);
    surfaces are Remy Companion / Remy Activity / Family Intelligence. All
    notification inputs are **already computed on the dashboard** — `remyDateCoverage`,
    `remyCollections`, `remyConnections`, `remyLifeChapters`, `familyIntelligence`.
  - **Architecture decision:** `getRemyNotifications(input)` is a **PURE synthesizer**
    (no DB, no queries) consuming those already-computed outputs — no duplicated
    business logic, Notifications = single source of truth.
  - **Model** `lib/remy/notifications.ts`: `RemyNotification {id, priority, title,
    message, category, href, createdAt}`; categories `memory-date | collection |
    connection | chapter | family`. **Ranking:** chapter 90 > family-shared 85 >
    collection 80 > connection-cross-era 72 / connection 65 > family-active 55 >
    memory-date 40; sort desc, cap 10. Reuses `formatChapterRange`/
    `formatCollectionRange` and maps `family.observations` directly.
  - **Dashboard:** `components/remy/RemyNotifications.tsx` ("Remy Updates") — the
    EXACT Remy Activity pattern (3 visible, "Show more →"/"Show less", in-place,
    no nested scroll, no fixed heights, mobile responsive); hidden when empty.
    Placed **between Remy Activity and Collections** in `dashboard/page.tsx`.
  - **Validation (real-data-shaped):** visible = The 1980s chapter (90) · Fitness
    largest collection (80) · connected story (65); show-more = Family activity
    (55) · dates nudge (40); empty account → hidden. Date/Collection/Connection/
    Chapter/Family sources each produce their notification when present.
  - **Scalability:** notifications add **0 queries** and **0 scans** — pure synthesis
    over already-bounded inputs (collections/connections/chapters limited to 4 on
    the dashboard; family bounded). Cost is **O(1)** w.r.t. memory volume, identical
    at 100/1k/10k memories; dashboard impact = +1 pure call + 1 component.
- **Family Workspace Intelligence V1** (read-only; no schema/migrations/AI;
  intelligence only — no notifications/alerts/predictions). First family-level
  layer above Memory Dates / Collections V2 / Connections V2 / Life Chapters V2.
  - **Investigation:** `memory_profiles` = `id, created_at, profile_name,
    preferred_name, date_of_birth, profile_photo, created_by_account_id,
    subscription_status` (6 rows; **max 2 profiles per owner** — families are
    small). `getAccessibleProfiles()` (owned ∪ caregiver, deduped) is **already
    fetched on the dashboard** → reused, no new profile query. Memories carry
    `memory_profile_id`; clusters do NOT, so per-profile **collection count** =
    Collections-V2 category model per profile (categories with ≥3 memories) and
    **chapter count** = Life-Chapters-V2 decades among that profile's dated
    memories — all from ONE scoped `memories` read.
  - **Model** `lib/remy/family.ts` (`getFamilyIntelligence(profiles)`): single
    `memories.in("memory_profile_id", ids)` query → per-profile {memoryCount,
    datedCount, chapterCount, collectionCount, lastActivityAt}, aggregated family
    **themes** (top categories + how many members share each), and **observations**
    (RemyObservation, surface "caregiver"): "Most recent activity is centered
    around <name>." / "Several family members share <Theme> memories." (≥2 members)
    / "Most family memories still need dates." (<50% dated → /memory-dates).
  - **Dashboard:** `FamilyOverview` (members + observations, relative "last memory"
    time) + `FamilyThemes` (theme chips), shown only when **≥2 accessible profiles
    AND the family has memories**. Mobile responsive; graceful (hidden otherwise).
  - **Real-data result:** family "Mary, test" → Mary (60 memories · 2 dated · 1
    chapter · 3 collections · last 2 days ago), test (No memories yet); themes
    Health & Fitness / Fitness / Technology…; observations "centered around Mary"
    + dates nudge (3% dated).
  - **Scalability:** one query + JS aggregation, **O(profiles + rows)**; bounded —
    `MAX_PROFILES=50` (IN clause) + `ROW_CAP=8000` (rows). 10/100 profiles fast +
    accurate; **1000** profiles → only first 50 processed + 8000-row cap
    (approximate) — real families are tiny, so a materialized per-profile rollup /
    aggregate RPC is the future path for org-scale. **Limitations:** clusters have
    no profile link (collection count is the per-profile category proxy); user/
    profile counts are recent-window-approximate past the row cap. **Future:**
    dedicated /family page, per-profile drill-down, cross-member Connections.
- **Life Chapters V2 — time-based life periods** (read-only; no
  schema/migrations/AI; existing fields only). Rewrote `lib/remy/life-chapters.ts`;
  pages/components updated (no route changes).
  - **Investigation:** V1 grouped by `ai_category` → fragmented, present-dated
    pseudo-chapters ("Cognition 2026", "Request 2026") — technical groupings, not a
    life, because <3% of memories are dated so effective dates collapsed to 2026.
  - **Architecture decision — chapters from TIME:** build chapters from memories
    with a real historical `memory_date`, grouped into **decade periods** ("The
    1980s") via the shared effective-date helper. Dominant **themes** per period
    reuse the Collections V2 category model (`connectedCollections` = distinct
    themes in the era); the "spans multiple periods" framing is the Connections V2
    counterpart. A one-line narrative **summary** is derived from the themes
    ("A period centered on Family." / "A period spanning Family and Travel."). All
    three Remy layers (Collections/Connections/Chapters) now rest on the same
    date + theme primitives.
  - **Thresholds / graceful degradation:** gated on **≥2 dated memories** total
    (`MIN_TOTAL_DATED`); otherwise returns empty → the /chapters page shows an
    actionable empty state linking **/memory-dates** (dating is the prerequisite).
    No fabricated present-day topics. Grows as Memory Date Adoption fills dates.
  - **Real-data result:** V1 = ~19 topical "category 2026" pseudo-chapters; V2 =
    **one real chapter "The 1980s"** (2 memories; themes Personal Memory · Social).
  - **Scalability:** one bounded read — dated memories, user-scoped, `limit 600`,
    `memory_date IS NOT NULL`. Grouping O(dated memories); no per-chapter queries,
    no full-table scans, no N². Dashboard (`sort:"count"`, top 4) stays light;
    /chapters is chronological.
- **Connections V2 — meaningful relationship discovery** (read-only; no
  schema/migrations/AI; existing stored relationships only). Rewrote
  `lib/remy/connections.ts`; pages/components updated to narrative (no regressions).
  - **Investigation:** V1 ranked by raw graph **degree** and led with "{N}
    connected moments"; the production graph is a near-single-theme clique
    (degrees ≤17) → true but redundant. Relationships mostly link same-`ai_category`
    memories. Reuses memory `ai_category` (theme) + effective dates (era) already
    fetched — no extra query. No similarity/score surfaced.
  - **Architecture decision — diversity ranking, not degree:** for each anchor +
    its connected memories, compute distinct **themes** (categories, each needing
    **≥2 members** to count — robust to category noise) and **eras** (decades).
    `diversityScore = (spansEras?2:0) + (spansThemes?1:0)`. Sort by score → degree →
    recency. **Reduce redundancy:** single-theme (score 0) hubs are collapsed to one
    strongest representative per theme (titled by the theme); diverse connections
    are kept individually (titled by the anchor memory).
  - **Human-language strategy:** lead with a narrative **summary** (no count
    headline): cross-era+theme → "This story reaches across different periods and
    themes of life."; cross-era → "This story spans multiple periods."; cross-theme
    → "These memories may be part of the same story."; single-theme → "These
    memories share a common theme." Never exposes similarity/vector/score/
    relationship_type.
  - **Detail page:** title, narrative summary, connection count, **date span**
    (`formatConnectionSpan`), **theme hints** (`themes` joined • ), connected
    memories. Dashboard + /connections lead with the summary instead of a count.
  - **Real-data result:** V1 = 18 degree-ranked "{N} connected moments"; V2 = **16**
    (14 cross-theme + 2 collapsed single-theme reps "Health Fitness"/"Fitness"),
    each with narrative copy. (Era spanning is ~0 today because <3% of memories are
    dated; era ranking strengthens as Memory Date Adoption fills in. The residual
    cross-theme inflation is the audit's known category-fragmentation issue —
    category canonicalization is a separate future task, not Connections.)
  - **Scalability:** unchanged read shape — ≤400-memory window + 2 bounded
    relationship `.in(...)` queries; adjacency + per-anchor diversity are **O(memories
    + edges)**, no per-connection queries, no N² traversal, no relationship
    recompute. Dashboard stays lightweight (top-N); graceful empty preserved.
- **Collections V2 — deduplicated, thematic collections** (read-only; no
  schema/migrations/AI; existing fields only). Rewrote `lib/remy/collections.ts`;
  the components/pages are unchanged (no regressions).
  - **Investigation (real production data):** `memory_clusters` (12 rows) has
    `id,user_id,title,summary,category,emotional_theme,created_at`;
    `memory_cluster_items` = `cluster_id,memory_id,similarity`. Duplicates appear
    because groupings are created **one-per-created-memory**, so similar memories
    spawn near-identical groupings. V1 `collectionTitle` preferred the grouping's
    `title` (= anchor memory's ai_title) BEFORE `category`, and the only filter was
    `memoryCount > 0` — hence three memory-titled "…Gym Workout" collections, all
    `category="Fitness"`, drawn from the same pool. Confirmed: the 3 Fitness
    clusters union to **15 distinct** members; every other category has 0 members.
  - **Architecture decision — theme-first consolidation:** group underlying
    groupings by their existing **`category`** and union members. Collapses
    same-theme duplicates (Fitness 3→1), produces thematic titles, and is **linear
    O(clusters + items)** — no pairwise O(clusters²) overlap scan. Subsumes
    membership-overlap dedup for the production data (the duplicates share the
    category).
  - **Dedup strategy (exact):** two groupings belong to the same collection iff
    `slugify(category)` is equal; membership = the UNION of their
    `memory_cluster_items`. Collection `id` is now the **category slug** (e.g.
    `fitness`); the detail page resolves by slug.
  - **Title priority:** category → summary → title. Grouping is BY category, so a
    shown collection's title is always its (Title-Cased) category — a memory title
    can never become the title. Summary = representative grouping's `summary`;
    themes = top member moods (fallback `emotional_theme`).
  - **Threshold rules:** category non-empty, non-generic
    (`general/uncategorized/memory/other/""`), non-technical; AND **≥3 distinct
    members**. Otherwise omitted → graceful empty (no fabrication).
  - **Dashboard impact (real data):** V1 showed 3 near-identical Fitness
    collections; **V2 shows exactly one — "Fitness" (15 memories)**.
  - **Scalability:** bounded reads — `fetchClusters` orders by `created_at` desc,
    `limit 500` (recent window); items only for those clusters; member fetch capped
    at 1000. Complexity O(clusters + items); no per-collection queries, no repeated
    full memory scans, no N². Output bounded by distinct categories at 100/1k/10k.
- **Dashboard Remy Activity — concise summary card** (presentation-only): the
  dashboard "Remy Activity" section behaves like a concise summary, not an
  ever-growing feed. Shows the **3 most recent** items by default; a footer CTA
  (**"Show more →" / "Show less"**) expands/collapses **in-place** when >3 exist
  (`expanded ? activities : activities.slice(0,3)`; CTA only when
  `activities.length > 3`). No nested scroll containers; **descriptions don't
  truncate** (wrap via `break-words`); mobile responsive (full-width CTA on small
  screens); `aria-expanded` for a11y. `components/remy/RemyActivityFeed.tsx` only.
  - **Investigation findings (for future Activity Log / Remy Insights split):**
    Component = `components/remy/RemyActivityFeed.tsx`; model =
    `lib/remy/activities.ts` (`buildRemyActivities` pure builder +
    `fetchRemyActivitySources`); integration = `app/(app)/dashboard/page.tsx`
    (builds activities → `<RemyActivityFeed>`; separately
    `generateRemyObservations` → `RemyCompanion`). **Activity items are EVENTS**
    (`historical-preserved`/`memory-added`/`reminder-completed`/
    `collection-discovered`), each from a source row + timestamp — **not
    observations, and NOT a mixture**; observations are a separate system feeding
    the Companion. Generation is **bounded** (`buildRemyActivities` default
    `limit` 8 over a recent window: ≤15 recent memories + recent clusters +
    reminders), so it does not grow at 100/1k/10k memories — the 3-item preview
    keeps the card concise at any scale. **Future separation is straightforward &
    non-breaking:** an *Activity Log* page would render `buildRemyActivities` with
    a higher `limit`/pagination; *Remy Insights* would render the existing
    observations system. The two models are already decoupled. (Not implemented —
    no Activity Log, no Remy Insights, no pagination, no infinite scroll.)
  - **Validation:** 0 activities → empty-state copy, no CTA; 1/2/3 → all shown, no
    CTA; ≥4 → collapsed shows 3 + "Show more →", expanded shows all + "Show less".
    No fixed heights → no layout shift; mobile + desktop verified via build.
- **Reminiscence Mode V1** (read-only; existing data only; no AI/embeddings/
  clustering/migrations): the first dedicated caregiver/family memory experience.
  New `lib/remy/reminiscence.ts` (`getReminiscence`) reuses historical (dated)
  memories + the shared date helpers + `signMemories` (for images), grouping them
  into **eras (decades)** by effective date, oldest-first (a life unfolding).
  Workspace-scoped (care profile / My Nest), one fetch, best-effort.
  - **/reminisce**: calm, large-type, large-tap-target experience. Per-era
    sections ("1980s" + a warm Remy line "Let's revisit N memories from the
    1980s.") of image-forward `ReminiscenceCard`s (title · 🕰 memory date · image
    if available · short summary → /memories/[id]). Personal Remy intro using the
    care-recipient's name when present. **Empty state** (0 dated) explains why
    dates matter + links `/memory-dates`; **sparse note** (<3 dated) nudges the
    same while still showing what exists.
  - **Dashboard**: `ReminisceDashboardCard` ("Reminisce together → Start
    reminiscing") shown when dated memories exist — reuses the existing
    `intelligence.historicalTotal` count, **no extra scan**.
  Directly actions the audit's "family-revisit / caregiver-reminiscence" gap.
  Mobile responsive; graceful degradation.
- **Memory Date Adoption V1** (read-only reads + a dedicated date-only write; no
  schema migrations): drives historical-date coverage up to improve every Remy
  narrative layer (only ~3% of memories are dated today). New
  `lib/remy/date-coverage.ts` (`computeCoverage`, `getDateCoverage`,
  `getMemoriesMissingDates`, `coverageMilestone`) — workspace-scoped (care profile
  / My Nest), best-effort. Surfaces:
  - **Dashboard Date Completion Card** (`components/memory-dates/DateCompletionCard`)
    shown when coverage < 50%: total · dated · missing · % complete + "Add memory
    dates" (reuses existing dashboard counts — no extra query).
  - **/memory-dates backfill flow**: lists memories with `memory_date IS NULL`
    (title, preview, added date); per-memory options Exact date / Month + year /
    Year only / Decade only / Not sure (reuses `buildMemoryDate`); a progress bar
    with 0–25/25–50/50–75/75–100 milestones; and a live "Dates you just added"
    session feed (`🕰 Memory date added`, new `memory-date-added` activity kind).
    Saves via a **dedicated server action that updates ONLY `memory_date` +
    `memory_date_precision`** (validated, scoped by user_id) — never touches
    title/content/attachments (the generic PUT would have wiped them), and
    `revalidatePath`s timeline/dashboard so newly dated memories appear instantly.
  - **Intelligence observation**: "Most memories still need dates…" (<50%) or
    "You've dated N% of memories." (reuses `intelligence.historicalTotal`).
  - **Timeline validation**: timeline groups by effective date + is force-dynamic,
    so backfilled memories immediately slot into their historical position and feed
    historical intelligence/observations. Memories have NO `updated_at` column, so
    a timestamped dashboard "date added" event isn't possible without a migration —
    handled gracefully via the on-page session feed (no schema change). Mobile
    responsive; graceful when nothing is missing.
- **Life Chapters V1** (read-only; no schema/migrations/AI; existing data only):
  Remy's **narrative layer**, the top of the stack (Memories → Collections →
  Connections → Life Chapters). New `lib/remy/life-chapters.ts`
  (`getRemyLifeChapters`, `getRemyLifeChapterById`, `formatChapterRange`) groups
  memories deterministically by their EXISTING `ai_category` (assigned at capture —
  no new AI) into narrative chapters: title (the category, Title-Cased; slug = id),
  date range from effective memory dates ("1975 → 1988", "2016 → Present"), memory
  count, dominant themes (top moods), and connected-collection count (collections
  sharing the chapter category). Generic categories are skipped. Sort:
  chronological on `/chapters` (narrative), by count on the dashboard (significance).
  Best-effort/user-scoped (recent ≤600 memories), human language only (never
  cluster/vector/similarity).
  - **Dashboard**: `RemyLifeChapters` section ("I've started identifying important
    chapters in <subject>'s life / your story." → top 4 → "View all chapters →");
    hides gracefully when empty.
  - **/chapters**: chronological `ChapterCard` grid (title · range · count · themes).
  - **/chapters/[id]**: header ("Many of these memories belong to the same period.
    This chapter contains N connected memories.", range, themes, related collections)
    + chronological member-memory list linking to `/memories/[id]` (reuses date
    helpers). Mirrors the older timeline `ChaptersView` concept as a proper Remy
    model + standalone pages. Degrades to empty.
- **Remy Relationship Discovery V1 (Remy Connections)** (read-only; no
  schema/migrations/AI; existing data only): exposes the stored
  `memory_relationships` data as a human **Connections** capability — never
  surfaces "similarity"/"vector"/"embedding"/score. New dedicated model
  `lib/remy/connections.ts` (`getRemyConnections`, `getRemyConnectionById`) is the
  ONLY reader of `memory_relationships` for this feature: user-scoped via
  `.in("memory_id"/"related_memory_id", <user memory ids>)`, best-effort, builds an
  undirected adjacency among the user's accessible memories (recent ≤400), and
  anchors a Connection on a memory + its connected moments (≥2 → a "shared story").
  Each connection: title (anchor memory), theme (anchor category), connectedCount,
  recency. Sorted by connectedCount desc then recency.
  - **Dashboard**: new `RemyConnections` section ("Connections Remy Found —
    Memories that may be part of the same story." → top 4 → "View all
    connections →"); hides gracefully when empty.
  - **/connections**: grid of connection cards (title · N connected moments ·
    "Connected to {theme}").
  - **/connections/[id]**: header (anchor title, "These memories appear connected
    to {theme}." / "…same story.", count, "Open this memory →") + read-only
    connected-memory list linking to `/memories/[id]` (reuses the date helpers).
  Distinct from the memory detail page's live `match_memories` RPC — Connections
  reads the STORED relationships (no recompute). Degrades to empty when missing.
- **Remy Collections V1** (read-only; no schema/migrations/AI; existing grouping
  data only): Remy's "Organize" capability — surfaces existing stored memory
  groupings as human **Collections** (never "cluster"/technical language). New
  dedicated model `lib/remy/collections.ts` (`getRemyCollections`,
  `getRemyCollectionById`, `formatCollectionRange`) is the ONLY reader of
  `memory_clusters` + `memory_cluster_items` for this feature: best-effort,
  user-scoped, 2–3 queries (clusters → item membership → member memories),
  deriving title (sanitized of "cluster"), memory count, date range (effective
  memory dates), and emotional themes (top member moods, fallback
  `emotional_theme`). Sorted by memory count desc then most-recently-active.
  - **Dashboard**: new `RemyCollections` section under Companion + Activity
    ("I've started organizing memories into collections." → top 4 title+count →
    "View all collections →"); hides gracefully when empty.
  - **/collections**: `CollectionCard` grid (title · count · range · themes).
  - **/collections/[id]**: header (title, summary, count, range, themes) + a
    read-only member-memory list linking to `/memories/[id]` (MemoryCard needs
    client edit/delete handlers, so a read-only list reuses the date helpers).
  - **Terminology**: Remy Activity "New theme discovered" → **"New collection
    discovered"** (kind `collection-discovered`, links to /collections); the
    dashboard intelligence observation now says "organized … into N collections"
    (→ /collections). No clustering/generation changed; degrades to empty.
- **Remy Activity Feed V1** (read-only; no schema/migrations/cron/notifications):
  Remy's **evidence layer** — "what Remy noticed", not a notification center or raw
  audit log. New `lib/remy/activities.ts` is deliberately separate from observation
  generation (Signals→Observations *and* Signals→Activities, both off existing
  dashboard data): pure `buildRemyActivities(sources, limit)` + best-effort
  `fetchRemyActivitySources`. New `RemyActivity`/`RemyActivityKind` types. Activity
  kinds (existing data only): **Historical memory preserved** (memory_date set →
  shows the memory date label), **Memory added** (non-historical → memory title),
  **Reminder completed** (reuses the dashboard's `focusReminders` + `completed_at`),
  **New theme discovered** (`memory_clusters`, user-scoped). Every item is
  human-readable (icon + plain title + detail + relative time); no internal system
  language. **Memory updated is intentionally skipped** — no reliable update signal
  on `memories` (no maintained `updated_at`); deferred per spec. New client
  `components/remy/RemyActivityFeed.tsx` renders 5–10 newest-first under the Remy
  Companion ("Remy Activity · Recent things I've noticed"). Built for reuse by future
  notifications / digests / push / family updates. Clusters are user-scoped (same
  limitation as the intelligence count). Gracefully degrades to an empty state.
- **Remy Dashboard Intelligence** (read-only; no schema/migrations): the dashboard
  Remy card is now an intelligence summary engine, not a placeholder counter.
  Added an optional `intelligence` block to `RemySignals` (`RemyIntelligence`),
  computed best-effort in `buildRemySignals` from existing stored data, scoped like
  the dashboard (active care profile / My Nest): historical memories preserved
  (total + this-week + shared decade/era), top + most-recent memory category/theme,
  earliest `memory_date` year (timeline reach), and user-scoped `memory_clusters`
  count. `generateRemyObservations` gained priority-ranked rules that surface real
  summaries — e.g. "Mary's memory archive grew this week — 3 memories from the 1980s
  were preserved.", "I've found 12 memories connected to Family.", "Most recently
  preserved memories relate to Childhood.", "I've grouped your memories into 5
  themes.", "Your timeline now reaches back to 1962." The plain "N new memories this
  week" placeholder is replaced (historical preservation leads; plain weekly count is
  the fallback). All deterministic (no LLM/hallucination), gracefully degrading on
  sparse data; `intelligence` is optional so Insights' `deriveRemySignals` is
  unaffected. Dashboard stays fast (best-effort reads in parallel; one ~250-row
  sample drives the category/era signals). `memory_relationships` left untouched
  (per-profile counting needs a join — too heavy for a fast dashboard).
- **Insights V2 — Remy Insights Center** (read-only; no schema/queries added; all
  existing telemetry preserved): reframes Insights from a statistics dashboard into
  a companion experience. Reuses the existing user-scoped memory/reminder telemetry
  (`fetchInsightsTelemetry`) plus Remy Signals + Observations — added a pure
  in-memory `deriveRemySignals(memories, opts)` to `lib/remy/signals.ts` so Insights
  feeds the SAME observation engine as the dashboard (zero extra queries). New
  `lib/remy/insights.ts` (`buildRemyInsights`) produces the sections: **Remy
  Summary** (reuses `generateRemyObservations` + `RemyCompanion`), **Memory Health**,
  **Routine Health** (follow-through), **Family Engagement** (category breadth /
  family-moment proxy — forward-compatible with caregiver data), **Trends**
  (week-over-week + mood direction), **Achievements** (unlock badges), **Gentle
  Recommendations** (reuses gentle/actionable observations + insight-specific
  nudges). New `components/insights/RemyInsightsCenter.tsx` renders them above the
  charts. `InsightsClient` computes the model in-memory, leads with the center, and
  **keeps every existing chart** under a "Detailed analytics" heading. No
  cron/lifecycle/billing/auth changes.
- **Historical Memory Creation** (additive; existing memories unchanged;
  migration LIVE in production): memories can be dated to any past moment. A
  memory carries `created_at` (insertion, unchanged) plus optional `memory_date`
  + `memory_date_precision` (`day`/`month`/`year`/`decade`); the **effective date
  = memory_date ?? created_at** drives the timeline + memories list, so rows
  without a memory_date behave exactly as before. Shared model
  `lib/memories/memory-date.ts` (`buildMemoryDate`, precision-aware
  `formatMemoryDate`/group label, `validateAndResolveMemoryDate` guard,
  `selectionFromMemoryDate` for edit prefill).
  - **Full UX coverage (2nd pass)**: new shared `components/memories/MemoryDateField.tsx`
    (Today/Yesterday/Custom/Month/Year/Decade) wired into BOTH **CreateMemoryModal**
    (memories page) and **EditMemoryModal** — the modal posts multipart, so
    `create/route.ts` now reads `memoryDate`/`memoryDatePrecision` in its FormData
    branch too. Edit persists via `PUT /api/memories/[id]` (validated; only touched
    when the field is sent). `CreateMemoryForm` (dashboard) retains its own inline
    control (JSON path).
  - **Date hierarchy (3rd pass — presentation only)**: Memory Date is now the
    PRIMARY date everywhere; created_at is secondary "Added" metadata. Two canonical
    formatters in `lib/memories/memory-date.ts`: `formatMemoryDateLabel` (always the
    actual event date, NEVER relative — day "July 4, 1980", month "May 1980", year
    "1980", decade "1980s") and `formatAddedDate` ("June 11, 2026"). Applied to
    **MemoryCard** (+ memories-page search results), **memory detail page**,
    **TimelineCard**, and **RelatedMemories** preview: each shows "🕰 Memory Date: …"
    prominently and "Added to RemyNest on …" subtly. No relative labels
    (Today/Yesterday) anywhere. Standalone `/search` page is unchanged — it uses the
    `match_memories` RPC whose projection lacks date columns (surfacing them would
    require an RPC/schema change). No schema/grouping/effective-date logic changed.
- **Remy Companion Foundation** (read-only; no schema/migration/cron/lifecycle/
  billing/auth changes): the AI companion layer (NOT a chatbot) that turns
  existing data into calm, supportive observations. Engine + presence are
  decoupled so the future avatar plugs into the same system. `lib/remy/`:
  `types.ts` (`RemyObservation`/`RemySignals`, with `mood` as the avatar seam),
  `persona.ts` (`REMY`, tone→mood map, `remyVoice()` for human grammar —
  "Mary has" vs "You have"), `observations.ts` (`generateRemyObservations` —
  pure, priority-ranked rules over reminders + memory activity/trend/staleness +
  invites + onboarding + calm-presence fallback), `signals.ts`
  (`buildRemySignals` — read-only `memories` counts scoped like the dashboard,
  best-effort → 0 on failure, never throws). `components/remy/`:
  `RemyAvatar.tsx` (mood-aware mark + **the documented avatar plug-in point** —
  future animated avatar swaps internals behind the same `{mood,size}` props),
  `RemyCompanion.tsx` (reusable client presence usable on any surface). Dashboard
  renders a Remy section below the header; the old "Remy Insight Preview" teaser
  in DashboardFocus was superseded and removed. No LLM call — deterministic and
  production-safe.
- **Dashboard V3 — command center** (build-safe; no lifecycle/cron/notification
  changes): replaced the admin "Today's Focus" metric list with a reminder-driven
  focus surface — **Right Now · Upcoming Today · Routine Progress · Reminder Summary ·
  Remy Insight Preview** — rendered in the user's local timezone. New shared Focus
  model `lib/reminders/focus.ts` (`deriveDashboardFocus`) is the single source both
  the Dashboard (now) and the future status-based Focus engine / Reminder Center
  consume; forward-compatible with the lifecycle `status` column (falls back to
  `completed`). New client widget `components/.../DashboardFocus.tsx`. Dashboard
  fetches reminders read-only (existing columns only) scoped to the active care
  profile; My Nest shows a gentle "enter a care profile" state. Administrative
  context (Care Snapshot, Memory Insights, invites, account status) moved under a
  separate **Account & Workspace** section.
- **Launch hardening** (merged to `main`): Playwright security automation, AI
  disclaimers, premium 402, GDPR export, legal pages, CRON_SECRET, `/api/health`,
  error-message sanitisation, Sentry wiring + error boundaries.
- **Core product**: memory CRUD + AI enrichment/embeddings, reminders, semantic
  search, memory chat, insights, caregiver sharing, Stripe subscriptions, GDPR export.
- **Settings v1** (`/settings`): account info, export, privacy links, Delete Account.
- **Delete Account — DONE**: migration applied; tombstone provisioned
  (`TOMBSTONE_USER_ID` set local + Vercel); A–F scenarios **validated PASS** against
  the live DB (own-only, transfer, retain/delete contributed, storage, auth
  recovery). `memories.user_id → auth.users` (CASCADE, NOT NULL) confirmed.
- **Care-profile paywall**: plan-limit no longer crashes — server returns a
  structured result; client opens the upgrade modal (Premium/Family) instead of a
  Server Components error.
- **Caregiver collaboration gated (FAMILY-tier)**: `inviteCaregiver()` now
  enforces the entitlement server-side via `checkPremium()` +
  `getUsageLimits(plan).caregiverCollaborationEnabled` (single source of truth =
  `BILLING_PLANS`). FREE/PREMIUM → structured `{ code: "UPGRADE_REQUIRED", plan }`
  (never throws, mirrors `createProfile`); FAMILY/ENTERPRISE → proceeds.
  `InviteCaregiverForm` opens `UpgradeModal` on `UPGRADE_REQUIRED`. `UpgradeModal`
  gained an optional `requiredFeature` filter so a Family-only feature never
  offers PREMIUM (still BILLING_PLANS-derived — no duplicate logic). `inviteCaregiver`
  is the sole invite-creation path (accept/decline only update existing invites;
  `acceptInvite` requires a pre-existing pending invite), so no bypass route.
- **Account identity single source of truth**: `lib/account-identity.ts`
  (`resolveAccountIdentity`) now feeds both `/settings` and the app-layout navbar;
  removed hardcoded placeholder identity from `AppNavbar`/`UserProfileDropdown`.
  Settings and navbar always show the same account/plan.
- **Workspace context visibility**: persistent color-coded `WorkspaceIndicator`
  in the navbar + Care-mode `WorkspaceBanner` (active profile + "Switch to My
  Nest"), resolved in `(app)/layout.tsx` from the existing active-context cookie.
  Workspace switches now `revalidatePath("/", "layout")` so all routes reflect
  the change immediately. No new workspace system introduced.
- **FAMILY drift fixed (webhook)**: `customer.subscription.updated` no longer
  hardcodes `subscription_plan: "PREMIUM"`. Added `planFromPriceId(priceId)`
  (reverse lookup over `BILLING_PLANS`) and the webhook now derives the plan from
  the Stripe price → FAMILY stays FAMILY across renewals/updates. Unknown price →
  preserve existing plan + `console.warn`; inactive → FREE. checkout (metadata
  plan) and deleted (FREE) paths unchanged; `subscription.created` writes no plan
  (can't downgrade). Verified PREMIUM→PREMIUM, FAMILY→FAMILY.
- **Contact page** (`/contact`, public): General Contact + Enterprise Solutions +
  Investors & Partnerships sections. All emails sourced from `lib/contact.ts`
  (`CONTACT.general`/`enterprise`/`investors` → `contact@`/`enterprise@`/
  `investors@remynest.com` — placeholders, update before launch). Linked from the
  landing footer. No billing/checkout/subscription/Stripe/DB changes.
- **Identity stale-cache fix**: Settings/Navbar showed "Free Member" for a premium
  account because the identity read was served from Next's cache (pre-upgrade row),
  while billing/dashboard bypass caching. Added `noStore()` to
  `resolveAccountIdentity` and `force-dynamic` to `(app)/layout.tsx` so identity is
  always fresh per user.
- **Subscription resolution unified**: `lib/billing/resolve-subscription.ts` is
  the single authoritative resolver (premium if `is_premium` OR status
  active/trialing OR plan PREMIUM/FAMILY) used by `checkPremium`,
  `resolveAccountIdentity`, `/api/billing/status`, and the dashboard. Removed all
  inline plan logic; logs a warning on contradictory rows. Fixes `checkPremium`
  previously mis-gating premium users whose `subscription_plan` was stale `FREE`.
- **Workspace switching repaired** (was architecturally broken): added
  `EnterCareProfileList` (My Nest → Care entry that calls `setActiveProfile` →
  writes `remynest-active-context`); fixed `ProfileSwitcher` guard to use the real
  `activeProfileId` (selecting a profile from PERSONAL now switches); unified the
  account menu to call `setPersonalWorkspace` (removed the divergent `?context=`
  URL system). Single source of truth = the cookie.
- **Stripe Customer Portal shipped**: new `app/api/stripe/portal/route.ts`
  (auth → RLS-scoped read of `profiles.stripe_customer_id` →
  `stripe.billingPortal.sessions.create({ customer, return_url })` → returns
  hosted URL). `BillingSection` "Manage Subscription" now opens the portal
  (`/api/stripe/portal`) instead of routing through checkout. Gated by the
  existing `customerPortalEnabled` flag (= profile has `stripe_customer_id`).
  Verified: real customer → valid `billing.stripe.com` session URL (portal is
  configured/active in Stripe). No checkout/webhook/resolver/pricing changes.
- **Reminder push delivery wired (Phase 1)**: `OneSignalInit` was never mounted
  and the OneSignal Web SDK was never loaded → `device_registrations` stayed empty
  → cron could never deliver. Fix: `OneSignalInit` now loads the v16 page SDK
  (`OneSignalSDK.page.js`, matches the existing `/public` v16 service workers) and
  is mounted in `(app)/layout.tsx` (self-guards on an authenticated user).
  Verified end-to-end (minted session → `POST /api/register-device` → row created:
  `user_id` matches, `player_id` saved; duplicate registration prevented via
  upsert; unauth bounced by middleware). Cron/sender logic unchanged.
- **Reminder timezone correction (Phase 2)**: reminder times were stored by
  reinterpreting the naive `datetime-local` value on the UTC server → wrong fire
  time for non-UTC users. New `ReminderDateTimeField` converts local→UTC in the
  browser (DST-aware) and submits a hidden `remind_at_utc`; the create server
  action prefers it (idempotent passthrough), falling back to the raw value for
  no-JS. No schema change; existing reminder rows untouched. Verified: NY summer
  14:00→18:00Z, NY winter 14:00→19:00Z (DST), Manila 14:00→06:00Z.
- **Design-system / UI modernization (visual only)**: established a unified brand
  language — Tailwind tokens (`sage`/`sand`/`gold`/`moss`/`charcoal`, `shadow-soft`,
  `rounded-4xl`), Fraunces serif headings + Inter body wired via `--font-serif`/
  `--font-sans` in the root layout, brand-aligned `globals.css` tokens + softened
  `.card` + reusable `@layer` primitives (`.rn-card`/`.rn-eyebrow`/`.rn-btn`).
  Adopted on the highest-leverage surfaces: AppNavbar (sticky, soft, sage avatar),
  NavLinks (active states), DashboardHeader/Stats/AccountStatus, MemoryCard,
  Reminders page, BillingSection — replacing clinical blue/indigo/emerald/gray with
  warm sage/sand/gold. No logic/schema/API/billing/reminder-functionality changes.
- **Post-UI-pass regression fixes**:
  - *Insights ChunkLoadError / `GET /_next/undefined 404`*: root cause was **stale
    build artifacts** — the UI pass changed `tailwind.config.js`/`layout.tsx`(fonts)/
    `globals.css` with only incremental builds, desyncing the webpack chunk manifest.
    No source bug (InsightsClient dynamic imports are all correct). Fixed by a clean
    rebuild (`rm -rf .next && npm run build`). Verified: `/insights` → 200, 17 chunks
    all resolve (0 broken), no `/_next/undefined`. Browsers with a stale client/SW
    need a hard refresh; production self-resolves on next deploy.
  - *Profile panel scrolling*: `UserProfileDropdown` had no height bound, so the
    long `ProfileHub` scrolled the whole page. Added `max-h-[calc(100vh-5rem)]
    overflow-y-auto overscroll-contain` (isolated scroll, no chaining) and made the
    close button `sticky`. Visual-only; no redesign.
- **Profile dropdown: removed duplicate Billing nav item**: deleted the "Billing"
  entry from `PROFILE_MENU_ITEMS` (`components/profile/config/profile-menu.config.ts`)
  — it pointed at `/dashboard` (duplicate nav that redirected users to the
  dashboard). Dropdown "Account" menu is now Switch to My Nest / Settings / Logout.
  No handlers/imports/state were billing-only, so nothing else to remove.
  Subscription controls are UNCHANGED — they live in `BillingSection`, rendered as
  the **"Billing" section of the profile dropdown panel** (`PROFILE_SECTIONS`), not
  the removed link. ⚠️ Note: the standalone `/settings` route does NOT render
  `BillingSection` (only Account Info / Export / Privacy / Delete) — subscription
  management is reached via the profile dropdown's Billing section. Slot reserved
  for a future Vault entry (not implemented).
- **My Nest semantic search FIXED + care-leak closed**: `/api/memories/search`
  previously filtered via `match_memories(workspace_type_input)`. Verified RCA:
  personal memories are stored `workspace_type='care'` (creation never sets it),
  the RPC can't scope to a profile and doesn't return `memory_profile_id`, so
  `'my-nest'` → 0 results, and `'care'` returned ALL the user's memories
  (personal + every care profile = cross-workspace leak). Fix (app-layer, no DB
  change): use `match_memories` purely for vector RANKING (over-fetch 100, no
  workspace param), then SCOPE by `memory_profile_id` server-side via
  `resolveActiveProfileId()` — the SAME authoritative discriminator the memories
  list path uses (NULL = My Nest; profile id = that care profile). The route now
  ignores client-supplied workspace/profile (resolves from the cookie). Verified
  on prod data: My Nest 2 results (was 0), Care 20 results scoped to the active
  profile, My Nest∩Care overlap = 0. `workspace_type` is now **deprecated/unused
  by search** (kept for backward compat; no data migration required since
  `memory_profile_id` was already correct).
- **Production SEO shipped**: central `lib/seo.ts` (SITE_URL, brand strings,
  `pageMetadata` helper). Root `app/layout.tsx` now sets `metadataBase`, default
  title + `%s — RemyNest` template, description, `robots: index/follow`, default
  Open Graph + Twitter (with image), icons. Added `app/robots.ts` (allow
  marketing, disallow `/dashboard /memories /timeline /reminders /insights
  /memory-chat /settings /onboarding /api/ /auth/ /callback`, sitemap ref) and
  `app/sitemap.ts` (6 public routes). Homepage (`app/page.tsx`) gets metadata +
  JSON-LD (`Organization` + `SoftwareApplication`) via `components/seo/JsonLd`.
  Marketing/legal pages (privacy, terms, cookies, contact, account-deletion) now
  carry per-page canonical + description + OG/Twitter via `pageMetadata`. Verified
  on the prod build: correct titles (single suffix), distinct canonicals,
  og:image on every page, robots.txt/sitemap.xml return 200. No FAQPage (no FAQ
  content). Authenticated routes kept out of the index via robots Disallow (no
  `(app)` files modified). FOLLOW-UP: og image is `/logo.png` (not a 1200×630
  card) and `/public` icons are ~2.27 MB each — optimize before heavy promotion.
- **Plan price labels unified (display-only)**: Dashboard Account Status omitted
  the Family price ("Family" with no "€19.99/mo") because `UpgradeButton`
  hardcoded its labels and forgot Family. Added a single source of truth
  `PLAN_PRICE_LABELS` + `getPlanPriceLabel()` in `lib/billing/plans.ts`
  (PREMIUM=€9.99/mo, FAMILY=€19.99/mo) and refactored all three consumers —
  `UpgradeButton` (dashboard), `UpgradeModal` (billing modal), `BillingSection`
  — to use it. No hardcoded prices remain in those components. Display-only;
  checkout still resolves real prices from Stripe price ids via `getPriceId()`.
  Verified: Account Status now shows "Premium (€9.99/mo)" / "Family (€19.99/mo)".
- **Two billing/profile UX fixes**:
  - *Outside-click closes the profile drawer*: `AppNavbar` now attaches a
    `pointerdown` listener (mouse + touch; desktop/iOS/Android) while the dropdown
    is open, closing it when the event target is outside a `menuRef` wrapping the
    toggle button + drawer. Listener is attached only while open and removed on
    close/unmount (no leaks); the X button still works; inside clicks don't close.
  - *Billing CTA matches current plan*: `BillingSection` now derives the CTA from
    `currentPlan` (from `useBillingStatus`) + `selectedPlan` (no new flags). The
    current tier shows "✓ Current Plan" (disabled), downgrades are hidden, and the
    upgrade CTA only renders for strictly-higher tiers using `effectiveSelectedPlan`.
    Verified matrix: FREE→Upgrade to PREMIUM/FAMILY; PREMIUM→Upgrade to FAMILY only
    (never "Upgrade to PREMIUM"); FAMILY→no upgrade CTA (Manage Subscription). No
    Stripe/checkout/subscription/pricing logic changed (checkout still posts to
    `/api/stripe/checkout`).
- **Password reset flow shipped** (Supabase Auth): new public `/forgot-password`
  (`resetPasswordForEmail` → redirectTo `/reset-password`, anti-enumeration generic
  success) and `/reset-password` (establishes the recovery session via PKCE
  `?code` `exchangeCodeForSession` OR the hash `PASSWORD_RECOVERY` event, then
  `updateUser({ password })` → redirect to `/memories`). Both routes added to
  middleware `PUBLIC_ROUTES`; both `noindex`. Login page links to it. Login/
  registration logic untouched; shared `/callback` route untouched. Pages are
  brand-styled + mobile-friendly (email/new-password autocomplete). Build verified;
  routes return 200 unauthenticated. ⚠️ OPERATOR: add the reset redirect URL(s)
  (`https://www.remynest.com/reset-password` + localhost) to Supabase Auth
  "Redirect URLs", and confirm the recovery email template, before relying on it.
- **Media privacy migration (private bucket + signed URLs)** — *launch blocker*:
  audit proved `memory-media` was PUBLIC (anonymous GET → 200 on real photos).
  New `lib/memory-media-signing.ts` mints short-lived (1h) **signed URLs**
  server-side via the service-role client (rows already authorized by RLS),
  batched (`createSignedUrls`), backward-compatible (derives the storage path
  from `storagePath` OR a legacy public URL → **no data migration**). Applied at
  every emit/render surface: `/api/memories` (list), `/api/memories/search`,
  `/api/memories/create` (response), `/api/timeline`, `timeline/page.tsx`,
  `memories/[id]/page.tsx`. Write side now stores **paths only** (upload +
  `normalizeAttachments` strip any public/signed URL → no token ever persisted).
  Validated: private bucket → public URL 400, signed URL 200; restored to public.
  ⚠️ **OPERATOR (final go-live step, AFTER this code deploys):** set bucket
  `memory-media` `public=false`. Signed URLs work whether the bucket is public or
  private, so deploy-then-flip has zero broken-image window. Rollback = flip back
  to `public=true` (signed URLs still resolve) and/or revert the commit.
- **Media privacy migration validated (zero regressions) + 2 fixes**: full
  validation of the signed-URL migration. Phase 1 PASS — `/api/memories` (My Nest
  + Care), `/api/memories/search`, `/api/timeline`, and the memory-detail page all
  serve `/object/sign/` URLs (0 public; signed GET → 200; dashboard renders no
  media). Validation found and fixed TWO regressions introduced by storing paths:
  (1) edit (`resolveCoverImageUrl`) persisted a SIGNED `cover_image_url` → now
  strips to a storage PATH; (2) retain-mode GDPR delete (`snapshotRetainedMediaPaths`)
  parsed only public URLs → would wrongly delete transferred media → now resolves
  paths from `storagePath`/bare path/public/signed. Re-validated: create + edit
  persist PATH only (no signed/public URL ever stored). Phase 3 export represents
  media via `storagePath`. Phase 4: per-memory delete removes the row only —
  **storage file is RETAINED** (orphaned); account-deletion cleanup removes files
  under `users/{id}/` (legacy bucket-root `<uid>/<file>` objects are a PRE-EXISTING
  gap). Phase 5: no `getPublicUrl` remains anywhere. **Safe to flip bucket private
  after deploy.**
- **Reminder IDOR write FIXED** (security): `POST /api/create-reminder` had no
  auth, used the **service-role client** (bypassing RLS), and took `user_id` +
  `memory_profile_id` from the **request body** → any authenticated user could
  inject a reminder into another user's account (push-notification injection).
  **Exploit proven** (User A created a reminder owned by User B → 200) then fixed:
  the route now authenticates via the session, derives `user_id` from the session
  (never the body), verifies care-profile access against the DB
  (`lib/profile-ownership.ts` — owner OR caregiver, same model as
  `getAccessibleProfiles`) returning **403** on a foreign profile, and inserts
  with the RLS-scoped client. The reminders-page `createReminder` server action
  got the same `userCanAccessProfile` check (the active-context cookie is
  client-settable). Re-validated: foreign create → 403 (0 planted), authorized
  My Nest + own-care create → 200. Reminder edit/delete have no API endpoint
  (RLS-scoped server actions).
- **Dead AI reminder-parser endpoint removed**: deleted the unused, broken
  natural-language reminder route (no callers; service-role + random `user_id`;
  inserted a non-existent `message` column → always 500, so it could not even
  write; localhost notify fallback). Audit confirmed it was unreachable
  unauthenticated and not IDOR-targetable; only residual was authenticated
  OpenAI cost-abuse. Scrubbed all doc references. Reminder creation remains via
  `/api/create-reminder` (session-auth + ownership) and the reminders-page server
  action. If NL reminders return in V2, rebuild securely.
- **Caregiver authorization P0 (two-part)**: audit proved any authenticated user
  could directly INSERT `profile_relationships` / `caregiver_invites` rows for ANY
  profile (write-IDOR; confidentiality was contained by ownership-based RLS on
  memories/memory_profiles, but integrity + the `userCanAccessProfile` gate were
  undermined). Plus logic gaps: `inviteCaregiver` didn't verify profile ownership,
  `acceptInvite` didn't verify the invitee email. Fixes:
  - **App layer (shipped + validated):** added `userOwnsProfile()`; `inviteCaregiver`
    now requires the caller OWNS the target profile; `acceptInvite` now requires
    `invite.email === user.email` AND `status==="pending"`. Validated: A→B.profile
    invite rejected; A accepting a foreign invite rejected; owner/own-invite allowed.
  - **DB layer (OPERATOR MUST APPLY — the actual direct-IDOR fix):** new migration
    `supabase/migrations/20260608180000_caregiver_authz_rls.sql` adds least-privilege
    INSERT/UPDATE/DELETE RLS on both tables (owner-only invite/manage; invitee-only
    accept; no self-grant). ⚠️ **Until applied, the direct PostgREST IDOR is STILL
    OPEN** (verified: A's direct insert still succeeds). Cannot apply from repo (no
    DDL access) — run in Supabase SQL editor, then re-run the direct-insert probe to
    confirm BLOCKED. SELECT policies intentionally unchanged (reads already scoped).
- **OneSignal/notification hardening**: audit found (HIGH) `/api/send-reminder` —
  any authenticated user could push **attacker-controlled content to any
  `external_user_id`** with zero authorization; and (MEDIUM) `/api/register-device`
  would **reassign a `player_id` already owned by another user** (service-role
  upsert onConflict player_id → device-notification hijack). Fixes:
  - **P1:** removed `/api/send-reminder` (only caller was the `test-notification`
    demo page, also removed) + scrubbed docs. Verified: `POST /api/send-reminder`
    → 404.
  - **P2:** `register-device` now rejects (409) a `player_id` already registered to
    a different account; same-user re-registration unaffected. Verified: A reusing
    B's player_id → 409 (B's device intact); A new device → 200; A re-register same
    device → 200 (1 row).
  - Device-registration confidentiality already solid (RLS: A can't read/insert/
    update/delete device rows). Cron senders remain `CRON_SECRET`-gated.
  Follow-up (not done): remove broken `save-onesignal`/`save-subscription`; scrub
  `player_id` from logs.
- **Reminder Center V2 — Phase 1 shipped** (UX overhaul, current schema, no DDL):
  new client `components/reminders/ReminderCenter.tsx` restructures the flat list
  into a calm, hierarchical center — **Today's Focus (hero: next/overdue/today)**,
  **Upcoming (Tomorrow/This Week/Later)**, **Daily Routines (recurring)**,
  **Caregiver context**, **Completed history**, plus forward-compatible
  **Priority/Pinned** sections that light up once Phase-2 columns exist. **Timezone
  fixed:** times now render **client-side in the user's local tz** (no more
  server-side UTC `en-IE`). Lifecycle chips read `sent`/`completed`
  ("Awaiting confirmation" appears once the Phase-2 cron sets `sent`). Create form
  is now a collapsible "Add a reminder"; all server actions preserved. Verified:
  `/reminders` → 200, all sections render, old UTC formatting gone.
  - **Phase 2 (operator + code, NOT applied):** migration
    `supabase/migrations/20260608210000_reminder_center_v2.sql` adds `priority`,
    `pinned`, `notified_at`, `completed_at`, `skipped` (+ indexes, idempotent).
    Pairs with code (per the migration's footer): cron sets `sent`/`notified_at`
    instead of auto-completing (decouples delivery from completion — fixes the
    "Sent = Completed" problem); new skip/priority/pin actions; AI-insight hooks
    via the timestamps. Deferred because DDL is operator-only and `main`
    auto-deploys (code referencing new columns must land AFTER the migration).
- **Reminder Lifecycle Foundation — Sprint 1 Phase 1** (foundation only; no cron/
  notification/UI/dashboard behavior change): new `lib/reminders/lifecycle.ts`
  (`REMINDER_STATUS` constants + best-effort `logReminderEvent` via service role)
  and migration `supabase/migrations/20260609120000_reminder_lifecycle_foundation.sql`
  (adds `status` + `missed_at/snoozed_until/snooze_count/completed_by/skipped_by/
  actor_role`, the append-only **`reminder_events`** audit table + RLS (read =
  owner/caregiver; writes service-role only), `completed→'completed'` backfill).
  Wired best-effort event logging + a best-effort `status`/`completed_at`/
  `completed_by` mirror into create / complete / delete — writes that **never block
  the primary action**. Verified: build/typecheck pass; create/complete/delete all
  still succeed; lifecycle writes no-op gracefully (`PGRST205`/`PGRST204`) while the
  migration is unapplied. ⚠️ OPERATOR: the migration is **NOT applied yet** (verified:
  `reminders.status` 42703 / `reminder_events` PGRST205). Apply it to activate event
  writes (no code change needed), then verify events populate. Phase 2 (cron decouple)
  is NOT started.
- **Deploy fix**: `/api/billing/status` `force-dynamic` (DYNAMIC_SERVER_USAGE).
- **Docs + workflow**: `/docs` system + consolidated `CLAUDE.md`.
- **Mobile**: Capacitor remote-URL wrapper; iOS build verified (`feat/capacitor-mobile`).

## Open issues
- **Operator migration pending — Reminder Lifecycle**: apply
  `20260609120000_reminder_lifecycle_foundation.sql` (see Completed work).
- `users` table missing (legacy): dead `save-onesignal` / `save-subscription` endpoints
  **removed** (2026-06-12); push uses `device_registrations` via `/api/register-device`.
- ~~`/api/stripe/cancel` missing~~ **fixed** (2026-06-12) — cancels at period end.
- Sentry env vars not set in Vercel (no prod error visibility) — check with
  `npm run validate:sentry-env`; set via `vercel env add` (operator).
- Data drift: the webhook now writes a correct, price-derived `subscription_plan`
  (future drift prevented). **Pre-existing** drifted rows (e.g. `admin@remynest.com`:
  is_premium=true, plan=FREE) are not auto-corrected until their next
  subscription event with a known price — a one-time data reconciliation is still
  advisable. `resolveSubscription` tolerates drift for premium/free.
- Dev uses prod Supabase (no staging); media bucket `memory-media` is public.
- Tech debt: duplicate export logic; two profile render paths; two search
  endpoints; schema not version-controlled; `npm audit` advisories.

## Active branch
`main` (production; auto-deploys). `feat/capacitor-mobile` holds mobile work
(pushed, unmerged).

## Next priorities
P0: fix `/api/stripe/cancel`; fix/remove broken OneSignal endpoints; confirm Sign
in with Apple. P1: set Sentry env in Vercel; native push;
Android build + store submission.

## Blockers
None blocking web production. Mobile store submission blocked on Apple Developer /
Play Console accounts + native push + Android SDK.

## Recent commits
- `fix(remy)` avatar crop calibration — tight square head crops for all 9 moods (measured)
- `d9fcb32` fix(middleware): bypass /public static assets (Remy blueprint sheet 307→/login→dashboard)
- `83a1c88` feat(remy): Avatar sprite sheet — single blueprint image + per-mood crop regions
- `013b9c6` feat(remy): Avatar real artwork — image rendering + mood crossfade, emoji removed
- `6e915de` feat(remy): Avatar Evolution V1 — blueprint-grounded mood system + dashboard header avatar
- `779f045` feat(remy): Export Engine V1 — PDF-ready ExportDocument + print page + download flow
- `aa652a4` feat(remy): Memory Books V1 — structured book model (cover/TOC/chapters from the biography)
- `c7aa4cf` feat(remy): Biography V1 — structured life narrative (pure composition of existing summaries)
- `b8dbb11` feat(remy): Story Mode V1 — guided narrative journey (pure composition on timeline backbone)
- `63b7a4a` feat(remy): Timeline V1 — visual narrative layer (pure synthesis of chapters/collections/connections)
- `b7e9a25` feat(remy): Notifications V1 — intelligence-driven updates layer (pure synthesis, dashboard card)
- `5e0fe01` feat(remy): Family Workspace Intelligence V1 — per-profile stats, family themes, observations
- `6f67254` feat(remy): Life Chapters V2 — time-based life periods (decade chapters from memory dates)
- `46c13e7` feat(remy): Connections V2 — diversity-ranked, narrative relationship discovery
- `ebe2f98` feat(remy): Collections V2 — theme-consolidated, deduplicated collections (category grouping)
- `6bbfd50` feat(dashboard): Remy Activity concise summary card + investigation findings
- `1938ae4` feat(dashboard): Remy Activity — collapse to 3 with in-place show more/less (presentation only)
- `c99a9a0` feat(reminisce): Reminiscence Mode V1 — caregiver/family era-based memory experience
- `9c0cfd9` feat(memories): Memory Date Adoption V1 — coverage card + /memory-dates backfill flow
- `d1d2a3c` feat(remy): Life Chapters V1 — narrative layer (chapters page + detail + dashboard)
- `0282b3e` feat(remy): Remy Connections V1 — relationship discovery (connections page + detail + dashboard)
- `bce6d2b` feat(remy): Remy Collections V1 — Organize layer (collections page + detail + dashboard)
- `29dbeef` feat(remy): Remy Activity Feed V1 — evidence layer
- `187229f` feat(remy): dashboard intelligence engine (real workspace summaries)
- `f9cb9c1` feat(memories): Memory Date is the primary date; Added date is metadata
- `3e36338` feat(memories): complete Historical Memory UX (create modal, edit, cards)
- `649993b` feat(insights): Insights V2 — Remy Insights Center (companion-led, telemetry preserved)
- `b2eaa36` feat(memories): Historical Memory Creation — effective-date dating + timeline
- `c7e61f4` feat(remy): Remy Companion Foundation — observation engine + avatar-ready presence
- `18581e4` feat(dashboard): Dashboard V3 — reminder-driven command center
- `962db0c` feat(reminders): Reminder Center V2 — Phase 1 (sectioned UX + local timezone)
- `b35a668` feat(reminders): Reminder Lifecycle Foundation — Phase 1 (events + status, deploy-safe)
- `866acce` fix(security): remove send-reminder injection vector + block device hijack
- `22fc8ff` fix(security): caregiver authz P0 — ownership checks + RLS write hardening
- `399625a` docs: consolidate to a single authoritative Claude workflow
- `c000ae8` fix(api): force-dynamic on `/api/billing/status`
- `e227abe` test(gdpr): add delete account validation harness
- `c78415e` fix(gdpr): remove invalid profile_name from tombstone provisioning
- `cb739d4` feat: complete GDPR delete account system
