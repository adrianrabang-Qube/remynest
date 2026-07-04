"use client";

import { Remy, type RemyProps } from "@/components/remy/Remy";
import { useRemyScene } from "@/components/remy/companion/RemyProvider";
import { presentationForScene } from "@/lib/remy/platform/policy";
import type { RemyScene } from "@/lib/remy/platform/scenes";

/**
 * Remy Platform — STAGE (an in-place, opt-in platform surface).
 *
 * A page places `<RemyStage scene="empty.memories" />` where an in-context mascot is wanted.
 * The page names a SEMANTIC SCENE — never an expression, never an asset. The stage then:
 *   1. EMITS the scene to the platform (`useRemyScene`) so the platform is aware of context
 *      (for the floating presence, future voice/analytics, coordination), and
 *   2. RENDERS via the single `<Remy>` renderer using the expression chosen by the presentation
 *      POLICY for that scene — so what a scene "looks like" lives in exactly one place.
 *
 * This keeps in-context placement (good UX) WITHOUT coupling the page to artwork or
 * expression choices: change `policy.ts` and every stage updates; swap the renderer tech in
 * `<Remy>` and every stage updates. Accepts all `<Remy>` props except `state` (the platform
 * owns that). Decorative by default — the surrounding UI copy conveys meaning.
 */
export interface RemyStageProps extends Omit<RemyProps, "state"> {
  scene: RemyScene;
}

export function RemyStage({ scene, decorative = true, ...rest }: RemyStageProps) {
  useRemyScene(scene);
  const { expression } = presentationForScene(scene);
  return <Remy state={expression} decorative={decorative} {...rest} />;
}

export default RemyStage;
