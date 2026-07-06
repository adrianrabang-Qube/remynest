import Image from "next/image";

import {
  getRemyAsset,
  type RemyAssetKey,
} from "@/lib/remy/companion/asset-registry";
import type { RemyExpression } from "@/lib/remy/core/presentation";
import type { RemyEmotion } from "@/lib/remy/core/emotion";
import styles from "./motion.module.css";

/**
 * <Remy> — the SINGLE, centralized way to render the Remy companion character.
 *
 * Usage:  <Remy state="thinking" />   <Remy state="welcome" size={200} />
 *
 * Design contract:
 *  - The image path lives ONLY in the Asset Registry (`lib/remy/companion/asset-registry.ts`,
 *    the sole owner of asset paths). This component maps a friendly `state` → registry KEY →
 *    src; no consumer ever references a PNG path directly, and there is no duplicated image
 *    logic anywhere in the app.
 *  - Server-compatible (no "use client"): purely presentational, no hooks/state — so it drops
 *    into server AND client screens, empty states, error boundaries, and the floating layer.
 *  - Aspect-safe: renders inside a fixed square box with `object-contain`/`object-cover`, so
 *    non-square source art is never distorted.
 *
 * ANIMATION-READY (structure only — no animation implemented yet, per the current phase):
 *  The DOM is a two-layer split — a positioned root (`.remy`) and an inner sprite layer
 *  (`.remy__sprite`) — plus `data-remy-variant` / `data-remy-kind` hooks. Future work plugs in
 *  WITHOUT touching this API or any consumer:
 *    · idle float          → animate `.remy` (translateY keyframes)
 *    · breathing / blinking → animate `.remy__sprite`
 *    · variant transitions  → CSS transition keyed off `[data-remy-variant]`
 *    · fade in/out          → opacity transition on `.remy`
 *    · Rive / Lottie swap   → replace the <Image> inside `.remy__sprite` with the canvas
 *  (These belong behind the existing `AnimationController` seam in
 *  `lib/remy/companion/animation-controller.ts`; this component stays render-only.)
 */

/**
 * The expression set is defined ONCE in the platform core (`RemyExpression`) — the single
 * vocabulary shared by the policy engine, presentation types, and this renderer. Aliased here
 * as `RemyVariant` for the renderer's prop, and mapped to asset keys below.
 */
export type RemyVariant = RemyExpression;

const VARIANT_TO_KEY: Record<RemyVariant, RemyAssetKey> = {
  idle: "remyIdle",
  listening: "remyListening",
  thinking: "remyThinking",
  talking: "remyTalking",
  happy: "remyHappy",
  surprised: "remySurprised",
  sleeping: "remySleeping",
  searching: "remySearching",
  memoryFound: "remyMemoryFound",
  reminding: "remyReminding",
  encouraging: "remyEncouraging",
  welcome: "remyWelcome",
  goodbye: "remyGoodbye",
  confused: "remyConfused",
  wink: "remyWink",
  celebrating: "remyCelebrating",
  success: "remySuccess",
};

/** All supported expression names (handy for tooling / future pickers). */
export const REMY_VARIANTS = Object.keys(VARIANT_TO_KEY) as RemyVariant[];

export interface RemyProps {
  /** Which expression to show. Default "idle". */
  state?: RemyVariant;
  /** Rendered box size in px (square). Default 120. */
  size?: number;
  /** How the art fits its box. "contain" (default) shows the whole frame; "cover" fills + crops. */
  fit?: "contain" | "cover";
  /** Extra classes on the root wrapper (positioning / margins). */
  className?: string;
  /** Accessible label. Defaults to the registry label. Ignored when `decorative`. */
  alt?: string;
  /** Purely decorative (adjacent text conveys the meaning): removed from the a11y tree. */
  decorative?: boolean;
  /** Preload hint for above-the-fold heroes (next/image priority). */
  priority?: boolean;
  /**
   * Living-companion motion (platform-set only). `emotion` selects a one-shot reaction; `float`
   * adds the floating bob; `reactionKey` re-triggers the reaction when it changes (e.g. per
   * moment). Omitting them yields a calm, breathing sprite (the default for in-place stages).
   */
  emotion?: RemyEmotion;
  float?: boolean;
  reactionKey?: string | number;
}

/** How a feeling MOVES (one-shot). Idle sprites (no emotion) just breathe + appear. */
const MOTION_BY_EMOTION: Partial<Record<RemyEmotion, string>> = {
  happy: styles.bounce,
  celebrating: styles.celebrate,
  concerned: styles.wobble,
  confused: styles.wobble,
  thinking: styles.tilt,
  attentive: styles.pulse,
  welcoming: styles.appear,
  encouraging: styles.appear,
  calm: styles.appear,
  neutral: styles.appear,
};

export function Remy({
  state = "idle",
  size = 120,
  fit = "contain",
  className,
  alt,
  decorative = false,
  priority = false,
  emotion,
  float = false,
  reactionKey,
}: RemyProps) {
  const asset = getRemyAsset(VARIANT_TO_KEY[state]);
  const label = decorative ? "" : alt ?? asset.label;

  // The sprite plays exactly one animation at a time: sleep (resting), the feeling's reaction,
  // or a gentle appear on any change. Re-triggered when `reactionKey` (or the expression) changes.
  const reactionClass =
    state === "sleeping"
      ? styles.sleep
      : emotion
        ? MOTION_BY_EMOTION[emotion] ?? styles.appear
        : styles.appear;

  const rootClass = [
    "remy relative inline-block shrink-0 select-none",
    float ? styles.float : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={rootClass}
      style={{ width: size, height: size }}
      data-remy-variant={state}
      data-remy-kind={asset.kind}
      data-remy-emotion={emotion}
    >
      <span
        key={reactionKey ?? state}
        className={["remy__sprite absolute inset-0", reactionClass].filter(Boolean).join(" ")}
      >
        <Image
          src={asset.src}
          alt={label}
          fill
          sizes={`${size}px`}
          priority={priority}
          draggable={false}
          aria-hidden={decorative || undefined}
          className={`${styles.breathe} ${fit === "cover" ? "object-cover" : "object-contain"}`}
        />
      </span>
    </span>
  );
}

export default Remy;
