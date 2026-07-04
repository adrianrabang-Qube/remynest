# Remy Platform — v2 (Platform Service Architecture)

**Status:** authoritative · **Last updated:** 2026-07-04 · Supersedes `REMY_PLATFORM_ARCHITECTURE.md` (v1)

Remy is a **platform service** — a first-class capability on par with Authentication, Analytics,
Theme, Notifications, and the Router. It is **not** a UI component, **not** a page feature, and
**not** something features import directly. The UI is merely one possible consumer.

The platform is designed to survive complete redesigns, framework migrations (React → SwiftUI),
new surfaces (Watch, Widgets, Vision Pro, Desktop), and AI/voice/rendering upgrades **without
changing feature code**. Features only ever publish semantic events; the platform decides
everything else.

> **Terminology note.** Three unrelated things share the "Remy" name. This document is ONLY
> about the **companion platform** (the character presence). It is distinct from (a) the **Remy
> AI intelligence layer** (`lib/remy/*.ts`: ask/briefing/coach/lenses…) and (b) the **frozen
> avatar sprite** (`components/remy/avatar/*`). Those are separate systems and are untouched.

---

## 1. Layer diagram

```
                 F E A T U R E S   (pages, components, AI layer, future native hosts)
                                        │
                                        │  import { Remy, RemyStage, useRemyContext } from "@/lib/remy"
                                        ▼
 ┌──────────────────────────── PUBLIC API  (lib/remy/index.ts) ────────────────────────────┐
 │  Remy.emit(event) · Remy.enter/exit(context) · <RemyStage> · useRemyContext/…            │
 └───────────────────────────────────────────┬──────────────────────────────────────────────┘
                                              ▼
                                   EVENT BUS   (core/event-bus.ts)
                                              ▼
                                   BRAIN       (core/brain.ts)          interprets events → semantic state
                                              ▼
                                   EMOTION ENGINE  (core/emotion-engine.ts)   state → feeling
                                              ▼
                                   POLICY ENGINE   (core/policy-engine.ts)    feeling → presentation
                                              ▼
                    ┌─────────────────────────┴─────────────────────────┐
                    ▼                                                     ▼
        ANIMATION ENGINE (core/animation-engine.ts)         VOICE ENGINE (core/voice-engine.ts, future)
                    │                                                     │
                    └─────────────────────────┬─────────────────────────┘
                                              ▼
                                   RENDERER    (components/remy/Remy.tsx)  ← receives presentation ONLY
                                              ▼
                                   ASSET REGISTRY (lib/remy/companion/asset-registry.ts)
```

**Strict one-way flow.** Each layer knows only the layer below it. Nothing skips a layer, and
**nothing** communicates with the renderer, provider, policy, assets, animation, or voice
directly — everything enters through the Public API → Event Bus. The `lib/remy/core/*` pipeline
is pure TypeScript (no React, no DOM), so it is portable across hosts.

---

## 2. Event flow

```
feature: Remy.emit("memory.saved")                 (or <RemyStage context="memories.empty">)
   → Event Bus.emit({ name: "memory.saved" })
   → Brain.dispatch(event):
        • context transitions?  (search.started→enter "searching", online→exit "offline", …)
        • declarative context.enter/exit?  (from <RemyStage>/useRemyContext)
        • moment feeling?  (emotionForMoment → transient emotion + token)
   → Brain emits new RemyBrainState
   → (React adapter) resolvePresentation(state)      [Policy Engine]
   → presentation { expression, visible, animationCue, voiceCue?, priority, durationMs? }
   → Animation Engine.play(cue) · Voice Engine.speak(voiceCue) · Renderer draws expression
```

Two shapes of input, both events:
- **Moment / lifecycle events** (imperative): `Remy.emit("search.started")`. Some carry a feeling,
  some are context transitions, some are both (`sync.completed` exits "syncing" **and** feels happy).
- **Declarative contexts** (mount-scoped, leak-proof): `<RemyStage context="…">` /
  `useRemyContext("…")` emit `context.enter` on mount and `context.exit` on unmount through the
  bus. A page can never forget to "turn Remy off".

---

## 3. State flow

All Remy state lives in the **Brain** (`RemyBrainState`) and nowhere else:
- `contexts: RemyContextKey[]` — active sticky contexts.
- `transientEmotion / transientToken` — a brief moment feeling (host clears it after the policy
  duration; token-guarded so a repeated/replaced moment can't be cleared by a stale timer).
- `emotion` — the resolved current feeling (transient wins, else the highest-`CONTEXT_PRIORITY`
  active context, else `neutral`).

The **React adapter** (`RemyProvider`) mirrors `RemyBrainState` into React state, runs
`resolvePresentation` (Policy Engine) to get the on-screen presentation, and drives the engines.
It exposes two contexts — a changing state context and a stable actions context — and renders
`children` as a stable prop, so Remy activity re-renders **only** the provider + the floating
presence, never the app tree and never a `<RemyStage>`.

---

## 4. Brain responsibilities (`lib/remy/core/brain.ts`)

The Brain **interprets events into semantic state**. It never renders, never loads assets, never
touches the UI or a timer. Today it tracks the active context stack + a transient moment feeling
and consults the Emotion Engine. It is a plain class (no React), so the same Brain can back the
React adapter today and a native host tomorrow.

**Designed for expansion** — future semantic state lives here, additively, with no consumer
change: memory context, conversation state, AI state, relationship state, personality, trust,
long-term context. A richer Emotion/Policy model reads these fields; features never do.

## 5. Emotion Engine (`lib/remy/core/emotion-engine.ts`)

Pure mapping "given this context/moment, how does Remy feel?" → a `RemyEmotion`
(`neutral · welcoming · happy · attentive · thinking · concerned · celebrating · confused ·
calm · encouraging`). No state, no timers. Feelings are **additive**. This is where an affective
model (decay, mood inertia, personality) plugs in later.

## 6. Policy Engine (`lib/remy/core/policy-engine.ts`)

The single place that converts feeling (+ source) into a `RemyPresentation` — expression,
visibility, animation/voice cues, priority, timing. Separates `emotion → look`
(`LOOK_BY_EMOTION`) from `source → framing` (a moment floats briefly; an in-place context
usually does not). Swapping this file (seasonal theme, A/B, accessibility variant) re-skins the
whole app with zero other changes. Pages **never** make presentation decisions.

## 7. Animation Engine (`lib/remy/core/animation-engine.ts`)

Consumes abstract `RemyAnimationCue`s from the presentation and delegates to a swappable backend
behind the existing `AnimationController` seam (`lib/remy/companion/animation-controller.ts`).
Backends — **CSS · Framer Motion · Lottie · Rive · sprite sheets · native** — implement the
controller and are selected in `createRemyAnimationController()`; no consumer changes. Today the
backend is the dependency-free placeholder (plumbing only, no motion yet).

## 8. Voice Engine (`lib/remy/core/voice-engine.ts`) — ARCHITECTURE ONLY

Interface + no-op, **disabled** placeholder. Consumes abstract `RemyVoiceCue`s (a scripted line
id or literal text). Future backends — **OpenAI Voice · ElevenLabs · Apple Speech · Azure ·
Google** — implement `RemyVoiceEngine` and are selected in `createRemyVoiceEngine()`. Nothing
speaks until a backend exists **and** voice is explicitly enabled (privacy/cost/accessibility).
Lip-sync (future) couples the voice viseme stream to the Animation Engine — both platform-owned.

## 9. Event Bus (`lib/remy/core/event-bus.ts`)

The single entry point: a tiny framework-agnostic pub/sub (`emit` / `subscribe`), exported as a
process-wide singleton (`remyEventBus`). Listener errors are isolated (never block the emitter or
other listeners). If no Brain is subscribed (SSR / no provider), events are simply dropped — Remy
is a best-effort ambient presence, never a correctness dependency.

## 10. Public API (`lib/remy/index.ts`) — the ONLY supported import

```ts
import { Remy, RemyStage, useRemyContext, useRemyController } from "@/lib/remy";

Remy.emit("memory.saved");            // publish a semantic event (works anywhere, even non-React)
Remy.enter("offline");                // hold a sticky context …
Remy.exit("offline");                 // … release it
Remy.on((e) => track(e));             // observe the raw stream (analytics/bridges/tests)

<RemyStage context="memories.empty" size={128} />   // in-place, platform-decided presentation
useRemyContext("conversation");                       // mount-scoped context (leak-proof)
```
Also exports: `RemyProvider`, `RemyFloatingPresence` (mounted once by the app shell),
`useRemyPresentation`, `useRemyEmit`, and semantic types (`RemyEventName`, `RemyContextKey`,
`RemyEmotion`, `RemyExpression`, `RemyPresentation`). **Nothing else is public.**

## 11. Renderer (`components/remy/Remy.tsx`)

Exactly **one** renderer. It receives a presentation `expression` (never a business event),
maps it to an asset KEY, and draws it (`next/image`, aspect-safe, animation-ready DOM). It is a
pure leaf: it imports the expression vocabulary from the core and the asset registry — nothing
else. Swapping rendering tech (APNG/GIF/Lottie/Rive/Live2D/3D) touches only this file (+ the
Animation Engine).

## 12. Asset ownership (`lib/remy/companion/asset-registry.ts`)

Exactly **one** asset registry — the sole owner of `/assets/remy` paths. The renderer is its only
reader; components reference assets by KEY. `remy_master_v1.png` is the read-only brand reference
(not registered). See CLAUDE.md ("Remy asset pipeline — SINGLE FLAT FOLDER").

---

## 13. Future AI integration

The AI layer becomes just another **event publisher**: it calls `Remy.emit("search.started")`,
`Remy.emit("memory.saved")`, `Remy.emit("conversation.started")`, etc. — the same vocabulary the
UI uses. Deeper affect (the AI's read of memory/relationship/trust) becomes additive Brain state
consumed by a richer Emotion Engine. The `RemyAIHooks` contract (`lib/remy/companion/ai-hooks.ts`)
maps 1:1 to events (`onThinking → emit("search.started")`, `onCelebration → emit("success")`). No
new render path, and AI logic never touches presentation.

## 14. Future multi-platform support

Scenes/events are **layout- and framework-independent**, so they carry across redesigns and form
factors verbatim. Only the render *surfaces* adapt. A future `position` field on
`RemyPresentation` lets the Policy Engine place Remy per breakpoint/form factor centrally.

## 15. Future native support (React → SwiftUI / Capacitor / RN)

The entire `lib/remy/core/*` pipeline is pure TypeScript with no React/DOM. To go native, write a
new **adapter** (the equivalent of `RemyProvider`) and a new **renderer** over the SAME core:
same Event Bus, Brain, Emotion/Policy engines, same event vocabulary. Features that call
`Remy.emit(...)` do not change. A native bridge can forward events into the same bus.

## 16. Future wearable support (Apple Watch, Widgets)

Wearables are **event consumers with a minimal renderer**: subscribe to the bus (or a forwarded
feed), run the same Brain/policy, render a tiny expression or a glanceable state. Priority/timing
already exist to pick the single most important thing to show in a constrained surface.

## 17. Future desktop support (Vision Pro, Desktop app)

Same story: a desktop/spatial **adapter + renderer** over the shared core. Richer surfaces can
opt into more of the presentation (animation cues, voice cues, position) without any feature or
core change — that is exactly what the additive `RemyPresentation` fields are for.

---

## 18. Extension guidelines

**Add a new moment (the 90% case).**
1. Add the event name to `RemyEventName` (`core/events.ts`); if it's a context, add the key +
   `CONTEXT_PRIORITY`.
2. Map its feeling in `core/emotion-engine.ts` (moment and/or context); if it enters/exits a
   context, add it to `CONTEXT_TRANSITIONS` in `core/brain.ts`.
3. If a new feeling is involved, add it to `RemyEmotion` (`core/emotion.ts`) + `LOOK_BY_EMOTION`
   (`core/policy-engine.ts`).
4. Emit it: `Remy.emit("…")` or `<RemyStage context="…">`. Done — no renderer/provider/page edits.

**Change how something looks/feels:** edit `emotion-engine.ts` (feeling) or `policy-engine.ts`
(look). Every screen updates at once.

**Add animation / voice:** implement the engine's backend behind its `create…` seam; optionally
add an additive `RemyPresentation` field. Consumers are unaffected.

**Swap rendering tech / go native / add a surface:** write a new adapter + renderer over the same
core. The vocabulary, engines, and every feature stay identical.

## 19. Rules for contributors

- ✅ Features import **only** `@/lib/remy`. Emit events; name contexts. Never presentation.
- ❌ Never import `lib/remy/core/*`, `lib/remy/companion/*`, or `components/remy/{Remy,companion,platform}/*`
  from a feature. Never reference an `/assets/remy` path outside the renderer + registry.
- ❌ Never create a second renderer, provider, asset registry, public API, or policy.
- ❌ No business logic in the renderer/engines; no rendering in features. The bus is the only bridge.
- ✅ **Allowed exception:** error boundaries (`app/error.tsx`, `app/(app)/error.tsx`) render the raw
  `<Remy state="confused">` because the platform may be the thing that crashed / is unmounted at
  the root. Keep this exception list tiny and documented.
- ✅ Keep `lib/remy/core/*` free of React/DOM so it stays portable to native hosts.

---

## 20. File map (subsystem → file)

| Subsystem | File |
| --- | --- |
| Public API (only import) | `lib/remy/index.ts` |
| Event Bus | `lib/remy/core/event-bus.ts` |
| Event vocabulary + context priority | `lib/remy/core/events.ts` |
| Dispatch helpers | `lib/remy/core/dispatch.ts` |
| Brain | `lib/remy/core/brain.ts` |
| Emotion vocabulary | `lib/remy/core/emotion.ts` |
| Emotion Engine | `lib/remy/core/emotion-engine.ts` |
| Policy Engine | `lib/remy/core/policy-engine.ts` |
| Presentation types (expression/cues) | `lib/remy/core/presentation.ts` |
| Animation Engine | `lib/remy/core/animation-engine.ts` (+ backend seam `lib/remy/companion/animation-controller.ts`) |
| Voice Engine (architecture only) | `lib/remy/core/voice-engine.ts` |
| React adapter (runtime host) | `components/remy/companion/RemyProvider.tsx` |
| Floating presence surface | `components/remy/companion/FloatingCompanionLayer.tsx` |
| In-place stage surface | `components/remy/platform/RemyStage.tsx` |
| Renderer (only one) | `components/remy/Remy.tsx` |
| Asset registry (only one) | `lib/remy/companion/asset-registry.ts` |
| AI hook contract (future) | `lib/remy/companion/ai-hooks.ts` |
| Provider mount (app shell) | `app/(app)/layout.tsx` (imports only `@/lib/remy`) |
| Resilience exception (raw renderer) | `app/error.tsx`, `app/(app)/error.tsx` |
