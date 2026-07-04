# Remy Platform Architecture

**Status:** authoritative · **Last updated:** 2026-07-04

This is the **single source of truth** for the Remy Platform. Remy is not a feature and does
not belong to any page. Remy is an **application-wide platform capability** — like the theme
provider, toast system, router, or modal manager — designed to survive redesigns, navigation
changes, layout rewrites, new features, new form factors, and rendering-technology upgrades
with minimal maintenance.

> **The one rule:** the UI emits **semantic scenes/signals**; the platform decides
> **everything else** (expression, visibility, position, animation, and — later — voice,
> gesture, emotion). Pages never touch artwork, asset paths, or expressions.

```
      Application
          │
          ▼
   ┌──────────────────────────────────────────────┐
   │            REMY PLATFORM                       │
   │  vocabulary → policy → runtime → renderer      │
   └──────────────────────────────────────────────┘
          │
          ▼
      Current UI  (emits scenes/signals only)
```

NOT `Page → Remy`. Instead `Application → Remy Platform → UI`.

---

## 1. Overall architecture (layers)

The platform is four decoupled layers. Each layer only knows about the one below it, so any
layer can be replaced without touching the others.

| Layer | Responsibility | Files |
| --- | --- | --- |
| **1. Semantic vocabulary** | Enumerate the *moments* the app can express. Pure types + data. | `lib/remy/platform/scenes.ts` |
| **2. Presentation policy** | Decide how each moment *looks/behaves*. Pure functions. | `lib/remy/platform/policy.ts` |
| **3. Platform runtime** | Hold all state; arbitrate scenes/signals; expose the API. | `components/remy/companion/RemyProvider.tsx` |
| **4. Rendering** | Draw the resolved presentation. The *only* renderer + asset source. | `components/remy/Remy.tsx`, `lib/remy/companion/asset-registry.ts` |

Two **render surfaces** consume the runtime:
- **Floating presence** (`components/remy/companion/FloatingCompanionLayer.tsx`) — Remy's
  autonomous, platform-owned home (portaled, safe-area aware).
- **Stage slots** (`components/remy/platform/RemyStage.tsx`) — opt-in, in-context surfaces a
  page places where an inline mascot is wanted.

The **public API** (the only surface feature code imports) is the barrel
`components/remy/platform/index.ts`.

---

## 2. System responsibilities

- **Rendering** — one renderer (`<Remy>`), one asset source (the registry). Nothing else
  renders Remy art.
- **State management** — one runtime (`RemyProvider`), mounted once in `app/(app)/layout.tsx`.
  It owns the scene stack, the active transient signal, and the manual open/close state.
- **Asset selection** — the registry maps a KEY → file; `<Remy>` maps a variant → KEY.
- **Expression selection** — the **policy** maps a semantic scene/signal → expression. Pages
  never choose expressions.
- **Animation control** — behind the `AnimationController` interface
  (`lib/remy/companion/animation-controller.ts`); today a no-op placeholder.
- **Positioning** — owned by the render surfaces (floating presence = fixed/safe-area; stages
  = wherever the page places the slot). Future position *hints* can flow through the policy.
- **Visibility** — the runtime resolves it (`manualOpen || presentation.visible`).
- **Event handling** — scenes via `useRemyScene`, signals via `useRemySignal`, manual control
  via `useRemyController`.
- **Future voice / lip-sync / gestures / emotion** — additive fields on `RemyPresentation`
  plus additional controllers behind interfaces (see §8–§10).

---

## 3. Event flow

Two kinds of input, one resolution path.

```
SCENES (sticky, declarative)                SIGNALS (transient, imperative)
 <RemyStage scene="empty.memories" />         useRemySignal()("success")
 useRemyScene("conversation")                        │
        │  (registered while mounted)                │ (fire-and-forget)
        ▼                                            ▼
 ┌────────────────────────── RemyProvider ──────────────────────────┐
 │  sceneStack: Map<id, RemyScene>          activeSignal: RemySignal? │
 │  arbitrate: highest SCENE_PRIORITY       auto-expires (durationMs) │
 │                     │                              │               │
 │                     └──────────── a live signal wins ─────────────┘│
 │                                     │                              │
 │                          policy(sceneOrSignal)                     │
 │                                     ▼                              │
 │                     presentation { expression, visible, … }        │
 └───────────────────────────────────┬───────────────────────────────┘
                                      ▼
        Floating presence (if visible)   +   each <RemyStage> (its own scene)
                                      ▼
                              <Remy state={expression} />
```

- **Scenes** are *contexts that persist while UI is mounted*. Multiple can be active; the
  highest `SCENE_PRIORITY` wins the shared floating presence. Each `<RemyStage>` additionally
  renders **its own** scene's expression in place (deterministic, independent of arbitration).
- **Signals** are *moments*. A live signal overrides the scene expression on the floating
  presence and auto-expires after its policy `durationMs`.

**Why declarative scenes (not just imperative events):** a mounted-scoped scene cannot leak —
it is automatically retracted on unmount. This is what makes the platform survive navigation
and layout changes: a page can't forget to "turn Remy off".

---

## 4. State flow

All Remy state lives in `RemyProvider` and nowhere else (single source of truth):

- `sceneStack: Map<number, RemyScene>` — immutable-updated state (register/unregister create a
  new Map). Held in **state** (not a ref) so the derived presentation is a pure `useMemo` with
  a real dependency — no ref reads during render.
- `activeSignal: RemySignal | null` — with an auto-expiry effect.
- `manualOpen: boolean` — the open/close/toggle override (mirrored into a ref only so
  `toggleRemy` can read the latest value without destabilizing the actions object).
- **Derived** (memoized): `presentation`, `activeScene`, `isVisible`.

**Performance contract (preserved from the foundation):** the provider exposes **two
contexts** — a changing `RemyStateContext` and a stable `RemyActionsContext` — and `children`
is a referentially-stable prop. So a scene registering or a signal firing re-renders **only**
the provider + its state consumers (the floating layer) — never the app tree, and never a
`<RemyStage>` (which lives in `children` and is bailed out by React).

---

## 5. Rendering pipeline

```
scene/signal ─policy─▶ RemyPresentation.expression (a RemyVariant)
                                 │
                 <Remy state={variant} size fit … />        ← the ONLY renderer
                                 │
              VARIANT_TO_KEY[variant]  →  RemyAssetKey       ← components/remy/Remy.tsx
                                 │
              REMY_ASSETS[key].src     →  /assets/remy/*.png ← the Asset Registry (sole path owner)
                                 │
              next/image  fill + object-contain|cover in a fixed box
```

`<Remy>` is server-component-safe (no `"use client"`, no hooks) and **animation-ready by
structure**: a `.remy` root + `.remy__sprite` inner layer + `data-remy-variant` /
`data-remy-kind` hooks (see §8).

---

## 6. Asset pipeline

- **Single source of truth:** `lib/remy/companion/asset-registry.ts` (`BASE = "/assets/remy"`).
  Components reference assets by KEY, never by path.
- Every asset lives directly in `public/assets/remy/` (one flat folder). `remy_master_v1.png`
  is the read-only brand reference and is deliberately **not** registered.
- To add/replace art: drop the PNG into `public/assets/remy/` with the exact filename and set
  the registry entry's `kind: "image"`. No page/policy/renderer change.
- Rule: **only** `Remy.tsx` and `asset-registry.ts` may reference `/assets/remy` paths. See
  CLAUDE.md ("Remy asset pipeline — SINGLE FLAT FOLDER").

---

## 7. Component hierarchy

```
app/(app)/layout.tsx
└─ <RemyProvider>                         ← the platform runtime (mounted once)
   ├─ … the entire app (children — stable) …
   │    ├─ pages emit scenes via <RemyStage scene="…"> or useRemyScene("…")
   │    └─ features emit signals via useRemySignal()
   └─ <FloatingCompanionLayer/>           ← floating presence (portaled to <body>)

Resilience exception (OUTSIDE the platform):
  app/error.tsx, app/(app)/error.tsx      ← render the raw <Remy state="confused"> directly,
                                             because the platform provider may be the thing
                                             that crashed / may not be mounted.
```

---

## 8. Future animation architecture

Already seamed; **no refactor** needed to add motion:

- `<Remy>` renders `.remy` (root — target for float/fade) wrapping `.remy__sprite` (target for
  breathe/blink) wrapping the image. Add CSS `@keyframes` to these classes, gated on
  `prefers-reduced-motion` (already tracked by the runtime → `AnimationController.setReducedMotion`).
- Variant transitions: CSS transition keyed off `[data-remy-variant]`.
- Backend swap (CSS → Framer → **Lottie** → **Rive**): implement `AnimationController`
  (`lib/remy/companion/animation-controller.ts`) and select it in
  `createRemyAnimationController()`. Consumers are unaffected.
- Driving animation from semantics: add `animationCue?: RemyAnimationName` to `RemyPresentation`
  in `policy.ts`; the runtime calls `controller.play(cue)` on presentation change. Additive.

## 9. Future voice architecture

- Add `voiceLineId?: string` (or `speech?: {...}`) to `RemyPresentation`. The policy attaches a
  line to a scene/signal; a new `RemyVoiceController` interface (mirroring `AnimationController`)
  plays it. TTS/streaming/lip-sync backends implement the interface and swap behind a
  `createRemyVoiceController()` seam.
- Lip-sync couples the voice controller's viseme stream to the animation controller — both are
  already platform-owned, so no page changes.
- `lib/remy/companion/ai-hooks.ts` already declares `onSpeaking?(text)` for the AI layer.

## 10. Future AI interaction architecture

- `lib/remy/companion/ai-hooks.ts` (`RemyAIHooks`: onListening/onThinking/onSpeaking/
  onMemoryCreated/onCelebration) is the contract the AI layer implements. Each hook maps to an
  existing **signal** (e.g. `onThinking → signal("thinking")`, `onMemoryCreated → signal("memoryFound")`),
  so the AI layer speaks the SAME semantic vocabulary as the UI — no new render path.
- A conversation surface emits the `conversation` scene (mount → unmount = started → ended);
  the policy makes Remy visible + `talking` for its duration.
- All AI logic stays behind the frozen boundaries; it only *emits semantics* into the platform.

## 11. Future multi-platform considerations

- **Tablet / desktop / new layouts:** scenes are layout-independent, so they carry over
  verbatim. Only the render *surfaces* adapt — the floating presence's position and `<RemyStage>`
  sizing/placement are the sole responsive concerns. Future: a `position` hint on
  `RemyPresentation` lets the policy place Remy per breakpoint/form factor centrally.
- **Rendering tech (APNG/GIF/Lottie/Rive/Live2D/3D):** contained entirely within `<Remy>` +
  the `AnimationController`. The vocabulary, policy, runtime, pages, and asset KEYS are unchanged.
- **Multiple companion characters / seasonal themes / accessibility variants:** swap the
  registry mapping and/or the policy (e.g. a `theme`/`character` dimension). Because pages name
  scenes, every screen re-skins at once with zero page edits.
- **Native (Capacitor):** the platform is pure React + web rendering, so it works in the
  remote-URL WebView unchanged; a future native renderer would still implement `<Remy>`/the
  controller behind the same seams.

---

## 12. Design principles

1. **Pages express intent, never presentation.** A page says *what happened* (`empty.memories`,
   `success`), never *what Remy looks like*.
2. **One source of truth per concern.** Vocabulary (scenes.ts), look (policy.ts), state
   (RemyProvider), renderer (Remy.tsx), assets (registry). Never duplicate any of them.
3. **Everything swappable is behind an interface/seam** (animation controller, voice controller,
   policy, asset registry).
4. **Additive-by-default.** New capabilities are new scenes/signals + new (optional)
   `RemyPresentation` fields — consumers ignore what they don't understand.
5. **Declarative > imperative for context.** Mount-scoped scenes can't leak across navigation.
6. **Resilience surfaces stay independent.** Error boundaries render Remy directly (the
   platform may be down).
7. **Preserve the performance contract.** Stable actions context + stable `children` ⇒ Remy
   activity never re-renders the app tree.

---

## 13. Files responsible for each subsystem

| Subsystem | File(s) |
| --- | --- |
| Semantic vocabulary (scenes, signals, priority) | `lib/remy/platform/scenes.ts` |
| Presentation policy (semantics → look/behavior) | `lib/remy/platform/policy.ts` |
| Platform runtime (state, arbitration, API) | `components/remy/companion/RemyProvider.tsx` |
| Public API barrel (the only import for features) | `components/remy/platform/index.ts` |
| In-context render surface | `components/remy/platform/RemyStage.tsx` |
| Floating presence render surface | `components/remy/companion/FloatingCompanionLayer.tsx` |
| The single renderer | `components/remy/Remy.tsx` |
| Asset registry (sole path owner) | `lib/remy/companion/asset-registry.ts` |
| Lifecycle state machine (legacy/animation) | `lib/remy/companion/state.ts` |
| Animation controller interface + seam | `lib/remy/companion/animation-controller.ts` |
| AI hook contract | `lib/remy/companion/ai-hooks.ts` |
| Provider mount | `app/(app)/layout.tsx` |
| Resilience exception (raw renderer) | `app/error.tsx`, `app/(app)/error.tsx` |

---

## 14. Extension guidelines — how to extend Remy without breaking the architecture

**Add a new moment (the 90% case).**
1. Add the name to `RemyScene` or `RemySignal` in `scenes.ts` (+ a `SCENE_PRIORITY` entry for a
   scene).
2. Add its mapping in `policy.ts` (`SCENE_POLICY` / `SIGNAL_POLICY`).
3. Emit it from the UI: `<RemyStage scene="…"/>` / `useRemyScene("…")` / `useRemySignal()("…")`.
   Done — no renderer, provider, or asset change.

**Change how an existing moment looks:** edit only `policy.ts`. Every screen updates.

**Add new artwork:** drop the PNG in `public/assets/remy/`, register the KEY, add a variant to
`Remy.tsx`'s `VARIANT_TO_KEY`. Reference it only via a scene/signal in the policy.

**Add animation / voice / gesture / emotion:** add an additive field to `RemyPresentation`
(policy.ts) and a controller behind an interface (mirroring `AnimationController`); wire it in
`RemyProvider`. Pages are untouched (§8–§10).

**Swap rendering technology:** change only `<Remy>` (and/or the animation controller). The
vocabulary, policy, runtime, and every page stay identical.

**DON'Ts (these reintroduce the coupling this platform removed):**
- ❌ Import `<Remy>` or the asset registry directly from a feature/page.
- ❌ Pass a hardcoded `state="…"` expression from a page.
- ❌ Reference an `/assets/remy` path anywhere but `Remy.tsx` / the registry.
- ❌ Create a second provider, a second renderer, or a parallel asset map.
- ❌ Put Remy state in a page/feature component.

**Allowed exception:** error boundaries (`app/error.tsx`, `app/(app)/error.tsx`) render the raw
`<Remy>` because they must not depend on the (possibly-crashed) platform. Keep this list small
and documented.
