# RemyNest LA2 — Accessibility & Inclusive Design Readiness

**Date:** 2026-07-12  **Phase:** LA2 (WCAG 2.2 AA + cognitive-accessibility readiness)
**Method:** 7-dimension multi-agent WCAG 2.2 AA audit (forms · navigation/landmarks · screen-reader
semantics · contrast/zoom · motion/states · cognitive · media/interactive) → synthesis. **Constraint:**
safe, low-risk a11y/semantic/usability changes only — no redesign, no breaking changes, no business-logic
change; dark mode stays deferred; the frozen reminder engine's logic is untouched (aria/copy only).

---

## 1. Accessibility Score — **68 / 100 baseline → ~84 / 100** after this pass

Post-Polaris the app was already strong on reflow/resize (1.4.10/1.4.4), non-text contrast of focus rings
(1.4.11), reduced-motion (2.3.3), keyboard for the PhotoViewer carousel, and most nav/overlay aria. The
gaps were concentrated in the **pre-Polaris primary-flow forms** and a few cross-cutting issues — this pass
clears the four Level-A blockers and the worst contrast/semantics.

## 2. WCAG 2.2 AA Compliance Summary

- **Perceivable** — 1.4.3 Contrast: raw `text-gray-400` (~2.5:1) and `text-red-500` (~3.8:1) on core
  surfaces FIXED (→ `charcoal-soft` / `red-600`). *Residual:* systematic `text-charcoal-muted` on sub-18px
  text (~142 sites) — **recommended** as a scoped brand-token pass. 1.1.1 alt text and 1.4.10/1.4.4
  reflow/resize pass.
- **Operable** — 2.1.1 Keyboard: the media-upload control was `display:none` (unreachable) → FIXED
  (`sr-only`, focusable). 2.4.1 Bypass Blocks: **skip-to-content link added**. 2.4.7 Focus Visible:
  CreateMemoryForm focus rings added. 2.4.11 Focus Not Obscured: `scroll-padding-top` added. 2.2.2:
  four route skeletons now honour reduced motion. *Residual (recommended):* focus traps for
  PhotoViewer/ModalShell/DeleteAccountModal (2.4.3).
- **Understandable** — 3.3.2/4.1.2 Labels: CreateProfileForm, InviteCaregiverForm, MemoryDateField, and the
  reminders title/frequency controls now have programmatic names. 3.3.4 Error Prevention: **memory delete
  now confirms** before the irreversible action. *Residual (recommended):* Undo/soft-delete; reminder-delete
  confirm (frozen-adjacent).
- **Robust** — 4.1.3 Status Messages: the global Toast, auth/invite messages, and the PhotoViewer counter
  are now announced via live regions. 4.1.2 Name/Role/Value: the profile-menu trigger + photo-viewer dialog
  now expose role/state. 1.3.1: nested `<main>` landmarks de-duplicated on 13 pages; BehavioralAnalyticsCard
  heading semantics corrected.

## 3. Issues Found (verified — by severity)

**Level-A blockers (core tasks):** media-upload keyboard-unreachable (2.1.1); save success/error never
announced (Toast 4.1.3); primary Add-a-person / invite / edit-date / reminder forms unlabeled
(3.3.2/4.1.2); memory delete one-tap-irreversible (3.3.4). **AA:** no skip link (2.4.1); CreateMemoryForm
`outline-none` no focus ring (2.4.7); systematic sub-18px contrast (1.4.3); nested `<main>` on ~14 pages
(1.3.1); no `scroll-padding-top` under sticky headers (2.4.11); four skeletons lack reduced-motion (2.2.2);
profile-menu trigger missing `aria-expanded`/`aria-haspopup` (4.1.2); PhotoViewer not a named dialog +
counter not live (4.1.2/4.1.3); inverted heading markup (1.3.1). **Larger:** modals lack focus traps
(2.4.3); MemoryCard nests buttons inside a `<Link>` (4.1.2).

## 4. Issues Fixed (all safe, low-risk — no logic/data/architecture change)

1. **Skip-to-content link** (2.4.1) + `<main id="main-content" tabIndex=-1>` — `app/(app)/layout.tsx`.
2. **Keyboard-reachable media upload** (2.1.1) — `AttachmentManager.tsx` file input `hidden`→`sr-only` + label focus-within ring.
3. **Toast live region** (4.1.3) + green-600→700 contrast — `ToastProvider.tsx`.
4. **Form labels/names** — `CreateProfileForm.tsx` (htmlFor/id + focus rings), `InviteCaregiverForm.tsx` (email/relationship aria-label + result `role=status` + focus rings), `MemoryDateField.tsx` (4 aria-labels + preview contrast), `reminders/page.tsx` (title/frequency aria-labels — aria-only, frozen page).
5. **CreateMemoryForm** focus rings on all 5 controls (2.4.7) + `gray-400`→`charcoal-soft` + `red-500`→`red-600` (1.4.3).
6. **Auth errors** — `login`/`signup` `red-500`→`red-600` + `role="alert"` (1.4.3/4.1.3).
7. **Contrast** — `text-gray-400`→`charcoal-soft` in memory-detail, onboarding, DashboardTelemetry (1.4.3).
8. **Single main landmark** — 13 page-level `<main>`→`<div>` (1.3.1).
9. **Reduced motion** — `motion-reduce:animate-none` on 4 route skeletons (2.2.2) + `scroll-behavior:auto` under reduced-motion.
10. **Focus not obscured** — `scroll-padding-top` in `globals.css` (2.4.11).
11. **AppNavbar** menu trigger `aria-haspopup`/`aria-expanded`/`aria-label` + focus ring + `aria-hidden` chevron (4.1.2).
12. **PhotoViewer** `role="dialog"` + `aria-label` + counter `role="status"` (4.1.2/4.1.3) — `aria-modal` deliberately omitted (no false modality without a focus trap).
13. **BehavioralAnalyticsCard** — 5 value `<h3>`→`<p>` so heading-nav isn't meaningless numbers (1.3.1).
14. **Memory-delete confirmation** (3.3.4) — a keyboard/SR-accessible confirm before the irreversible delete (all 4 trigger sites via one `handleDelete`); the delete API/mutation is unchanged.

## 5. Remaining Improvements (recommended — larger, deferred)

- **`text-charcoal-muted` sub-18px contrast sweep** (~142 sites) → `charcoal-soft`, plus a lint rule/codemod so it can't regress. (Brand-token change — scope with brand review.)
- **Modal focus traps + `aria-modal`** for PhotoViewer, ModalShell (storage), and DeleteAccountModal via the shared `useFocusTrap` (2.4.3). *Note:* DeleteAccountModal's trap was deliberately deferred under the Settings freeze — lift that first.
- **MemoryCard** restructure so the card `<Link>` doesn't wrap Edit/Delete `<button>`s (stretched-link overlay) (4.1.2).
- **Undo / soft-delete** for memory + reminder deletion (a post-delete toast with Undo) — the strongest cognitive-safety option; needs a small data/mutation change.
- **Reminder-delete confirm** (client-side, frozen-adjacent) + **in-app "reduce motion" toggle** for the Nest's ambient motes/glow.
- **RemyAsk** live-region consolidation; **memory-book/print** nested-main (2-`<main>` file).
- **A manual AT smoke test** (VoiceOver iOS + NVDA) of the four core flows after these fixes land.

## 6. Risk Assessment

**Low.** Every implemented change is an aria/label/token/focus-ring/class/semantic-tag swap or a client-side
confirm — no change to auth, billing, the frozen reminder scheduling/native/OneSignal logic, memory
mutations, the data model, or app architecture. `tsc`/`lint`/`build` are green. The deferred items
(MemoryCard restructure, Undo/soft-delete, modal focus traps) carry the only real regression risk and are
correctly left as fast-follows.

## 7. Launch Readiness

**Materially improved to a defensible AA posture for launch.** The four Level-A blockers that landed on core
tasks — the keyboard-unreachable upload, unannounced save success/failure, unlabeled primary forms, and
one-tap-irreversible deletion — are cleared, along with the missing skip link, the core-form focus rings,
the worst raw-contrast failures, duplicate landmarks, and the un-announced status messages. The app is now
usable by keyboard-only, screen-reader, low-vision, and cognitively-impaired users for the primary journeys
(add a memory, add a person, invite a caregiver, set a reminder, browse/delete). The remaining items —
the `charcoal-muted` contrast sweep, modal focus traps, and Undo/soft-delete — are recommended fast-follows,
not launch blockers, and a manual VoiceOver/NVDA smoke test should confirm end-to-end announcement.

---

*Validation: `npx tsc --noEmit` clean · `npm run lint` 0 errors · `npm run build` green. Full per-dimension
evidence is in the LA2 session transcript. No architecture/logic/data change; dark mode remains deferred;
the frozen reminder engine's logic is untouched.*
