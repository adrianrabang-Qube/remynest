/**
 * Remy companion — ASSET REGISTRY (foundation only).
 *
 * THE single source of truth for every Remy/Nest visual. Components reference assets by
 * KEY (never by file path), so swapping in final production artwork is a one-file change:
 * set `kind` to "image" | "rive" | "lottie" and point `src` at the asset. Today every
 * entry is a `placeholder` (no file shipped) — the Floating layer renders a neutral
 * placeholder until art is connected.
 */
export type RemyAssetKind = "placeholder" | "image" | "rive" | "lottie";

export type RemyAssetKey =
  | "remyIdle"
  | "nestClosed"
  | "nestOpen"
  | "goldenFeather"
  | "speechBubble"
  | "shadow";

export interface RemyAsset {
  key: RemyAssetKey;
  /** Human label (a11y + tooling). */
  label: string;
  kind: RemyAssetKind;
  /** Path/URL for image/rive/lottie kinds — undefined while a placeholder. */
  src?: string;
}

export const REMY_ASSETS: Record<RemyAssetKey, RemyAsset> = {
  remyIdle: { key: "remyIdle", label: "Remy (idle)", kind: "placeholder" },
  nestClosed: { key: "nestClosed", label: "Nest (closed)", kind: "placeholder" },
  nestOpen: { key: "nestOpen", label: "Nest (open)", kind: "placeholder" },
  goldenFeather: {
    key: "goldenFeather",
    label: "Golden feather",
    kind: "placeholder",
  },
  speechBubble: {
    key: "speechBubble",
    label: "Speech bubble",
    kind: "placeholder",
  },
  shadow: { key: "shadow", label: "Companion shadow", kind: "placeholder" },
};

export function getRemyAsset(key: RemyAssetKey): RemyAsset {
  return REMY_ASSETS[key];
}

/** True until production artwork replaces the placeholder for a given asset. */
export function isPlaceholderAsset(key: RemyAssetKey): boolean {
  return REMY_ASSETS[key].kind === "placeholder";
}
