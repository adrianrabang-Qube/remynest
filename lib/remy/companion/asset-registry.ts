/**
 * Remy companion — ASSET REGISTRY (single flat production folder).
 *
 * THE single source of truth for every Remy/Nest visual. Components reference assets by
 * KEY — never by file path — so the path lives ONLY here (the `BASE` constant). Every asset
 * lives DIRECTLY in `/public/assets/remy/` (one flat folder; no master/production/archive
 * sub-folders). Most entries are REAL approved artwork (`kind: "image"`); a couple are
 * transparent placeholders (`kind: "placeholder"`) until their approved export lands.
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
  /** Path under /public — set for every asset; a placeholder file until real art lands. */
  src: string;
}

/** Every Remy/Nest asset lives directly in this one flat folder; the base path is defined ONCE. */
const BASE = "/assets/remy";

export const REMY_ASSETS: Record<RemyAssetKey, RemyAsset> = {
  remyIdle: { key: "remyIdle", label: "Remy — idle", kind: "image", src: `${BASE}/remy_idle.png` },
  remyListening: { key: "remyListening", label: "Remy — listening", kind: "image", src: `${BASE}/remy_listening.png` },
  remyThinking: { key: "remyThinking", label: "Remy — thinking", kind: "image", src: `${BASE}/remy_thinking.png` },
  remyTalking: { key: "remyTalking", label: "Remy — talking", kind: "image", src: `${BASE}/remy_talking.png` },
  remyHappy: { key: "remyHappy", label: "Remy — happy", kind: "image", src: `${BASE}/remy_happy.png` },
  remySurprised: { key: "remySurprised", label: "Remy — surprised", kind: "image", src: `${BASE}/remy_surprised.png` },
  remySleeping: { key: "remySleeping", label: "Remy — sleeping", kind: "image", src: `${BASE}/remy_sleeping.png` },
  remySearching: { key: "remySearching", label: "Remy — searching", kind: "image", src: `${BASE}/remy_searching.png` },
  remyMemoryFound: { key: "remyMemoryFound", label: "Remy — memory found", kind: "image", src: `${BASE}/remy_memory_found.png` },
  remyReminding: { key: "remyReminding", label: "Remy — reminding", kind: "image", src: `${BASE}/remy_reminding.png` },
  remyEncouraging: { key: "remyEncouraging", label: "Remy — encouraging", kind: "image", src: `${BASE}/remy_encouraging.png` },
  remyWelcome: { key: "remyWelcome", label: "Remy — welcome", kind: "image", src: `${BASE}/remy_welcome.png` },
  remyGoodbye: { key: "remyGoodbye", label: "Remy — goodbye", kind: "image", src: `${BASE}/remy_goodbye.png` },
  remyConfused: { key: "remyConfused", label: "Remy — confused", kind: "image", src: `${BASE}/remy_confused.png` },
  remyWink: { key: "remyWink", label: "Remy — wink", kind: "image", src: `${BASE}/remy_wink.png` },
  remyCelebrating: { key: "remyCelebrating", label: "Remy — celebrating", kind: "image", src: `${BASE}/remy_celebrating.png` },
  remySuccess: { key: "remySuccess", label: "Remy — success", kind: "image", src: `${BASE}/remy_success.png` },
  goldenFeather: { key: "goldenFeather", label: "Golden feather", kind: "image", src: `${BASE}/golden_feather.png` },
  nestEmpty: { key: "nestEmpty", label: "Nest — empty", kind: "image", src: `${BASE}/nest_empty.png` },
  nestOpen: { key: "nestOpen", label: "Nest — open", kind: "placeholder", src: `${BASE}/nest_open.png` },
  nestClosed: { key: "nestClosed", label: "Nest — closed", kind: "image", src: `${BASE}/nest_closed.png` },
  speechBubble: { key: "speechBubble", label: "Speech bubble", kind: "image", src: `${BASE}/speech_bubble.png` },
  shadow: { key: "shadow", label: "Companion shadow", kind: "placeholder", src: `${BASE}/shadow.png` },
};

export function getRemyAsset(key: RemyAssetKey): RemyAsset {
  return REMY_ASSETS[key];
}

/** True until real artwork replaces the placeholder for a given asset. */
export function isPlaceholderAsset(key: RemyAssetKey): boolean {
  return REMY_ASSETS[key].kind === "placeholder";
}

/** Keys still awaiting a real export (placeholders only). */
export function pendingArtworkKeys(): RemyAssetKey[] {
  return (Object.keys(REMY_ASSETS) as RemyAssetKey[]).filter(isPlaceholderAsset);
}
