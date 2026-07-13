# RemyNest — Engineering History & Branch Archive

> **Purpose.** A permanent, professional record of how RemyNest evolved from its first
> commit to a certified Production Release Candidate, and an archive of the branches and
> tags that preserve that history. This document exists so any future contributor
> immediately understands the project's evolution and the branch/tag conventions.
>
> **Archival pass:** 2026-07-13. No branches, tags, code, or history were modified — this is
> a documentation-only record. `main` is the sole active production branch.

---

## 1. At a glance

| | |
|---|---|
| **Genesis** | `ee43f72` — *Initial commit from Create Next App* — **2026-04-15** |
| **Production RC head** | `b1b004c` — *feat(storage): capacity as composed entitlement* — **2026-07-13** |
| **Total commits** | ~520 |
| **Active branch** | `main` ( == `origin/main`, in sync) |
| **Historical branches** | 7 (all preserved — see §4) |
| **Release tags** | 13 (genesis → v0.9 foundation; see §5) |
| **Certification** | GO for production — 96/100, 0 engineering blockers (`docs/RC-FINAL-CERTIFICATION.md`) |

---

## 2. Engineering evolution timeline

```
Genesis (Next.js + OneSignal + cron)
        ↓
MVP & Memory CRUD
        ↓
Memory Intelligence & Semantic Cognition
        ↓
Living Workspace (My Nest vs Care Profiles)
        ↓
Hardening · Capacitor Mobile · Media Privacy
        ↓
Remy Companion · Reminders · Native Local Notifications
        ↓
Remy Platform v2 · Deterministic Conversation Engines
        ↓
Release Certification Programme (RC2–RC5 · LA1–LA7)
        ↓
RC Certification · Avatar Tier · Polish · Final QA · Storage Architecture
        ↓
Production Release Candidate  (main @ b1b004c)
```

### Era 1 — Genesis & MVP (2026-04-15 → 2026-05-04)
The project began as a Create-Next-App scaffold. Push notifications (OneSignal) and the
reminder cron route landed within the first week. Memory CRUD, the memory UI, and the MVP
base stabilised through early May.
*Tags:* `v1-backend-stable` (05-01) · `v2-crud-stable`, `v1-stable-memory-ui`,
`v1-stable-mvp-base` (05-02) · `v0.1-mvp-stable` (05-03) · `v0.1-memories-stable` (05-04).

### Era 2 — Memory Intelligence & Semantic Cognition (2026-05-10 → 2026-05-20)
The AI memory-intelligence pipeline, timeline foundation, and cognitive metadata backend
were built (`a511592`, 2026-05-18), followed by semantic cognition and the animated landing
mockup.
*Tags:* `v1-semantic-cognition`, `v2-cognition-stable` (05-19).

### Era 3 — Living Workspace: My Nest vs Care Profiles (2026-05-26 → 2026-06-02)
Enterprise workspace isolation between personal ("My Nest") and care-profile contexts —
the architectural spine still in production. Stripe premium/family plans and attachments
matured alongside.
*Tag:* `production-stable-workspace-isolation` (05-31) · `v0.9-attachment-stable` (06-02).
*Branches:* `living-workspace-v1` (05-31), `living-workspace-v2` (06-02),
`backup/cognition-v2-pre-sync` (05-31).

### Era 4 — Hardening, Capacitor Mobile & Media Privacy (2026-06-04 → 2026-06-11)
Production hardening + timeline stabilisation; the Capacitor iOS wrapper (remote-URL
WebView); a Playwright E2E harness; and the media-privacy model (private `memory-media`
bucket + signed URLs).
*Tags:* `production-hardening-clean` (06-04) · `media-privacy-complete` (06-08) ·
`remynest-v0.9-foundation` (06-11).
*Branches:* `hardening/v0.9.1-production` (06-04), `feat/capacitor-mobile` (06-05),
`qa/playwright-phase1` (06-05).

### Era 5 — Remy Companion & Reminders (2026-06-11 → 2026-06-24)
The Remy companion took shape — activity feed, avatar evolution, a presentation-layer voice
engine — plus the "Launch Fast Slice" (landing/billing/subscription wiring), the reminder
system's validation + freeze, and **native iOS local notifications** (offline, no
cron/APNs/OneSignal).
*Branch:* `cognition-v2` (06-20) — the native-local-notifications milestone.

### Era 6 — Remy Platform v2 & Deterministic Conversation Engines (2026-07-04 → 2026-07-09)
The companion was re-architected as a first-class platform service (`Event Bus → Brain →
Emotion/Policy Engines → Renderer`), then extended with the full deterministic
conversation-intelligence stack (memory-understanding → graph → journey → life-story →
reasoning → biography → conversation-foundation → question-understanding → answer-planning →
answer-assembly → rendering → composer → verbalizer → provider layer → OpenAI adapter →
execution → the opt-in live `/remy/story` surface). Billing gained caregiver-entitlement
reconciliation on downgrade.

### Era 7 — Release Certification Programme (2026-07-11 → 2026-07-13)
The final production run: **RC2** (security headers, rate limiting, OWASP, PHI-log removal),
Memory Intelligence Engine V2, AI usage/billing/quotas, **RC3** (GDPR), **RC4** (production
readiness), **RC5** (release certification, 94/100), then **LA1** (clinical de-medicalization),
**LA2** (WCAG 2.2 AA), **LA3** (performance), **LA4** (observability), **LA5 / LA5.1** (App
Store / Google Play compliance + Apple-1.2 UGC report/block/leave), **LA6** (disaster
recovery & business continuity), **LA7** (final launch-readiness audit → "no remaining
engineering blockers"). Closed by the **RC Final Certification** (GO, 96/100), the Remy
**avatar asset tier**, a production polish pass, a final QA pass, and the storage-capacity
architecture.

**→ Certified Production Release Candidate:** `main @ b1b004c` (2026-07-13).

---

## 3. Branch classification

| Branch | Class | Milestone it preserves | Tip date | Merged into main? | Feature on main? |
|---|---|---|---|---|---|
| **`main`** | **ACTIVE** | Canonical production line | 2026-07-13 | — | — |
| `living-workspace-v1` | Historical | Workspace isolation (My Nest vs Care) foundation | 2026-05-31 | ✅ Yes | ✅ Yes |
| `living-workspace-v2` | Historical | Dashboard workspace architecture + context layer | 2026-06-02 | ✅ Yes | ✅ Yes |
| `hardening/v0.9.1-production` | Historical | Production hardening + timeline stabilisation | 2026-06-04 | ✅ Yes | ✅ Yes |
| `feat/capacitor-mobile` | Historical | Capacitor iOS integration + GDPR delete harness | 2026-06-05 | ✅ Yes | ✅ Yes |
| `qa/playwright-phase1` | Historical | Playwright E2E harness + launch-prep reports | 2026-06-05 | ✅ Yes | ✅ Yes |
| `cognition-v2` | Historical — **Superseded** | Native iOS local notifications (offline) | 2026-06-20 | ⚠️ No (2 unique commits) | ✅ Yes (see note) |
| `backup/cognition-v2-pre-sync` | Archived (safety checkpoint) | Pre-sync working-state snapshot | 2026-05-31 | ✅ Yes | ✅ Yes |

**No branch is Obsolete or Experimental** — every one preserves a genuine milestone. Six are
fully merged into `main`; the seventh (`cognition-v2`) is superseded (see §4).

---

## 4. Historical archive — details (branches PRESERVED, not deleted)

All seven non-main branches are **kept intact for historical reference.** None will be
deleted. Their `origin/*` counterparts remain on GitHub.

- **`living-workspace-v1` / `living-workspace-v2`** — the "Living Workspace" architecture
  that introduced enterprise isolation between the personal *My Nest* context and shared
  *Care Profiles*. Fully merged; the model is production-current on `main`
  (`lib/profile-ownership.ts`, active-profile context, caregiver relationships).
- **`hardening/v0.9.1-production`** — the first production-hardening + timeline-stabilisation
  pass (= tag `production-hardening-clean`, `cadad66`). Fully merged; superseded many times
  over by RC2–LA7.
- **`feat/capacitor-mobile`** — the Capacitor iOS integration milestone (remote-URL WebView)
  plus the GDPR delete-account validation harness. Fully merged; the mobile wrapper is
  production-current (`capacitor.config.ts`, `ios/App/*`).
- **`qa/playwright-phase1`** — the Playwright E2E harness + launch-prep verification reports /
  operator checklists. Fully merged; the E2E suite lives on `main` (`e2e/*`).
- **`backup/cognition-v2-pre-sync`** — a deliberate safety checkpoint ("preserve current
  working changes") taken before a sync. Fully merged; retained as a historical snapshot.
- **`cognition-v2` — SUPERSEDED (the one branch not merged).** It carries **2 unique commits**
  (`577c340` native iOS local notifications; `2e3c8e1` Capacitor setup via SPM). Verified:
  the **feature is fully on `main`** — `lib/native-reminders.ts` is byte-identical,
  `NativeReminderSync.tsx` / `docs/features/local-notifications.md` / `AppDelegate.swift` are
  present as supersets. The only genuinely-unique files are `ios/App/CapApp-SPM/*` (the **SPM**
  linking approach), which `main` **deliberately replaced with CocoaPods** (`ios/App/Podfile`)
  per the authoritative CLAUDE.md decision *"do not re-add CapApp-SPM."* Git flags it as
  unmerged only because `main` obtained the same feature via a later reimplementation, not by
  merging this branch. **No valuable work is stranded.** Preserved as the historical origin
  of the native-notification design.

---

## 5. Tag audit

**Existing tags (13) — reviewed, accurate, NOT modified or deleted:**

| Date | Tag | Marks |
|---|---|---|
| 2026-05-01 | `v1-backend-stable` | Backend baseline |
| 2026-05-02 | `v2-crud-stable`, `v1-stable-memory-ui`, `v1-stable-mvp-base` | CRUD + memory UI + MVP base |
| 2026-05-03 | `v0.1-mvp-stable` | MVP stable |
| 2026-05-04 | `v0.1-memories-stable` | Memories stable |
| 2026-05-19 | `v1-semantic-cognition`, `v2-cognition-stable` | Semantic cognition |
| 2026-05-31 | `production-stable-workspace-isolation` | Workspace isolation |
| 2026-06-02 | `v0.9-attachment-stable` | Attachments |
| 2026-06-04 | `production-hardening-clean` | Production hardening |
| 2026-06-08 | `media-privacy-complete` | Private media + signed URLs |
| 2026-06-11 | `remynest-v0.9-foundation` | v0.9 foundation |

**Gap:** the tags stop at the v0.9 foundation (2026-06-11). The **entire production programme**
— the Remy platform v2, the conversation engines, and RC2 → LA7 → certification (2026-06-20 →
2026-07-13) — is **untagged**, so the archive has no marker for the certified release.

**Recommended additional milestone tags** (annotated; *operator to create — not created here,
per the do-not-modify-tags rule; existing tags untouched*):

```bash
git tag -a remy-platform-v2      2a23a97 -m "Remy platform service v2 (event bus → brain → engines → renderer)"
git tag -a rc-certified-production b646449 -m "RC Final Certification — GO for production (96/100, 0 engineering blockers)"
git tag -a v1.0-production-rc     b1b004c -m "Certified Production Release Candidate head"
# then: git push origin --tags   (operator step)
```

---

## 6. Active development policy

- **`main` is the canonical production branch** — the single source of truth and the only
  branch that receives active development.
- **Historical branches are preserved for reference ONLY.** They are frozen snapshots of past
  milestones (see §3/§4). They will not be deleted.
- **All future feature development branches from `main`** (`git switch -c feat/<name> main`) and
  merges back into `main`.
- **Historical branches must never receive new development work.** If a historical branch is
  ever needed as a starting point, branch a *new* branch from it and rebase onto `main` first —
  never commit onto the historical branch itself.
- *Optional GitHub-side enforcement (operator):* mark the historical branches "protected /
  read-only" in the GitHub UI, or rename their remotes under an `archive/` prefix, to make the
  reference-only status explicit. (Not performed here — this pass modifies nothing.)

---

*This document is the permanent engineering-history record. Update it when a new milestone
tag is cut or a new long-lived branch is intentionally created; otherwise it is a stable
archive. Authoritative live state remains `docs/REMY_MASTER_STATE.md`.*
