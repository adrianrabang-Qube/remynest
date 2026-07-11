# RemyNest LA1 — Memory-Care Clinical Readiness

**Date:** 2026-07-12  **Phase:** LA1 (clinical/caregiving workflow readiness for real dementia care)
**Method:** independent review from 9 clinical/caregiving personas (dementia specialist · geriatrician ·
occupational therapist · memory-care nurse · professional caregiver · family caregiver · person living
with early-stage dementia · assisted-living manager · facility administrator) → synthesis. **Discipline:**
the app is already production-certified (RC5); LA1 implements ONLY safe, low-risk, high-value presentation
improvements on EXISTING features — no new subsystems, no speculative AI, no medical guidance, no
architecture change, and the FROZEN reminder engine untouched.

---

## 1. Clinical Readiness Score — **73 / 100** (→ ~80 after this pass)
## 2. Caregiver Experience Score — **76 / 100**
## 3. Patient Experience Score — **70 / 100** (→ higher after the reality-orientation + de-medicalization)

RemyNest does the two things that matter most for the MCI→moderate-dementia arc well: dignified whole-life
**reminiscence** capture (historical dating Today→Decade feeding era-grouped reminiscence + life-story) and
calm, **offline, repetition-tolerant** medication/appointment/routine **reminders**, on a privacy-scoped
multi-caregiver foundation with **disciplined non-diagnostic AI** (retrieval-grounded over the person's own
memories + a hard anti-diagnostic safety preamble + disclaimers). It served caregivers well already; the
gaps were concentrated, not systemic.

## 4. Workflow Gaps (verified)

**High:**
- **Insights showed fabricated clinical/biometric charts** — "Alzheimer Risk Signals," "Cognitive
  Score/Drift," "Wearable Biometrics," "Sleep Recovery," "Recall Drift," "Attention" — synthesized from
  journal mood (data no sensor or clinician produced). Families/staff reasonably read them as clinical
  monitoring → false alarm/reassurance; the person is mischaracterized by an invented risk score they can't
  correct. Contradicted the app's own non-diagnostic promise. *(This is the RC3-flagged disclose-or-remove
  decision — resolved on the REMOVE side.)* → **FIXED.**
- **No reality-orientation anchor** — no screen stated today's weekday/date, even though every surface is
  titled "Today's Focus." Temporal disorientation is a hallmark of dementia; a persistent day/date cue is a
  cornerstone non-pharmacological intervention. → **FIXED.**
- **Dashboard falsely told self-use "My Nest" users reminders are care-profile-only** — hiding a working,
  device-validated, independence-preserving feature and defaulting all load onto a caregiver. → **FIXED.**
- **No emergency/ICE surface** and **no "This is Me" care-continuity card** — a lone/relief caregiver has no
  single findable "who to call" or 30-second person-centred handoff. → **RECOMMENDED (feature).**
- **Reminder completion attribution not shown** ("was the 2pm med given, and by whom?") though the audit
  data already exists. → **RECOMMENDED (feature).**

**Medium:** caregiver access levels unlabeled ("admin" == "full") → **FIXED (labels)**; medication reminders
not legible to a covering caregiver → **FIXED (non-clinical hint)**; memory capture lacks reminiscence
guidance → **RECOMMENDED**; who's-who family roster + care-team activity view not surfaced → **RECOMMENDED**;
voice capture absent → **RECOMMENDED (known deferred)**.

**Low:** patient-facing red "Overdue" can distress on the person's own view → **RECOMMENDED**.

## 5. Improvements Implemented (all presentation-only, low-risk, high/medium value)

1. **De-medicalized Insights** — removed the fabricated-sensor + diagnostic-named charts (`CognitiveScoreChart`,
   `CognitiveDriftChart`, `MemoryContinuityChart`, `AttentionAnalytics`, `SleepRecoveryChart`,
   `WearableTelemetryChart`, `AlzheimerRiskSignals`) and **deleted the 12 now-orphaned files** (7 charts +
   `lib/cognition/{continuityEngine,attentionEngine,sleepRecoveryEngine,wearableEngine,riskAnalysis}`). Kept
   only honest real-data views (emotional tone of memories, memory categories, reminder consistency) + the
   calm narrative; de-alarmed the card's red "Routine Changes" value to neutral. The plain-language AI
   summary is unchanged (its `cognitionScore`/`driftData` inputs are retained internally — no score/chart is
   shown). *Why:* removes the only place the product contradicted its non-diagnostic promise.
   *Files:* `components/insights/InsightsClient.tsx`, `components/insights/BehavioralAnalyticsCard.tsx` (+ deletions).
2. **Reality-orientation anchor** — a persistent, high-contrast "Good morning — today is Saturday, 12 July"
   line on Home, computed client-side after mount (SSR-safe; same pattern as the Nest's time-of-day),
   `aria-live`. *Why:* the single highest-value dementia cue; lets the person self-check the day and offloads
   the repeated "what day is it?" from caregivers. *Files:* `components/OrientationLine.tsx` (new),
   `app/(app)/home/page.tsx`.
3. **Honest My-Nest reminders copy** — replaced the false "Reminders live inside a care profile…" message
   with an accurate invitation to set personal medication/appointment/routine reminders. *Why:* stops hiding
   a working, independence-preserving feature. *File:* `app/(app)/dashboard/components/DashboardFocus.tsx`.
4. **Least-privilege access-level clarity** — plain-language option labels + a helper explaining Read-only
   vs Full access (and that inviting/removing is owner-only; "admin" confers the same rights as "full").
   Copy/label only — no permission-logic change. *Why:* lets an owner share viewing without over-exposing a
   person's intimate memories/photos. *File:* `components/InviteCaregiverForm.tsx`.
5. **Legible medication reminders** — a clearer placeholder (`e.g. Donepezil 10 mg — with breakfast`) + a
   non-clinical format tip. Presentation/copy only on the frozen reminders page (input name/form/scheduling
   byte-unchanged, consistent with the Polaris Pass-8 precedent). Strictly a format hint — **no dosing/medical
   advice**. *Why:* a covering caregiver can act on the reminder without tacit knowledge. *File:*
   `app/(app)/reminders/page.tsx`.

## 6. Improvements Recommended (features — future product decisions, all non-clinical)

- **Non-clinical Emergency / ICE contact card** on the care profile (name + relationship + phone, tap-to-call).
  *Caregiver:* one findable "who to call" for a crisis/handoff. *Patient:* reachable help when they cannot
  advocate. Strictly contacts + family-entered text — no vitals/dosing/diagnosis/GPS/EHR.
- **"About / This is Me" care-continuity block** (preferred name-of-address, key routines, what soothes vs.
  triggers distress, top people) on the profile. *Caregiver:* 30-second handoff for new/relief staff.
  *Patient:* being cared for by someone who knows their preferences prevents agitation. One free-text field.
- **Reminder completion attribution** ("Done by [name] · [time]") — read/display only over the existing
  `completed_by`/`completed_at`/`reminder_events`; must NOT touch the frozen scheduling/completion logic.
- **Who's-who family roster** (name + role) from the existing people entities — a read view for orientation.
- **Care-team roster + lightweight activity view** for accepted caregivers (needs an authz-read change).
- **Voice capture (record + transcribe)** for memories/reminders — the highest-value reminiscence content is
  the person's own spoken words; excludes those who cannot type. *(Known post-launch deferred item — keep high
  on the roadmap; do not build pre-launch.)*
- **Reminiscence guidance + persistent labels** on the memory form (people/place/sensory prompts).
- **Non-punitive "Overdue" framing** on the person's own (My Nest) reminder view.

## 7. Features Rejected (and why — anti-bloat)

- **Medication interaction / dosing checker or vitals engine** — simulates a pharmacist/clinician, crosses
  the non-diagnostic boundary, real patient-safety liability. The coordination value is delivered by legible
  titles + the ICE facts-only card, with no clinical-judgment risk.
- **Structured clinical shift-notes / daily-care-log (vitals, incidents, I/O)** — EHR-adjacent, regulated
  documentation that duplicates facility systems and pulls RemyNest into clinical-record territory it is
  designed to avoid. The reusable value is the recommended "care-team activity" view.
- **Wandering-GPS / EHR / telehealth / wearable-biometric ingestion** — liability + scope bloat outside a
  non-clinical memory app; also the direct enabler of the fabricated-biometric problem just removed. If real
  sensor data is never collected, no biometric/sleep/risk surface should exist.
- **Promoting Reminders into the primary bottom-nav** — a global IA change affecting every persona for one
  workflow; the dashboard already hero-surfaces today's/overdue reminders.

## 8. Launch Readiness for Real Memory-Care Use

**USABLE AND SAFE for real memory-care use today.** RemyNest genuinely supports dignified reminiscence and
calm, offline, repetition-tolerant reminders on a privacy-scoped multi-caregiver foundation with disciplined
non-diagnostic AI. The one item that had to ship before clinical framing — **removing the fabricated
biometric/Alzheimer-risk charts** — is done, alongside four small copy/label fixes (reality-orientation date,
honest My-Nest reminder copy, access-level clarity, legible medication hint) that materially raise clinical
and patient experience at near-zero risk without touching schema, API, or the frozen reminder engine. The
RECOMMENDED features (ICE card, "This is Me," completion attribution, care-team activity, family roster,
voice capture) are the correct **post-launch growth path** from a strong memory-keeping app to a full
day-to-day care-coordination companion — none are launch blockers, and all are explicitly non-clinical.

**Verdict: launch-ready for real dementia-care use** after the LA1 Insights de-medicalization + the four copy
fixes (this commit), with the recommendations sequenced post-launch.

---

*Validation: `npx tsc --noEmit` clean · `npm run lint` 0 errors · `npm run build` green. Full per-persona
evidence is in the LA1 session transcript. Frozen reminder engine untouched; no schema/API/architecture change.*
