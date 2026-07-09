# REMYNEST MASTER STATE

> **The single authoritative source of truth for RemyNest project state.**
> Update this file after EVERY completed task (see "Maintenance protocol" at the bottom).
> Rule: if this file, CLAUDE.md, or HANDOFF ever conflict with the **source code**, the
> **SOURCE CODE WINS** — reconcile this file to the code, then note the divergence.
> Every ✔ below was **verified against actual source** in the 2026-07-09 synchronization audit
> (10-agent, file:line-cited). Items are re-verified against code before being trusted, not from memory.

Last Updated: 2026-07-09
Branch: main — **unpushed**, ahead of `origin/main` (`f53694b`); latest = the Companion Intelligence layer (on top of the app-wide-companion + living-Nest + Nest-hub + doc-sync commits)
Commit: Companion Intelligence layer (on top of `5598641` app-wide-companion — see git log)
Repository Verified: **YES** — 2026-07-09. Basis: the 10-agent file:line-cited source audit, plus a targeted source re-verification this sync pass (access_level enforcement, AI stack, Nest, audio/PDF-UI, reminder-edit, security-headers/rate-limiting all reconfirmed against actual code). **Source code is authoritative over all documentation** (this file, CLAUDE.md, HANDOFF, architecture docs); reconcile docs forward when they diverge.

==================================================
## PROJECT STATUS
==================================================

Launch Readiness: **~90%** (launch-scope build). Every core system is implemented + verified in source; the remaining ~10% is overwhelmingly **operator / product / legal**, plus one engineering feature (UGC report/block).

Overall Project Completion: **~70%** (counting the full post-launch vision — voice, transcription, animated Remy, Android-as-product, Semantic Search V2, etc., which are intentionally deferred).

Current Milestone: **App Store Submission Readiness** (roadmap phase 4 — Productization is done).

Current Sprint: **Launch hardening & App-Store compliance.**

Current Task: *(none active — the documentation-synchronization pass just completed. Ready to begin the Next Task on operator go-ahead.)*

Next Task: **UGC report/block + EULA abuse clause (Apple Guideline 1.2)** — the single highest-priority engineering task before ship (memories are shared into caregiver/family workspaces → Apple treats it as a UGC/social app requiring report + block + an EULA abuse clause).

After That: **HTTP security headers (CSP/HSTS/X-Frame-Options/nosniff/Referrer-Policy/Permissions-Policy) + API rate limiting** — top recommended hardening for a PHI/health-adjacent app (important, not a formal blocker).

Estimated Tasks Remaining (to launch): **~9** — 1 engineering (UGC report/block) + ~8 operator/product/legal (see CURRENT LAUNCH BLOCKERS). Post-launch roadmap is separate.

==================================================
## VERIFIED COMPLETE
==================================================

*Verified against actual source. **Do NOT suggest, rebuild, or re-flag these unless explicitly asked.***

**Remy companion platform**
- ✔ Public API (`@/lib/remy` — the only import path) · Event Bus · Brain · Emotion Engine · Policy Engine — one of each, `lib/remy/core/*`
- ✔ Single Renderer (`components/remy/Remy.tsx`, `<Remy state>`) · Provider (`RemyProvider.tsx`, mounted once)
- ✔ Presentation layer + two render surfaces (`RemyStage` in-place, `FloatingCompanionLayer` floating)
- ✔ Expression vocabulary (17) · Behaviour vocabulary (17, `behavior.ts`) · Animation cues (7)
- ✔ Autonomous floating companion (reacts to memory/search/offline events, session greeting, rest→sleep)
- ✔ Asset registry (`asset-registry.ts`) — 23 real approved PNGs, 0 placeholders; `remy_master_v1.png` immutable/unregistered

**The Nest** (bottom-nav center)
- ✔ Persistent living nest · Wake choreography (resting→waking→peeking→emerging→greeting→returningHome, behaviour-driven, **no menuOpen state**) · Behaviour player (`use-nest-interaction.ts`) · Portaled menu · a11y · reduced-motion
- ✔ Nest choreography + evolution model in the platform (`lib/remy/core/nest.ts`)
- ✔ **Living ambient presence** — glow + drifting motes + breathing; **time-of-day lighting** (moonlight at night, `lib/remy/core/time-of-day.ts`) + night→sleeping resting look + time-appropriate greeting
- ✔ **Nest evolution wired to REAL memory counts** — 6 stages Tiny→Cozy→Family→Golden→Memory Tree→Sanctuary; app-shell count → `AppNavbar` → `MobileBottomNav` → `Nest` (no placeholder)
- ✔ **framer-motion motion primitives** (`components/remy/motion/primitives.tsx`) — the NestMenu "Remy offers actions" staggered reveal (de-menu-ified); ambient loops stay CSS

**Companion presence (app-wide)**
- ✔ **Screen awareness** — Remy reacts as you move between screens (`RemyScreenAwareness` + `lib/remy/core/screen-behavior.ts`; timeline/people/library/reminders/settings/dates/dashboard → brief fitting reaction; memories/search/remy/home omitted so Remy never double-reacts)
- ✔ **Milestone celebrations from REAL memory counts** (`RemyMilestones` + `lib/remy/core/achievements.ts` + `lib/remy/companion/persistence.ts`; first/10/50/100/500/1000 + Nest stage-ups; baselines on first load → no retroactive spam)
- ✔ **Celebration surface** (`RemyCelebration`) — centre-stage feather-burst + sparkles + heart via the single `<Remy>` renderer + the **real `goldenFeather` asset**; portaled, `pointer-events-none`, aria-live, reduced-motion-safe
- ✔ **Reusable companion effects** (`components/remy/effects/RemyEffects.tsx`) — FeatherBurst / Sparkles / HeartPulse (framer-motion, centralized, reduced-motion-safe)
- ✔ Event-bus **`{ replay: false }` subscribe option** — a secondary listener never steals the Brain's initial-mount replay buffer (order-independent)

**Companion Intelligence (behavioural, proactive)**
- ✔ **Insights Engine** (`lib/remy/core/insights-engine.ts`, PURE) — a `CompanionSnapshot` → behavioural `Observation[]` (morning/evening greeting, first-visit-today, returning-after-days / long-inactivity, reminders-due-today, all-reminders-completed, reminders-completed-today, memories-this-week, no-memories-today, nest-evolved; birthday-tomorrow rule present, data-wired when a source exists). No React/DOM/DB/timers/clock.
- ✔ **Priority Engine** (`lib/remy/core/priority-engine.ts`, PURE) — dedupe + cooldown-drop + rank (urgency→importance) → **at most ONE** moment; no spam.
- ✔ **RemyMoments** (`components/remy/companion/RemyMoments.tsx`, mounted once) — **once per app-open** (not polled) it fetches a real snapshot, runs the engines, and briefly shows one moment via the single `<Remy>` renderer; portaled, tap-to-dismiss, aria-live, reduced-motion-safe.
- ✔ **Read-only snapshot loader** (`app/api/remy/companion-snapshot`) — auth-gated, workspace-scoped memory/reminder head-counts; degrades to zeros (never errors the companion).
- ✔ **Behavioural memory** (`lib/remy/companion/persistence.ts` `CompanionMemory`) — last-visit day (greeting once/day + inactivity), acknowledged Nest stage, per-kind cooldowns.

**AI (all live on OpenAI — NOT deferred)**
- ✔ Ask Remy (conversational, gpt-4o-mini, retrieval-grounded) · Semantic search (premium-gated) · Embeddings (text-embedding-3-small) · Vector search (`match_memories`, 6 consumers) · AI summaries + tagging (gpt-4.1-mini) · Hybrid AI memory retrieval · Multi-turn conversational memory
- ✔ Deterministic AI-intelligence layer (insights/understanding/family/collections/connections/story/biography — no LLM)

**Memory engine**
- ✔ Memories CRUD · attachments jsonb + cover · **multi-photo** · **video (direct-to-storage)** · thumbnail size ladder (env-gated) · historical memory dates (precision) · people · relationships · clusters · deferred AI enrichment (`/api/memories/[id]/enrich`)

**Reminders (FROZEN / production-stable)**
- ✔ Create · complete (per-occurrence recurring advance) · delete · recurrence engine · native iOS local notifications · cron push + processing lease · OneSignal (SDK 5.5.2 + APNs + foreground banner + identity bridge) · caregiver + My-Nest reminders

**Caregiver system**
- ✔ Role/ownership core (`userCanAccessProfile`/`userCanWriteProfile`/`userOwnsProfile`) · **access_level ENFORCED on writes** (commit f53694b, 5 sites) · profile create · invite/accept/decline · owner-only revoke + list · **downgrade auto-reconciliation** · workspace switching (cookie re-validated per request)

**Subscription (web-checkout model)**
- ✔ Stripe checkout · portal · at-period-end cancel · signature-verified webhook (500-retry-on-write-fail, idempotent) · downgrade entitlement reconciliation · read-time premium gating · **Apple 3.1.1 native purchase-gating on every CTA** · storage-limit upgrade modal · single-source `BILLING_PLANS`

**Storage**
- ✔ Storage ledger (trigger-maintained) · byte-based quota enforcement (`enforceUploadQuota` → HTTP 413) · direct-to-storage upload (owner-scoped server paths, real-size re-verify) · subscription→storage-tier chain wired (NOT a stub) · per-file cap removed (total-per-user model)

**Security**
- ✔ Protect-by-default auth (`middleware.ts`, no PROTECTED_ROUTES allowlist) + `(app)` layout gate · object-level ownership validation · GDPR export · GDPR delete (re-auth gate, resumable) · per-route auth consistency · cron/webhook protection (fail-closed) · input sanitization · service-role isolation

**Web funnel & deployment**
- ✔ `/pricing` · `/download` (store buttons wired, "Coming soon" fallback) · `/support` · `/account/subscription` · Vercel linked + prod cron · Sentry wired · buildable iOS Capacitor+CocoaPods project · PWA manifest + brand icons

**UX**
- ✔ Project Polaris — all 8 passes shipped (Dashboard/shell, Home+Memories, People+Insights, Search, Timeline, Library, Settings, Reminders). Presentation-only over frozen logic. **No passes remain.**

==================================================
## DO NOT REBUILD
==================================================

*Architecturally complete. **Never redesign or reimplement.***

- One Remy Platform only (public API `@/lib/remy`; one Event Bus, Brain, Emotion Engine, Policy Engine, Provider, Renderer, Asset Registry)
- Single `<Remy>` renderer · Behaviour layer (above Emotion) · Nest behaviour choreography
- Emotion Engine · Policy Engine · Event Bus
- Memory engine (insert-first + deferred enrichment) · Storage system (ledger + byte quota + direct upload) · Thumbnail signing ladder
- Reminder engine (native local + cron fallback + OneSignal) — FROZEN, bug-fix only, investigation-first
- Subscription/billing engine (web-checkout + webhook + reconciliation) · Caregiver architecture (roles + access_level)
- Authentication (protect-by-default) · Vector search (`match_memories` + app-layer ownership backstop)
- Brand system (Product sage/sand/gold vs Companion purple/gold) · Remy asset pipeline (single flat folder + registry)

==================================================
## CURRENT LAUNCH BLOCKERS
==================================================

*Real blockers only. No invented work.*

**ENGINEERING**
- **UGC report/block + EULA abuse clause (Apple 1.2)** — shared memories = UGC; report + block mechanism + EULA clause required. *(NOT started.)*

**PRODUCT**
- App Store submission package: reviewer demo account + sample data + review notes; ASC privacy labels; metadata; screenshots.
- Brand raster exports + App Store / Play screenshots (generator script exists — needs an operator run).
- Change landing JSON-LD `applicationCategory` off `HealthApplication` (reduces store health-app scrutiny).

**LEGAL**
- `/terms` governing-law **jurisdiction** placeholder + company particulars (`app/terms/page.tsx:111`).

**OPERATOR**
- Apply prod Supabase migrations (storage_ledger `20260623120000`; reminder lease `20260707120000` + confirmations `20260707130000`).
- Set Vercel env: Sentry DSN; `NEXT_PUBLIC_APP_STORE_URL` / `_PLAY_STORE_URL`; verify 6 Stripe LIVE price IDs + webhook secret.
- Push the 4 unpushed commits (e73dc7e, a97dfac, 7f65178, 94088c3 + this sync-pass commit) + smoke-test upload→quota→checkout→webhook.
- Stand up real contact mailboxes (support@ / privacy@ / dpo@ / security@ — `lib/contact.ts` placeholders).
- *(Only if Android ships now)* FCM `google-services.json` + CAMERA/media perms + release keystore/signing.

==================================================
## POST-LAUNCH ROADMAP
==================================================

*Intentionally deferred — do NOT start pre-launch.*

- Voice engine (TTS) · Animated Remy (Rive/Lottie backend behind the AnimationController seam) · live emotional reactions
- Voice-recording memories · Audio & Document/PDF upload **UI** (backend already allowlists them — only the picker is missing) · Speech-to-text transcription
- Semantic Search V2 · advanced AI memory intelligence
- Golden Feather · dedicated per-stage nest ARTWORK (evolution is wired to real counts; only the per-stage art remains) · animated Remy character (wings / blink / emerge via Rive/Lottie) · celebration character effects (feather/heart) · achievements celebration art · seasonal themes · accessory system · emotion-specific artwork
- Apple Watch · Widgets · CarPlay · physical companion
- Dark-theme UI rollout (mechanism-only today) · PITR (daily backups baseline) · staging env · schema-as-migrations · DST-aware cron recurrence · iOS Notification Service Extension (exactly-once delivery) · Android as a shipping product · npm audit remediation · orphan-object storage sweeper

==================================================
## LOCKED ARCHITECTURE DECISIONS
==================================================

- **Decision:** The Nest is NOT a Floating Action Button. **Status:** LOCKED. **Reason:** the interaction with Remy is the feature; the menu is only a consequence of the `greeting` behaviour (`presentsActions`).
- **Decision:** Behaviour sits ABOVE Emotion (behaviour → existing expression/emotion/cue). **Status:** LOCKED.
- **Decision:** One Remy Platform only. **Status:** LOCKED.
- **Decision:** Single Renderer only (`components/remy/Remy.tsx`); render Remy only via `<Remy state>`/`RemyStage` — never a hardcoded `<img>`. **Status:** LOCKED.
- **Decision:** Exactly one of each — public API, provider, asset registry, event bus, brain, policy. **Status:** LOCKED.
- **Decision:** Features publish semantic events; the platform decides feeling/expression/visibility. **Status:** LOCKED.
- **Decision:** Auth is protect-by-default (no PROTECTED_ROUTES allowlist). **Status:** LOCKED (B1 launch blocker).
- **Decision:** `memory-media` bucket is PRIVATE; PHI via signed URLs only. **Status:** LOCKED (B2).
- **Decision:** Every client-cookie workspace WRITE is app-layer-authorized (`userCanWriteProfile`) before the write; RLS alone is not sufficient. **Status:** LOCKED.
- **Decision:** Caregiver write permission is determined ONLY by `access_level` (only `read` restricts; owner always writes). **Status:** LOCKED.
- **Decision:** Stripe webhook returns non-2xx (500) on required DB-write failure; 200 for no-matching-row. **Status:** LOCKED.
- **Decision:** Single source of truth `subscription_plan → BILLING_PLANS.storageGB → quota`; storage bundled with tiers (FREE 1 / PREMIUM 25 / FAMILY 100 GB / ENTERPRISE ∞); enforcement is total-per-user, not per-file. **Status:** LOCKED.
- **Decision:** Media upload is direct-to-storage; API is JSON metadata-only. **Status:** LOCKED.
- **Decision:** Memory create is insert-first; AI enrichment is deferred (fire-and-forget). **Status:** LOCKED.
- **Decision:** iOS purchase UI is web-only (Apple 3.1.1); no native IAP/StoreKit; Restore Purchases not required in this model. **Status:** LOCKED.
- **Decision:** Reminder system is FROZEN (bug-fix only, must begin with a proven defect); native = CocoaPods (not SPM); do not regenerate the iOS project. **Status:** LOCKED.
- **Decision:** "My Nest" is a workspace STATE, not a page/route (lives in profile dropdown; care-switching in WorkspaceSelector drawer). **Status:** LOCKED.
- **Decision:** Any fixed/full-screen overlay under a `backdrop-filter`/`transform`/`filter` ancestor MUST `createPortal(document.body)`. **Status:** LOCKED.
- **Decision:** Responsive nav swap is gated at `lg` (1024px), not `md`. **Status:** LOCKED.
- **Decision:** All AI is OpenAI (gpt-4o-mini / gpt-4.1-mini / text-embedding-3-small); the AI-intelligence layer is SHIPPED (only the companion's animation/voice content is deferred). **Status:** LOCKED.
- **Decision:** Time-of-day is a platform layer (`lib/remy/core/time-of-day.ts`); the Nest's ambient lighting, resting look (night→sleeping), and greeting derive from it. **Status:** LOCKED.
- **Decision:** Nest interaction MOTION uses framer-motion, centralized in `components/remy/motion/primitives.tsx` (no duplicated animation logic); cheap infinite AMBIENT loops (glow / motes / breathing) stay in CSS. **Status:** LOCKED.
- **Decision:** Nest evolution = 6 stages (Tiny→Cozy→Family→Golden→Memory Tree→Sanctuary) driven by REAL memory counts threaded from the app shell; dedicated per-stage nest ARTWORK is a future registry-only drop. **Status:** LOCKED.
- **Decision:** App-wide companion presence = three surfaces mounted ONCE in the shell (RemyScreenAwareness, RemyCelebration, RemyMilestones), driven by the ONE event bus + single `<Remy>` renderer; each renders null until Remy reacts. **Status:** LOCKED.
- **Decision:** Milestone celebrations derive from REAL memory counts (persisted last-count; no retroactive celebration on first load). Companion effects (feather/sparkle/heart) are centralized in `components/remy/effects/RemyEffects.tsx`; the feather uses the real `goldenFeather` asset. **Status:** LOCKED.
- **Decision:** The event bus's initial-mount replay buffer belongs to the Brain (the first `{replay:true}` subscriber); any SECONDARY bus listener MUST subscribe with `{ replay: false }`. **Status:** LOCKED.
- **Decision:** Companion Intelligence = two PURE core engines (`insights-engine` → observations, `priority-engine` → at most one), a once-per-app-open surface (`RemyMoments`), a read-only snapshot loader, and behavioural memory in the persistence layer. It is deterministic + rule-based — **NOT AI chat, NOT notifications, NOT a poll/background job**; max one proactive moment at a time, cooldown-gated. **Status:** LOCKED. **Do NOT** put clock/DB access in the engines, poll the snapshot, or fabricate observations for absent data.

==================================================
## KNOWN OPEN ITEMS
==================================================

**CRITICAL** *(blocks launch)*
- UGC report/block + EULA abuse clause (Apple 1.2) — engineering, not started.
- Operator go-live steps (migrations applied, env set, commits pushed, mailboxes, legal jurisdiction, submission package, screenshots) — see LAUNCH BLOCKERS.

**IMPORTANT** *(soon after launch)*
- HTTP security headers + API rate limiting (both absent).
- Memory EDIT/DELETE authorization is `user_id`-scoped only (fails safe/restrictive) — does not apply the `userCanWriteProfile` access_level model like create. Decide whether caregiver-edit parity is intended.
- Ask Remy's semantic retrieval is NOT premium-gated (the standalone `/api/memories/search` endpoint is).
- Remove dead code: orphan `/api/create-reminder`, legacy `/api/send-reminders`, orphan `/api/search`.
- Fix `.env.local` local formatting bug (CRON_SECRET missing a trailing newline before TOMBSTONE_USER_ID) — local only.

**FUTURE** — see POST-LAUNCH ROADMAP.

**Documentation divergences** *(source code is authoritative)* — **reconciled in the 2026-07-09 sync pass:** HANDOFF was rebuilt as a lightweight continuation doc (the stale "memory-media public" + "11–14 unpushed commits" + obsolete-roadmap/blocker lines removed); CLAUDE.md's Pass-1 `RemyActionButton` reference now carries a SUPERSEDED marker pointing to the Nest note; and `docs/roadmap/launch-roadmap.md` carries a SUPERSEDED banner deferring to this file. Remaining, still true (not a contradiction):
- RLS applied-state (memories INSERT + relationship/cluster tables) is **dashboard-managed** → confirm in the Supabase SQL editor; not repo-verifiable.
- CLAUDE.md keeps older per-feature notes (Polaris Pass-1, "access_level open") in place as dated history, each explicitly **superseded** by a later authoritative note — layered supersession, not a live contradiction.

==================================================
## LAST COMPLETED TASK
==================================================

Summary: **Companion Intelligence layer** — Remy now notices meaningful things proactively (behavioural intelligence, NOT AI chat / notifications / polling). Two PURE core engines: `insights-engine.ts` maps a `CompanionSnapshot` → behavioural `Observation[]`; `priority-engine.ts` dedupes + drops cooling-down + ranks (urgency→importance) → **at most ONE** moment. `RemyMoments` (mounted once) runs **once per app-open** — a single read of a new read-only, auth-gated, workspace-scoped snapshot loader (`app/api/remy/companion-snapshot`, never polled) — then briefly shows one moment through the single `<Remy>` renderer (portaled, tap-to-dismiss, aria-live, reduced-motion-safe). Behavioural memory (`persistence.ts` `CompanionMemory`: last-visit day, acknowledged Nest stage, per-kind cooldowns) means greetings fire once/day and moments never repeat. Extends the ONE platform (single renderer + persistence + core); no second provider/bus/brain. Adversarial review CLEAN (12/12). Files: `lib/remy/core/{insights-engine.ts (new), priority-engine.ts (new)}`, `lib/remy/companion/persistence.ts`, `app/api/remy/companion-snapshot/route.ts` (new), `components/remy/companion/RemyMoments.tsx` (new), `lib/remy/index.ts`, `app/(app)/layout.tsx`. Validation: tsc clean · lint 0 errors · build ✓. **Prior task (also on this branch): App-wide Remy companion layer** — extended the ONE Remy platform (no second AI/renderer/provider/bus/brain; backwards-compatible) to make Remy a presence across the whole app. **(1) Screen awareness:** `RemyScreenAwareness` (mounted once) publishes a brief arrival reaction per screen via a pure route→event map (`lib/remy/core/screen-behavior.ts`); new `screen.*` events added to the vocabulary (`events.ts` + `emotion-engine.ts`). **(2) Milestone celebrations from REAL counts:** `RemyMilestones` compares the real workspace `memoryCount` against a persisted last-count (`lib/remy/companion/persistence.ts`) and emits `milestone.reached` on crossings (`lib/remy/core/achievements.ts` — first/10/50/100/500/1000 + Nest stage-ups; baselines on first load, no retroactive spam). **(3) Celebration surface:** `RemyCelebration` (mounted once) subscribes to the bus and plays a centre-stage feather-burst + sparkles + heart through the single `<Remy>` renderer using the **real `goldenFeather` asset**; portaled, pointer-events-none, aria-live, reduced-motion-safe. **(4) Reusable effects:** `components/remy/effects/RemyEffects.tsx` (framer-motion, centralized). **Regression found + fixed by adversarial review:** the celebration surface (a provider child) subscribing to the raw bus was draining the initial-mount replay buffer meant for the Brain → added a backwards-compatible **`{ replay: false }`** subscribe option (`event-bus.ts`) so the Brain (default replay) always gets the buffer regardless of order.

Files Changed: `lib/remy/core/{events.ts, emotion-engine.ts, screen-behavior.ts (new), achievements.ts (new), event-bus.ts}`, `lib/remy/companion/persistence.ts` (new), `lib/remy/index.ts`, `components/remy/effects/RemyEffects.tsx` (new), `components/remy/platform/RemyScreenAwareness.tsx` (new), `components/remy/companion/{RemyCelebration.tsx (new), RemyMilestones.tsx (new)}`, `app/(app)/layout.tsx`.

Commit: *(this increment — see git log; prior HEAD a818fb0)*

Validation: `npx tsc --noEmit` clean · `npm run lint` 0 errors (2 pre-existing warnings) · `npm run build` ✓ · independent adversarial review (11/12 CLEAN; the 1 regression found was fixed + re-validated).

==================================================
## NEXT RECOMMENDED TASK
==================================================

**Build the UGC report-and-block moderation layer + EULA abuse clause (Apple Guideline 1.2).**

The single highest-priority engineering deliverable before App Store submission: because memories are shared into caregiver/family workspaces, RemyNest is a user-generated-content app that shares content between users, so Apple requires a report mechanism, a user-block mechanism, and an EULA abuse clause. It is the last App-Store-required engineering feature standing between the finished product and submission. (Not Restore Purchases — unnecessary in the web-only purchase model.)

==================================================
## MAINTENANCE PROTOCOL (how this file stays true)
==================================================

**Start of every session/task:** read this file → CLAUDE.md → HANDOFF_CURRENT.md → relevant architecture/feature docs → only the source files the task needs.

**Before suggesting any feature, check:** (1) does it already exist? (2) already completed? (3) intentionally deferred? (4) in DO NOT REBUILD? (5) already implemented differently? If any = yes → do NOT suggest it.

**After every completed task, automatically (never ask) — the mandatory 6-step workflow:**
1. **Verify against source code** (source is the only authority — never rely on memory or docs alone).
2. **Update this file** (`REMY_MASTER_STATE.md`): VERIFIED COMPLETE, Current/Next Task, Last Completed Task, launch % + project %, milestone, sprint, and the header (Commit / Branch / Repository Verified).
3. **Update `HANDOFF_CURRENT.md`** — keep it a lightweight continuation doc; it must never contradict this file.
4. **Update `CLAUDE.md` ONLY if architecture changed** → also append the decision to LOCKED ARCHITECTURE DECISIONS here.
5. **Verify documentation still matches source** (reconcile forward; source wins).
6. **Only then continue** to the next roadmap task.
