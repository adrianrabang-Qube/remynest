import Image from "next/image";

import {
  getRemyAsset,
  type RemyAssetKey,
} from "@/lib/remy/companion/asset-registry";

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

/** Friendly expression names (the 17 character states). Maps 1:1 to registry keys. */
export type RemyVariant =
  | "idle"
  | "listening"
  | "thinking"
  | "talking"
  | "happy"
  | "surprised"
  | "sleeping"
  | "searching"
  | "memoryFound"
  | "reminding"
  | "encouraging"
  | "welcome"
  | "goodbye"
  | "confused"
  | "wink"
  | "celebrating"
  | "success";

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
}

export function Remy({
  state = "idle",
  size = 120,
  fit = "contain",
  className,
  alt,
  decorative = false,
  priority = false,
}: RemyProps) {
  const asset = getRemyAsset(VARIANT_TO_KEY[state]);
  const label = decorative ? "" : alt ?? asset.label;

  const rootClass = [
    "remy relative inline-block shrink-0 select-none",
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
    >
      <span className="remy__sprite absolute inset-0">
        <Image
          src={asset.src}
          alt={label}
          fill
          sizes={`${size}px`}
          priority={priority}
          draggable={false}
          aria-hidden={decorative || undefined}
          className={fit === "cover" ? "object-cover" : "object-contain"}
        />
      </span>
    </span>
  );
}

export default Remy;
