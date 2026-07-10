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
Readiness**. No implementation task is active — the last work was the Conversation Verbalizer Engine (the
FIRST provider-boundary layer; it builds the deterministic PROVIDER REQUEST + prompt contract, with the
real LLM verbalization DEFERRED — no network/LLM call). `main` auto-deploys to production on push.
Authoritative detail: master state → PROJECT STATUS.

## Completed work
Authoritative list: master state → **VERIFIED COMPLETE**. Most recent tasks (newest first):
- **Conversation Verbalizer Engine** (the FIRST provider-boundary layer) — PURE, deterministic, SYNCHRONOUS
  engine that consumes ONLY the `ConversationComposition` (+ render/assembly) and assembles the deterministic
  PROVIDER REQUEST (`ConversationOutput`: text/citations/metadata/tokens/generation) a FUTURE provider
  adapter (OpenAI/Anthropic/…) would send — the strict prompt with the mandatory 7-clause PROMPT CONTRACT
  embedded verbatim, citations back to real ids, and provider/token/generation metadata. **The actual LLM
  verbalization is DEFERRED**: the engine makes NO network/LLM call; `text=""`, `verbalized=false`,
  `status="deferred"`. A real provider ADAPTER (the ONLY place a fetch/LLM call may live) is NOT built. It
  does NO intelligence (every refId resolves from an existing referencePlan). **Deterministic vs
  non-deterministic boundary:** all inputs + this output are deterministic; the only non-determinism (a
  future LLM's wording) is not in this output; the LLM may choose wording but NOT content. **Feeds NOTHING**
  — NO significance-engine change, NO prior deterministic engine changed; computed then `void`-ed. No UI
  change (one RemyMomentChip). Independent MULTI-AGENT adversarial review CLEAN (7 lenses, 0 findings).
  tsc/lint/build green.
- **Conversation Composer Engine** (the FIRST natural-language-planning layer) — PURE engine that adds NO
  intelligence: it consumes ONLY the `ConversationRender` + the `AnswerAssembly` it renders (+ optional
  style/audience/intent controls) and prepares a deterministic COMPOSITION PLAN
  (`ConversationComposition`: sections/paragraphs/sentencePlans/referencePlans/flow/metadata/context/
  summary) of how a FUTURE LLM/API provider would compose the answer. It generates NO language (sentence
  plans are structural roles opening/topic/evidence/transition/closing — never text), performs NO
  retrieval/ranking/reasoning/chronology/significance/fact-decisions, and reference plans point at real
  ids (kind via a `kindMapOf` join). Every field is a structured id/enum/number; empty render → empty
  composition. **Deliberately feeds NOTHING** — NO significance-engine change, NO prior deterministic
  engine changed; computed then `void`-ed in RemyRelationship (consumer = future LLM/API layer). No UI
  change (one RemyMomentChip). Independent MULTI-AGENT adversarial review CLEAN (7 lenses, 0 findings).
  tsc/lint/build green.
- **Conversation Rendering Engine** (the FIRST presentation-layer engine) — PURE engine that adds NO
  intelligence: it consumes ONLY the `AnswerAssembly` (+ optional tone/verbosity/perspective controls) and
  prepares deterministic RENDER INSTRUCTIONS (`ConversationRender`: sections/metadata/summary/context) for a
  FUTURE conversational/LLM layer. It does NOT retrieve/reason/rank/build-chronology/generate language —
  **NOT chat/GPT/LLM.** Sections = top-maxSections assembly sections as render instructions (structural
  `render-<sectionId>` id + style hint + importance + real evidence ids); metadata opening/closing are
  structural section-id pointers (never text); every field is a structured id/enum/number; empty assembly →
  empty render. **Deliberately does NOT feed significance** (presentation, not a memory signal) — NO
  significance-engine change; computed then `void`-ed in RemyRelationship (consumer = future layer). No UI
  change (one RemyMomentChip); NO prior deterministic engine changed. Independent MULTI-AGENT adversarial
  review CLEAN (7 lenses, 0 findings). tsc/lint/build green.
- **Answer Assembly Engine** (the FINAL deterministic intelligence layer) — PURE engine assembling ONLY
  the structured, FACTUAL answer package a FUTURE conversational layer will VERBALIZE (`AnswerAssembly`:
  sections/chronology/evidence/entity-lists/coverage/context/summary). **NOT chat, NOT GPT, NOT an LLM,
  generates NO answers.** Sections = answer-plan steps as structured sections (fixed map); chronology =
  real life-story chapters ordered (ids/order/confidence); evidence/references = real entities aggregated/
  deduped/ranked/bounded (+ each memory's real biography chapter, memories graph-ranked); coverage =
  structured 0–100 metrics. No prose/answers, no invented ids, zero output when data absent; all 9
  required inputs genuinely consumed. INTERNAL (not shown); sits after answer-planning; its per-memory
  section weight feeds significance (final clean optional context extension). No snapshot/DB/UI change;
  downstream pipeline order preserved. Independent MULTI-AGENT adversarial review CLEAN (7 lenses, 0
  findings). tsc/lint/build green. **Completes the deterministic intelligence stack** — the next Remy
  layer would be the conversational/LLM rendering layer (separate approved phase).
- **Answer Planning Engine** — PURE engine building the deterministic EXECUTION PLAN a FUTURE
  conversational layer will run after Question Understanding (`AnswerPlan`: steps/sources/context/coverage/
  summary). **NOT chat, NOT GPT, NOT an LLM, produces NO answers.** Steps = ordered structured retrieval
  steps, each executing a real question intent (fixed intent→step map; `place`→no step; `reference` step
  kind reserved); sources = the real entity pool (memory sources ranked by real graph connectivity, +
  biography chapters/milestones/optional significant+favourites). No prose/answers, no invented ids; all 8
  required inputs genuinely consumed. INTERNAL (not shown); sits after question-understanding; its
  per-memory step weight feeds significance (clean optional context extension). No snapshot/DB/UI change;
  downstream pipeline order preserved. Independent MULTI-AGENT adversarial review CLEAN (7 lenses, 0
  findings). tsc/lint/build green.
- **Question Understanding Engine** — PURE engine building the deterministic retrieval-intent layer a
  FUTURE conversational layer will use to convert a PARSED question into structured intent
  (`QuestionUnderstanding`: intents/focus/constraints/references/context/summary). **NOT chat, NOT GPT,
  NOT an LLM, takes NO free-text.** Intents = answerable retrieval intents (13 kinds), each from a real
  upstream entity; the `place` kind is NEVER produced (no location data — a no-backing kind yields zero,
  never a fabricated one). Focus/constraints/references are real structured ids only; no natural language,
  no invented ids. INTERNAL (not shown); sits after conversation-foundation; its per-memory intent weight
  feeds significance (clean optional context extension). No snapshot/DB/UI change; downstream pipeline
  order preserved. Independent MULTI-AGENT adversarial review CLEAN (7 lenses, 0 findings). tsc/lint/build
  green.
- **Conversation Foundation Engine** — PURE engine building the deterministic groundwork a FUTURE
  conversational layer will consume (`ConversationFoundation`: topics/threads/references/context/summary).
  **NOT chat, NOT GPT, NOT an LLM, NOT prompts, NOT generated text.** Topics = real recurring subjects
  (anchor/theme/person/life-stage, each ≥ MIN_TOPIC_MEMORIES; "other" excluded, anchor-themes not
  duplicated); threads = a topic's memories grouped by the real biography chapter; references point ONLY at
  real ids (bounded). No invented topics/threads/memories/people/dates; no narration/prompts. INTERNAL (not
  shown); sits after biography; its per-memory topic weight feeds significance (clean optional context
  extension). No snapshot/DB/UI change; downstream pipeline order preserved. Independent MULTI-AGENT
  adversarial review CLEAN (7 lenses, 0 findings). tsc/lint/build green.
- **Biography Engine** — PURE engine assembling a STRUCTURED (non-prose) representation of a life from
  the real journey/life-story/reasoning/graph/understanding layers (`BiographyAnalysis`: sections/periods/
  references/coverage/summary). Sections mirror real life-story chapters 1:1 (title reuses the real chapter
  title); periods group by life stage using only real years (0 when undated); references point ONLY at
  real journey/chapter/anchor/theme/person/memory ids (bounded); coverage/summary are structured metrics.
  No paragraphs/narration, no fabricated memories/people/dates/chronology. INTERNAL (not shown); sits after
  reasoning; its per-memory section coverage feeds significance (clean optional context extension). No
  snapshot/DB/UI change; downstream pipeline order preserved. Independent MULTI-AGENT adversarial review
  CLEAN (7 lenses, 0 findings). tsc/lint/build green.
- **Reasoning Engine** — PURE engine reasoning over the real journey/life-story/graph/understanding
  layers to derive Remy's structural understanding OF a life (`ReasoningAnalysis`: anchors/themes/
  influences/relationshipStrengths/gaps/summary): Life Anchors (dominant pillars — `"other"` never
  anchors, `≥ MIN_ANCHOR_MEMORIES`), Life Themes, Life Influences (real memory/journey/graph signal),
  Relationship Strengths (counts only, no emotional reading), Memory Gaps (FACTUAL only — never a guess
  at WHY). All structured numbers, no prose; no GPT, no fabricated anchors/people/dates/chronology.
  INTERNAL (not shown); sits after life-story; its per-memory anchor strength feeds significance (clean
  optional context extension). No snapshot/DB/UI change; downstream pipeline order preserved. Independent
  MULTI-AGENT adversarial review CLEAN (7 lenses, 0 findings). tsc/lint/build green.
- **Life Story Engine** — PURE engine assembling the canonical CHRONOLOGICAL life story from real
  journeys (`LifeStoryAnalysis`: story/chapters/timeline/milestones/summary) — the source for future AI
  conversation / biography / timeline UI / story-book export / reasoning. Chapters = runs of
  chronologically-continuous, CONNECTED journeys (join only when years continuous [dated gap
  `> MAX_HARD_GAP` always splits], life stages compatible, AND a real relational signal supports it);
  disconnected journeys never merged, chapters/years/events never invented, timeline/milestones/titles
  reference only existing journeys/years/memories (no prose). Undated → year 0 (never fabricated).
  INTERNAL (not shown); sits after journey; its per-memory life-story centrality feeds significance
  (clean optional context extension). No snapshot/DB/UI change; downstream pipeline order preserved.
  Independent MULTI-AGENT adversarial review CLEAN (4 lenses × 12 points, 0 findings). tsc/lint/build green.
- **Journey Engine** — PURE engine turning the understanding + graph layers into complete LIFE JOURNEYS
  (`JourneyAnalysis`: journeys/connections/summary) — connected memories representing one continuous life
  period (School Years / Career / Family Holidays / Medical Journey / …). Journeys emerge from REAL signals
  only (theme + life stage + shared people + chronological continuity + graph connectivity); unconfident
  groups (below MIN_JOURNEY_SIZE or split by a large real gap) are left separate — never force-merged;
  undated memories never fabricate a year. No GPT/fabricated journeys/years/links. INTERNAL (not shown);
  sits after memory-graph; its per-memory journey significance feeds significance (clean optional context
  extension). No snapshot/DB/UI change; downstream pipeline order preserved. Adversarial review CLEAN
  (12/12, no blocking issues). tsc/lint/build green.
- **Memory Graph Engine** — PURE engine turning the understandings into a deterministic semantic graph
  (nodes/edges/clusters) of how memories connect — edges from REAL shared attributes only (same-person/
  family/theme/chapter/year/category/event/life-stage), weighted, pruned + capped; theme clusters. No
  GPT/fabricated links. INTERNAL (not shown); sits after memory-understanding; its edge-degree feeds
  significance (clean optional context extension). No snapshot/DB change. Adversarial review CLEAN
  (12/12; the flagged event/category double-count was fixed). tsc/lint/build green.
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
Engine (`cc768a9`), the Memory Understanding Engine (`63e944e`), the Memory Graph Engine (`d6cfb9c`),
the Journey Engine (`11afd67`), the Life Story Engine (`c9b3c93`), the Reasoning Engine (`96e6ce0`), the
Biography Engine (`984f4b6`), the Conversation Foundation Engine (`96ee7b7`), the Question
Understanding Engine (`3489d40`), the Answer Planning Engine (`45f9314`), the Answer Assembly Engine
(`c46a4f2`), the Conversation Rendering Engine (`74b96d1`), the Conversation Composer Engine (`0c8c91f`), and the
Conversation Verbalizer Engine on top. **Not pushed** — pushing auto-deploys to prod, so it is an operator
decision. tsc/lint/build green.

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
- *(HEAD)* feat(remy): Conversation Verbalizer Engine — provider boundary and natural language generation
- `0c8c91f` feat(remy): Conversation Composer Engine — first NL-planning layer, deterministic composition plan
- `74b96d1` feat(remy): Conversation Rendering Engine — first presentation layer, deterministic render metadata
- `c46a4f2` feat(remy): Answer Assembly Engine — final deterministic factual answer package (no answers)
- `45f9314` feat(remy): Answer Planning Engine — deterministic execution plan (no generated answers)
- `3489d40` feat(remy): Question Understanding Engine — deterministic retrieval-intent layer (no free-text)
- `96ee7b7` feat(remy): Conversation Foundation Engine — deterministic groundwork for a future chat layer
- `984f4b6` feat(remy): Biography Engine — pure structured (non-prose) representation of a life
- `96e6ce0` feat(remy): Reasoning Engine — pure structural reasoning about a life over the real layers
- `c9b3c93` feat(remy): Life Story Engine — pure canonical chronological life story from journeys
- `11afd67` feat(remy): Journey Engine — pure deterministic life journeys from understanding + graph
- `d6cfb9c` feat(remy): Memory Graph — pure deterministic semantic links between memories
- `63e944e` feat(remy): Memory Understanding — pure per-memory semantic engine (front of pipeline)
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
