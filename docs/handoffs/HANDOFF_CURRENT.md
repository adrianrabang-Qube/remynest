# Handoff — Current

> **Lightweight continuation log.** The authoritative project state lives in
> **[`docs/REMY_MASTER_STATE.md`](../REMY_MASTER_STATE.md)** (launch %, milestone, current/next
> task, VERIFIED COMPLETE, DO NOT REBUILD, LOCKED decisions, blockers, open items). Read that
> **FIRST**, then `CLAUDE.md`, then this file. **Source code always wins over any doc.** This file
> holds only the recent continuation context and must never contradict the master state.
>
> *(The detailed pre-2026-07-09 handoff log — ~2,400 lines — was superseded by the master state +
> CLAUDE.md authoritative notes and slimmed to this continuation doc on 2026-07-09. The full prior
> history remains in git.)*

Last Updated: 2026-07-09
Authoritative state: `docs/REMY_MASTER_STATE.md`

## Current status
Launch-scope build **~90%** complete; overall **~70%**. Current milestone: **App Store Submission
Readiness**. No implementation task is active — the last work was the Memory Understanding Engine.
`main` auto-deploys to production on push. Authoritative detail: master state → PROJECT STATUS.

## Completed work
Authoritative list: master state → **VERIFIED COMPLETE**. Most recent tasks (newest first):
- **Memory Understanding Engine** — PURE engine at the front of the pipeline turning each REAL memory
  into a structured `MemoryUnderstanding` (themes/life-stage/importance/richness/relationship/confidence;
  deterministic, real-data-only, no prose/GPT/fabrication). INTERNAL (not shown); feeds the richness
  ratios today, exported for future engines. Pipeline: snapshot → memory-understanding → story → …
  No snapshot/DB change (reads the Phase-5-enriched DatedMemory). Adversarial review CLEAN (12/12).
  tsc/lint/build green.
- **Emotional Intelligence Engine** — Remy understands PEOPLE + emotional SIGNIFICANCE (not quantity).
  Three PURE engines (`significance-engine` ranks by significance not recency; `emotional-engine` →
  `EmotionalProfile`; `personality-engine` → behavioural traits — raw scores NEVER exposed).
  `relationship-engine` consumes the profile → 5 new observations. Pipeline wired in `RemyRelationship`
  (snapshot→story→favourite→anniversary→significance→emotional→personality→relationship→priority→one
  renderer); snapshot enriched with real `attachments`/`ai_importance`/`memory_person_links`/historical.
  Adversarial review CLEAN (12/12). tsc/lint/build green.
- **Living Relationship System** — long-term behavioural relationship (NOT AI/chat/notifications/poll).
  Six PURE engines (relationship/story/anniversary/favourite/legacy/legacy-export, `lib/remy/core/*`)
  over REAL data (memories/people/dates; chapters inferred, anniversaries day-precision only), a
  once-per-app-open surface (`RemyRelationship`) over a read-only workspace-scoped snapshot loader
  (`/api/remy/relationship-snapshot`), a shared `RemyMomentChip` + `moment-gate` (one moment globally)
  + generic `selectMoment`, and relationship memory in persistence. Adversarial review CLEAN (14/14).
  tsc/lint/build green.
- **Companion Intelligence layer** — Remy notices meaningful things proactively (behavioural, NOT chat/
  notifications/polling). Two PURE core engines (`insights-engine` → observations, `priority-engine` →
  at most one), a once-per-app-open surface (`RemyMoments`) over a read-only workspace-scoped snapshot
  loader (`/api/remy/companion-snapshot`), and behavioural memory (last-visit/ack-stage/cooldowns) in
  the persistence layer. Extends the ONE platform (single renderer + persistence + core). Adversarial
  review CLEAN (12/12). tsc/lint/build green.
- **App-wide Remy companion layer** — Remy now reacts across the whole app via 3 shell-mounted surfaces
  (all render null until Remy reacts): `RemyScreenAwareness` (per-screen arrival reactions),
  `RemyMilestones` (milestone celebrations from REAL memory counts, persisted, no retroactive spam), and
  `RemyCelebration` (centre-stage feather-burst + sparkles + heart via the single `<Remy>` renderer +
  the real `goldenFeather` asset). Extended the ONE platform vocabulary (`screen.*`/`milestone.reached`)
  + centralized effects. Adversarial review caught + fixed one regression (celebration surface draining
  the Brain's replay buffer → event-bus `{replay:false}` option). tsc/lint/build green.
- **Living Nest companion increment** — new time-of-day platform layer (ambient lighting + moonlight at
  night + night→sleeping + time greeting), Nest evolution wired to **REAL memory counts** (6 stages
  Tiny→Sanctuary), centralized **framer-motion** "Remy offers actions" reveal (de-menu-ified) + ambient
  CSS life. Platform extended (not redesigned); single `<Remy>` renderer preserved. tsc/lint/build green.
- **Documentation synchronization system** — `docs/REMY_MASTER_STATE.md` established as the single
  source of truth; this HANDOFF slimmed to a continuation doc; CLAUDE.md startup read-order + 6-step
  maintenance protocol formalized.
- **The Nest — behaviour-driven companion** (`a97dfac`) — behaviour layer added to the Remy platform
  (`lib/remy/core/behavior.ts` + `nest.ts`); menu is a consequence of the `greeting` behaviour.
- **The Nest interaction hub** (`e73dc7e`) — replaced the center action-sheet; `RemyActionButton` retired.
- **Caregiver `access_level` enforcement on writes** (`f53694b`).
- **Subscription downgrade entitlement reconciliation** (`1f5420a`).
- **Owner-only caregiver revoke/remove** (`e0c2e81`).
- **Project Polaris** — all 8 UX passes (through `c6127ea`).

## Open issues
Authoritative list: master state → **KNOWN OPEN ITEMS**. Highlights (none block the web app):
- IMPORTANT (post-launch-soon): HTTP security headers + rate limiting (absent); memory edit/delete
  authz is `user_id`-scoped (fails safe, not `access_level`-parity); Ask Remy semantic retrieval is
  not premium-gated; remove dead routes (`/api/create-reminder`, `/api/send-reminders`,
  `/api/search`); `.env.local` CRON_SECRET newline.
- RLS applied-state (memories INSERT + relationship/cluster tables) is **dashboard-managed** — confirm
  in the Supabase SQL editor (not repo-verifiable).
- **Resolved — do NOT re-flag:** `memory-media` bucket is **PRIVATE** (PHI via signed URLs only; the
  old "bucket is public" note is obsolete); subscription→storage-tier is fully wired (not a stub);
  `access_level` IS enforced on writes; landing store buttons ARE wired to `/download`;
  `/api/stripe/cancel` exists; the `save-onesignal`/`save-subscription` endpoints were removed.

## Active branch
`main` (production; auto-deploys on push) — **unpushed, ahead of `origin/main` (`f53694b`)**: the Nest
hub (`e73dc7e`, `a97dfac`), the documentation-sync system (`7f65178`, `94088c3`, `ce0feb5`), the living
Nest companion increment (`a818fb0`), the app-wide Remy companion layer (`5598641`), the Companion
Intelligence layer (`ded5a4d`), the Living Relationship System (`ccfb907`), the Emotional Intelligence
Engine (`cc768a9`), and the Memory Understanding Engine on top. **Not pushed** — pushing auto-deploys
to prod, so it is an operator decision. tsc/lint/build green.

## Next priorities
Single next task (master state → **NEXT RECOMMENDED TASK**): **UGC report/block + EULA abuse clause
(Apple Guideline 1.2)** — the last App-Store-required engineering feature before submission. After
that: HTTP security headers + rate limiting. All other launch work is operator/product/legal — see
master state → **CURRENT LAUNCH BLOCKERS**.

## Blockers
**Infrastructure: NONE** (B1/B2/B3/B5 done; B4 PITR deferred by accepted decision). The remaining
launch gate is one engineering feature (UGC report/block, Apple 1.2) plus operator/product/legal
steps (apply prod migrations, set Vercel env, push commits, legal jurisdiction, contact mailboxes,
store assets + submission). Full ENG/PRODUCT/LEGAL/OPERATOR split: master state → CURRENT LAUNCH BLOCKERS.

## Recent commits
- *(HEAD)* feat(remy): Memory Understanding — pure per-memory semantic engine (front of pipeline)
- `cc768a9` feat(remy): Emotional Intelligence — significance/emotional/personality engines
- `ccfb907` feat(remy): Living Relationship System — relationship/story/anniversary/favourite/legacy engines
- `ded5a4d` feat(remy): Companion Intelligence — insights + priority engines, proactive moments
- `5598641` feat(remy): app-wide companion — screen awareness, milestone celebrations, effects
- `a818fb0` feat(remy): living Nest companion — time-of-day, real-count evolution, framer-motion
- `ce0feb5` docs(sync): reconcile all docs to HEAD — lightweight HANDOFF, exact startup order
- `94088c3` docs(sync): conform REMY_MASTER_STATE header to finalized workflow spec
- `7f65178` docs(sync): establish REMY_MASTER_STATE.md single source of truth
- `a97dfac` fix(remy): make the Nest a behaviour-driven companion, not a prettier FAB
- `e73dc7e` feat(nav): replace center action-sheet with the Nest interaction hub
- `f53694b` feat(caregiver): enforce access_level on care-profile writes
- `1f5420a` feat(billing): reconcile caregiver entitlement on subscription downgrade
- `e0c2e81` feat(care): owner-only caregiver revoke/remove access
- `c6127ea` feat(ux): Project Polaris Pass 8 — calmer Reminders
- `c0f0496` feat(ux): Project Polaris Pass 7 — calmer Settings
- `e9d4f4f` feat(ux): Project Polaris Pass 6 — calmer Library
- *(Project Polaris passes 1–5 and the full prior history remain in `git log`.)*
