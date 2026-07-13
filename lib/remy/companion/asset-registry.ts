/**
 * Remy companion — ASSET REGISTRY (single flat production folder).
 *
 * THE single source of truth for every Remy/Nest visual. Components reference assets by
 * KEY — never by file path — so the path lives ONLY here (the `BASE` constant). Every asset
 * lives DIRECTLY in `/public/assets/remy/` (one flat folder; no master/production/archive
 * sub-folders). All app assets are REAL approved artwork (`kind: "image"`); the
 * `kind: "placeholder"` path stays supported for any future not-yet-exported asset.
 *
 * TWO RENDER TIERS per expression (one registry, one key — the tier is a VARIANT of the
 * same asset, not a second asset family):
 *  - `src` — the SCENE tier: the approved 1536×1024 landscape illustrations (transparent
 *    background; the character often shares the canvas with props/speech art). For heroes,
 *    stages, empty states, celebrations — any surface rendering ≳ 120px.
 *  - `avatarSrc` — the AVATAR tier: 256×256 square, transparent, the character at ~86% of
 *    the canvas, derived mechanically (crop + scale ONLY — never redrawn) from the SAME
 *    approved scene export. For navigation and compact surfaces (the Nest button, chips,
 *    and future widgets / watch / Dynamic Island — anything rendering ≲ 100px).
 *  Resolve with `resolveRemyAssetSrc(asset, variant)` — a missing `avatarSrc` falls back to
 *  the scene `src`, so a future expression is never broken by a missing avatar export.
 *
 * The permanent character reference `remy_master_v1.png` also lives in `/public/assets/remy/`
 * but is deliberately NOT registered here — it is a read-only brand reference, never wired
 * into the app. Every export must match it exactly (proportions, scarf, golden-feather heart
 * pendant, palette); do NOT redesign the character (CLAUDE.md).
 *
 * When a placeholder's real artwork lands: drop the PNG into `/public/assets/remy/` (same
 * filename) and flip that entry's `kind` from "placeholder" to "image" — no other change.
 */
export type RemyAssetKind = "placeholder" | "image" | "rive" | "lottie";

/** Which render tier of an asset a surface wants. Default everywhere is "scene". */
export type RemyAssetVariant = "scene" | "avatar";

export type RemyAssetKey =
  | "remyIdle"
  | "remyListening"
  | "remyThinking"
  | "remyTalking"
  | "remyHappy"
  | "remySurprised"
  | "remySleeping"
  | "remySearching"
  | "remyMemoryFound"
  | "remyReminding"
  | "remyEncouraging"
  | "remyWelcome"
  | "remyGoodbye"
  | "remyConfused"
  | "remyWink"
  | "remyCelebrating"
  | "remySuccess"
  | "goldenFeather"
  | "nestEmpty"
  | "nestOpen"
  | "nestClosed"
  | "speechBubble"
  | "shadow";

export interface RemyAsset {
  key: RemyAssetKey;
  /** Human label (a11y + tooling). */
  label: string;
  kind: RemyAssetKind;
  /** SCENE tier path under /public — set for every asset; a placeholder file until real art lands. */
  src: string;
  /**
   * AVATAR tier path under /public — 256×256 square, transparent, character-filling export of
   * the SAME artwork, for small-format surfaces (≲ 100px). Optional: expressions only; when
   * absent, `resolveRemyAssetSrc` falls back to the scene `src`.
   */
  avatarSrc?: string;
}

/** Every Remy/Nest asset lives directly in this one flat folder; the base path is defined ONCE. */
const BASE = "/assets/remy";

export const REMY_ASSETS: Record<RemyAssetKey, RemyAsset> = {
  remyIdle: { key: "remyIdle", label: "Remy — idle", kind: "image", src: `${BASE}/remy_idle.png`, avatarSrc: `${BASE}/remy_avatar_idle.png` },
  remyListening: { key: "remyListening", label: "Remy — listening", kind: "image", src: `${BASE}/remy_listening.png`, avatarSrc: `${BASE}/remy_avatar_listening.png` },
  remyThinking: { key: "remyThinking", label: "Remy — thinking", kind: "image", src: `${BASE}/remy_thinking.png`, avatarSrc: `${BASE}/remy_avatar_thinking.png` },
  remyTalking: { key: "remyTalking", label: "Remy — talking", kind: "image", src: `${BASE}/remy_talking.png`, avatarSrc: `${BASE}/remy_avatar_talking.png` },
  remyHappy: { key: "remyHappy", label: "Remy — happy", kind: "image", src: `${BASE}/remy_happy.png`, avatarSrc: `${BASE}/remy_avatar_happy.png` },
  remySurprised: { key: "remySurprised", label: "Remy — surprised", kind: "image", src: `${BASE}/remy_surprised.png`, avatarSrc: `${BASE}/remy_avatar_surprised.png` },
  remySleeping: { key: "remySleeping", label: "Remy — sleeping", kind: "image", src: `${BASE}/remy_sleeping.png`, avatarSrc: `${BASE}/remy_avatar_sleeping.png` },
  remySearching: { key: "remySearching", label: "Remy — searching", kind: "image", src: `${BASE}/remy_searching.png`, avatarSrc: `${BASE}/remy_avatar_searching.png` },
  remyMemoryFound: { key: "remyMemoryFound", label: "Remy — memory found", kind: "image", src: `${BASE}/remy_memory_found.png`, avatarSrc: `${BASE}/remy_avatar_memory_found.png` },
  remyReminding: { key: "remyReminding", label: "Remy — reminding", kind: "image", src: `${BASE}/remy_reminding.png`, avatarSrc: `${BASE}/remy_avatar_reminding.png` },
  remyEncouraging: { key: "remyEncouraging", label: "Remy — encouraging", kind: "image", src: `${BASE}/remy_encouraging.png`, avatarSrc: `${BASE}/remy_avatar_encouraging.png` },
  remyWelcome: { key: "remyWelcome", label: "Remy — welcome", kind: "image", src: `${BASE}/remy_welcome.png`, avatarSrc: `${BASE}/remy_avatar_welcome.png` },
  remyGoodbye: { key: "remyGoodbye", label: "Remy — goodbye", kind: "image", src: `${BASE}/remy_goodbye.png`, avatarSrc: `${BASE}/remy_avatar_goodbye.png` },
  remyConfused: { key: "remyConfused", label: "Remy — confused", kind: "image", src: `${BASE}/remy_confused.png`, avatarSrc: `${BASE}/remy_avatar_confused.png` },
  remyWink: { key: "remyWink", label: "Remy — wink", kind: "image", src: `${BASE}/remy_wink.png`, avatarSrc: `${BASE}/remy_avatar_wink.png` },
  remyCelebrating: { key: "remyCelebrating", label: "Remy — celebrating", kind: "image", src: `${BASE}/remy_celebrating.png`, avatarSrc: `${BASE}/remy_avatar_celebrating.png` },
  remySuccess: { key: "remySuccess", label: "Remy — success", kind: "image", src: `${BASE}/remy_success.png`, avatarSrc: `${BASE}/remy_avatar_success.png` },
  goldenFeather: { key: "goldenFeather", label: "Golden feather", kind: "image", src: `${BASE}/golden_feather.png` },
  nestEmpty: { key: "nestEmpty", label: "Nest — empty", kind: "image", src: `${BASE}/nest_empty.png` },
  nestOpen: { key: "nestOpen", label: "Nest — open", kind: "image", src: `${BASE}/nest_open.png` },
  nestClosed: { key: "nestClosed", label: "Nest — closed", kind: "image", src: `${BASE}/nest_closed.png` },
  speechBubble: { key: "speechBubble", label: "Speech bubble", kind: "image", src: `${BASE}/speech_bubble.png` },
  shadow: { key: "shadow", label: "Companion shadow", kind: "image", src: `${BASE}/shadow.png` },
};

export function getRemyAsset(key: RemyAssetKey): RemyAsset {
  return REMY_ASSETS[key];
}

/**
 * Resolve the image source for a render tier. The avatar tier gracefully falls back to the
 * scene export when no avatar has been produced for an asset — a surface can safely request
 * `"avatar"` for any expression (including future ones) and never break.
 */
export function resolveRemyAssetSrc(
  asset: RemyAsset,
  variant: RemyAssetVariant = "scene",
): string {
  return variant === "avatar" && asset.avatarSrc ? asset.avatarSrc : asset.src;
}

/** True until real artwork replaces the placeholder for a given asset. */
export function isPlaceholderAsset(key: RemyAssetKey): boolean {
  return REMY_ASSETS[key].kind === "placeholder";
}

/** Keys still awaiting a real export (placeholders only). */
export function pendingArtworkKeys(): RemyAssetKey[] {
  return (Object.keys(REMY_ASSETS) as RemyAssetKey[]).filter(isPlaceholderAsset);
}
