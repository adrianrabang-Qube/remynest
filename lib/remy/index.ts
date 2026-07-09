/**
 * ============================================================================
 *  R E M Y   P L A T F O R M   —   P U B L I C   A P I   (the ONLY import path)
 * ============================================================================
 *
 * Remy is a platform SERVICE (like auth / analytics / router), not a UI component and not a
 * page feature. Feature code imports from HERE and nowhere else:
 *
 *     import { Remy, RemyStage, useRemyContext } from "@/lib/remy";
 *
 *     Remy.emit("memory.saved");                 // publish a semantic event
 *     Remy.enter("offline"); Remy.exit("offline")// hold/release a sticky context
 *     <RemyStage context="memories.empty" />     // in-place, platform-decided presentation
 *     useRemyContext("conversation");            // mount-scoped context (leak-proof)
 *
 * Everything else is INTERNAL implementation and must NOT be imported by features:
 *   lib/remy/core/* (event bus, brain, emotion/policy/animation/voice engines, presentation),
 *   lib/remy/companion/* (asset registry, animation controller), components/remy/* (renderer,
 *   provider, floating layer, stage). No feature knows the provider, renderer, assets, policy,
 *   animation, voice, or emotion exist.
 *
 * See docs/architecture/REMY_PLATFORM_V2.md for the full architecture.
 */
import { emitRemyEvent, enterRemyContext, exitRemyContext } from "@/lib/remy/core/dispatch";
import { remyEventBus, type RemyEventListener } from "@/lib/remy/core/event-bus";
import type { RemyContextKey, RemyEventName } from "@/lib/remy/core/events";

/** The platform facade. Framework-agnostic — usable from React, workers, or plain modules. */
export const Remy = {
  /** Publish a semantic event (the only entry into the platform). */
  emit(name: RemyEventName, payload?: Record<string, unknown>): void {
    emitRemyEvent(name, payload);
  },
  /** Enter a sticky context (pair with `exit`). Prefer `useRemyContext` in React for safety. */
  enter(context: RemyContextKey): void {
    enterRemyContext(context);
  },
  /** Exit a sticky context. */
  exit(context: RemyContextKey): void {
    exitRemyContext(context);
  },
  /** Observe the raw event stream (analytics, future bridges, tests). Returns an unsubscribe. */
  on(listener: RemyEventListener): () => void {
    return remyEventBus.subscribe(listener);
  },
};

// React bindings (the app mounts <RemyProvider> once; features use the stage + hooks).
export {
  RemyProvider,
  useRemyContext,
  useRemyController,
  useRemyEmit,
  useRemyPresentation,
} from "@/components/remy/companion/RemyProvider";
export { RemyStage, type RemyStageProps } from "@/components/remy/platform/RemyStage";
/** The floating presence surface — mount once inside <RemyProvider> (the app shell does this). */
export { default as RemyFloatingPresence } from "@/components/remy/companion/FloatingCompanionLayer";

// Public types (semantic only — never renderer/asset internals).
export type { RemyEvent, RemyEventName, RemyContextKey } from "@/lib/remy/core/events";
export type { RemyEmotion } from "@/lib/remy/core/emotion";
export type { RemyExpression, RemyPresentation } from "@/lib/remy/core/presentation";

// Living-companion BEHAVIOUR vocabulary + the NEST choreography/evolution. Still semantic — a
// behaviour maps to an EXISTING expression internally (never an asset path), so the Nest surface
// speaks in Remy behaviour, not menu state. Part of the ONE platform (no parallel system).
export {
  BEHAVIOR_LOOK,
  REMY_BEHAVIORS,
  resolveBehaviorLook,
} from "@/lib/remy/core/behavior";
export type { RemyBehavior, RemyBehaviorLook } from "@/lib/remy/core/behavior";
export {
  NEST_WAKE_SEQUENCE,
  NEST_RETURN_SEQUENCE,
  NEST_RESTING_BEHAVIOR,
  NEST_GREETING_BEHAVIOR,
  NEST_STAGES,
  resolveNestStage,
  nestStageLabel,
} from "@/lib/remy/core/nest";
export type { NestStep, NestStage, NestStageInfo } from "@/lib/remy/core/nest";
export {
  resolveTimeOfDay,
  isNightTime,
  greetingForTimeOfDay,
} from "@/lib/remy/core/time-of-day";
export type { TimeOfDay } from "@/lib/remy/core/time-of-day";
