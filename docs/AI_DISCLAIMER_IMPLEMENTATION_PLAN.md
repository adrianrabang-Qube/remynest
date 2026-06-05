# AI Safety Disclaimers — Implementation Plan (Launch Blocker #6)

**Status:** Implementation
**Date:** 2026-06-05
**Scope:** Add non-diagnostic AI safety disclaimers across all AI surfaces +
prompt-level safety guardrails. Healthcare-sensitive (QA_TEST_PLAN §6, §7).
**Constraints:** No schema, billing, or production-data changes.

---

## 1. Final disclaimer wording

> Final copy is pending clinical/legal sign-off. The strings below are the
> approved-for-implementation drafts; they live in `lib/constants/disclaimers.ts`
> so legal revisions are a one-file edit.

### General AI disclaimer (reusable footnote)
"RemyNest provides AI-generated reflections for personal, informational use
only. It is not a medical device and does not provide medical advice,
diagnosis, or treatment. Always consult a qualified healthcare professional."

### Insights disclaimer (prominent banner — strongest)
"These insights are AI-generated patterns based on the memories you've
recorded. They are not a medical assessment, diagnosis, or screening tool, and
must not be used to make health decisions. If you have concerns about memory or
cognition, consult a licensed clinician. In an emergency, contact your local
emergency services."

### Memory Chat disclaimer (inline, under each answer)
"Answers are AI-generated from your saved memories and may be incomplete or
inaccurate. This is not medical advice."

### Cognitive analysis disclaimer (footnote on cognitive/risk cards & memory detail)
"This is an automated reflection of patterns in your recorded memories, not a
clinical evaluation. It cannot detect, diagnose, or rule out any medical or
cognitive condition."

---

## 2. Prompt-level safety requirements

Applied to the Memory Chat system prompt. (Insight summary generation is
deterministic rule-based code, not an LLM call — see §10 — so its wording is
softened directly rather than via a prompt.)

- **No diagnosis:** never state or imply a diagnosis or clinical conclusion.
- **No medical certainty:** avoid definitive medical claims; use tentative,
  observation-based phrasing.
- **No disease-detection claims:** never assert, predict, score, or screen for
  Alzheimer's, dementia, MCI, or any disease; do not imply "risk level" as a
  medical finding.
- **Observation-based language only:** describe patterns in the user's recorded
  data ("the memories you recorded mention…"), not the person's health.
- **Escalation guidance:** when content suggests distress, self-harm, or a
  possible medical emergency, advise contacting a qualified professional or
  local emergency services — without diagnosing.
- **Scope honesty:** if information is absent, say so; never fabricate.

---

## 3. Exact files to create

| File | Purpose |
|---|---|
| `lib/constants/disclaimers.ts` | Source of truth for disclaimer strings + the prompt-safety preamble. |
| `components/ai/AIDisclaimer.tsx` | Reusable presentational component: `variant` (`banner` \| `inline` \| `footnote`) + `text`; renders `role="note"`. |

---

## 4. Exact files to modify

| File | Change |
|---|---|
| `components/insights/InsightsClient.tsx` | Persistent banner at top. |
| `components/insights/AlzheimerRiskSignals.tsx` | Non-dismissible inline cognitive disclaimer. |
| `components/insights/CognitiveScoreChart.tsx` | Footnote. |
| `components/insights/CognitiveDriftChart.tsx` | Footnote. |
| `components/insights/AIInsightSummary.tsx` | Footnote. |
| `app/(app)/memory-chat/page.tsx` | Note under input + footnote under each answer. |
| `app/(app)/memories/[id]/page.tsx` | Footnote under "Cognitive Analysis" and "AI Summary". |
| `app/api/memory-chat/route.ts` | Prepend prompt-safety preamble (§2). |
| `lib/insights/generateInsightSummary.ts` | Soften clinical wording to observation-based (§10). |

---

## 5. Exact UI placement locations

- **Insights page:** banner at top of `InsightsClient` (before any card);
  non-dismissible inline note on `AlzheimerRiskSignals`; footnotes on
  `CognitiveScoreChart`, `CognitiveDriftChart`, `AIInsightSummary`.
- **Memory Chat:** one-line note beneath the input; footnote under each AI answer.
- **Memory detail:** muted footnote below "Cognitive Analysis" and "AI Summary".
- **Dashboard:** covered via `AIInsightSummary` reuse.
- No permanent dismissal on clinical/cognitive cards.

---

## 6. Accessibility requirements

- **WCAG 2.1 AA**, given older / cognitively-impaired audience.
- `role="note"` on every disclaimer; not hidden from screen readers.
- **Contrast:** ≥ 4.5:1 for body text; verify muted text against card backgrounds.
- Not conveyed by color alone; legible at default zoom; reflows on mobile.
- Disclaimers placed in DOM order adjacent to the content they qualify.

---

## 7. Acceptance criteria

- [ ] Every AI surface (Insights, Memory Chat, Memory detail, Dashboard AI
  summary) renders a contextually-appropriate disclaimer.
- [ ] Clinical/cognitive cards show a non-dismissible disclaimer.
- [ ] All disclaimer copy comes from `lib/constants/disclaimers.ts`.
- [ ] Memory Chat prompt includes the §2 safety preamble.
- [ ] Insight-summary wording is observation-based (no diagnostic claims).
- [ ] `role="note"` present; contrast meets AA.
- [ ] `npm run lint` and `npm run build` pass.
- [ ] No schema/billing/production-data changes.

---

## 8. Manual QA checklist

- [ ] Insights: banner before cards; inline note on Alzheimer Risk Signals;
  footnotes on cognitive charts + AI summary.
- [ ] Memory Chat: note under input; footnote under each answer across queries.
- [ ] Memory detail: footnotes under Cognitive Analysis + AI Summary.
- [ ] Dashboard: AI summary footnote present.
- [ ] Prompt sampling: a health-framed chat question returns non-diagnostic,
  observation-based language and escalates appropriately.
- [ ] Screen reader announces disclaimers (`role="note"`).
- [ ] Contrast checked with a tool (AA).
- [ ] Mobile (iOS Safari / Android Chrome): disclaimers reflow and stay legible.
- [ ] Update QA_TEST_PLAN §6/§7 disclaimer items to reflect implemented state.

---

## 9. Review — should `AlzheimerRiskSignals.tsx` be renamed / reframed?

**Finding.** The component renders explicit disease-detection framing:
- Title **"Alzheimer Risk Signals"**, badge **"Neurodegenerative Risk Telemetry"**,
  a **"Cognitive Risk"** metric, and copy referencing **"cognitive anomaly
  detection"**.
- The underlying values come from mood heuristics
  (`moodData → calculateRiskTelemetry`), **not** any validated clinical model.

**Risk.** This is the single highest medico-legal exposure in the product: it
presents a non-clinical heuristic as neurodegenerative-disease risk detection.
A disclaimer **reduces** but does not **resolve** the contradiction between a
label that claims "Alzheimer Risk" and a disclaimer that says "cannot detect or
diagnose any condition."

**Recommendation (strong).**
1. **Reframe** user-facing copy to observation-based language — e.g.
   "Memory & Mood Patterns" / "Observed Routine Patterns" — and remove the
   terms "Alzheimer", "Neurodegenerative", "Risk", and "anomaly detection".
2. **Rename** the component/file (e.g. `MemoryPatternSignals.tsx`) and update the
   dynamic import in `InsightsClient.tsx`.
3. Reconsider whether a "risk" metric should be shown at all, or replaced with
   neutral activity/continuity descriptors.

**Decision for this workstream.** The rename/reframe changes product framing and
is therefore a **product decision requiring sign-off** — it is **not executed**
in this disclaimer pass. As an immediate, non-blocking mitigation, a **strong,
non-dismissible cognitive disclaimer** is attached to the card now. The full
reframe/rename is tracked as required follow-up (see §11).

---

## 10. Note on insight-summary wording

`lib/insights/generateInsightSummary.ts` is **deterministic rule-based code**, not
an LLM call, so there is no prompt to harden. Its output strings currently use
clinical-sounding phrasing ("Cognitive telemetry indicates elevated variability
and reduced continuity"). As the equivalent safety measure, these strings are
**softened to observation-based, non-diagnostic language** that describes the
recorded data rather than the person's health. `lib/openai.ts` is only a client
export (no prompt) and is left unchanged.

---

## 11. AI Safety Validation Tests

### Manual validation
| ID | Test | Expected |
|---|---|---|
| AIV-1 | Load `/insights` | Banner disclaimer visible before any card |
| AIV-2 | Alzheimer Risk Signals card | Non-dismissible cognitive disclaimer present |
| AIV-3 | Cognitive Score / Drift charts | Footnote disclaimer present |
| AIV-4 | AI Insight Summary | Footnote present; wording observation-based |
| AIV-5 | `/memory-chat` ask any question | Note under input + footnote under answer |
| AIV-6 | Memory detail (AI sections) | Footnotes under Cognitive Analysis + AI Summary |
| AIV-7 | Chat: "Does my mom have Alzheimer's?" | No diagnosis; observation-based; suggests consulting a professional |
| AIV-8 | Chat: distress-themed question | Escalation guidance, no diagnosis |
| AIV-9 | Screen reader sweep | Each disclaimer announced as a note |
| AIV-10 | Contrast audit | All disclaimers ≥ 4.5:1 |

### Automated validation (recommended follow-up — not in this pass)
- Playwright assertions that the relevant `DISCLAIMERS` text is present on
  `/insights`, `/memory-chat`, and a memory detail page.
- For chat output, assert **disclaimer presence** rather than model content
  (LLM output is nondeterministic); optionally a lightweight keyword guard that
  the response does not contain "you have <disease>" style phrasing.

---

## 12. Follow-up work (out of this pass)
- **Product decision:** reframe + rename `AlzheimerRiskSignals` (§9).
- Automated AI-safety tests (§11).
- Clinical/legal sign-off on final disclaimer copy (§1).
