/**
 * Remy Platform — PUBLIC API (the ONLY surface feature code should import).
 *
 * Pages/features interact with Remy exclusively through:
 *   - <RemyStage scene="…" />      — place an in-context Remy that reflects a semantic scene
 *   - useRemyScene("…")            — emit a sticky scene without rendering in-place
 *   - useRemySignal()              — emit a transient moment (success / memoryFound / …)
 *   - useRemy() / useRemyController — manual control of the floating presence (advanced)
 *
 * Feature code must NOT import the raw <Remy> renderer or the asset registry directly, and
 * must NOT choose expressions/artwork — name a scene/signal and let the platform decide.
 * (The renderer + registry + provider mount are internal wiring.)
 */
export { RemyStage, type RemyStageProps } from "./RemyStage";

export {
  useRemyScene,
  useRemySignal,
  useRemy as useRemyController,
  type RemyPlatformState,
  type RemyPlatformActions,
} from "@/components/remy/companion/RemyProvider";

export type { RemyScene, RemySignal } from "@/lib/remy/platform/scenes";
export type { RemyPresentation } from "@/lib/remy/platform/policy";
