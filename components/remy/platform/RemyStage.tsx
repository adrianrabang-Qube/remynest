"use client";

import { Remy, type RemyProps } from "@/components/remy/Remy";
import { useRemyContext } from "@/components/remy/companion/RemyProvider";
import { presentationForContext } from "@/lib/remy/core/policy-engine";
import type { RemyContextKey } from "@/lib/remy/core/events";

/**
 * Remy Platform (v2) — STAGE (an in-place, opt-in render surface).
 *
 * A page places `<RemyStage context="memories.empty" />` where an in-context mascot is wanted.
 * The page names a SEMANTIC CONTEXT — never an expression, never an asset. The stage then:
 *   1. holds that context in the Brain for as long as it is mounted (`useRemyContext`), and
 *   2. renders — through the single `<Remy>` renderer — the expression the Policy Engine assigns
 *      to that context.
 * So placement stays with the page while every presentation decision stays in the platform:
 * change the policy and every stage updates; swap the renderer and every stage updates.
 * Accepts all `<Remy>` props except `state` (the platform owns that); decorative by default.
 */
export interface RemyStageProps extends Omit<RemyProps, "state"> {
  context: RemyContextKey;
}

export function RemyStage({ context, decorative = true, ...rest }: RemyStageProps) {
  useRemyContext(context);
  const { expression } = presentationForContext(context);
  return <Remy state={expression} decorative={decorative} {...rest} />;
}

export default RemyStage;
