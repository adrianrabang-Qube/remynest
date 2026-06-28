/**
 * Remy companion — ASSET REGISTRY (production pipeline).
 *
 * THE single source of truth for every Remy/Nest visual. Components reference assets by
 * KEY — never by file path — so the path lives ONLY here. Each entry's `src` points at its
 * file in the canonical PRODUCTION folder (`/public/assets/remy/production/`) — the ONLY
 * asset location the app reads going forward. Sibling folders are NOT referenced here:
 *   - `/public/assets/remy/master/`  → the immutable canonical character reference
 *     (`remy_master_v1.png`, "Remy Master v1.0"); read-only, never wired into the app.
 *   - `/public/assets/remy/archive/` → historical/superseded revisions; never referenced.
 *
 * Asset status today: `remy_idle` + `remy_thinking` are REAL production art (`kind: "image"`);
 * every other slot is a TRANSPARENT PLACEHOLDER (`kind: "placeholder"`) awaiting its approved
 * export. NOTE: `remy_listening` is a placeholder on purpose — the dropped file duplicated
 * `remy_thinking` (wrong pose); its correct wing-to-ear export is still pending.
 *
 * When real artwork lands: drop the PNG into `production/` (same filename) and flip that
 * entry's `kind` to "image" — no other code changes. Do NOT redesign the character; every
 * export must match `master/remy_master_v1.png` exactly (CLAUDE.md). Master spec per file:
 * 2048×2048, transparent, centered, no background.
 */
export type RemyAssetKind = "placeholder" | "image" | "rive" | "lottie";

export type RemyAssetKey =
  | "remyIdle"
  | "remyHappy"
  | "remyThinking"
  | "remyListening"
  | "remyTalking"
  | "remyWave"
  | "remySleeping"
  | "remyCelebrating"
  | "nestClosed"
  | "nestOpen"
  | "nestEmpty"
  | "goldenFeather"
  | "speechBubble"
  | "shadow";

export interface RemyAsset {
  key: RemyAssetKey;
  /** Human label (a11y + tooling). */
  label: string;
  kind: RemyAssetKind;
  /** Path under /public — set for every asset; the file is a placeholder until art lands. */
  src: string;
}

/** All Remy/Nest assets the app reads live in the production folder; the base path is defined ONCE. */
const BASE = "/assets/remy/production";

export const REMY_ASSETS: Record<RemyAssetKey, RemyAsset> = {
  remyIdle: { key: "remyIdle", label: "Remy — idle", kind: "image", src: `${BASE}/remy_idle.png` },
  remyHappy: { key: "remyHappy", label: "Remy — happy", kind: "placeholder", src: `${BASE}/remy_happy.png` },
  remyThinking: { key: "remyThinking", label: "Remy — thinking", kind: "image", src: `${BASE}/remy_thinking.png` },
  remyListening: { key: "remyListening", label: "Remy — listening", kind: "placeholder", src: `${BASE}/remy_listening.png` },
  remyTalking: { key: "remyTalking", label: "Remy — talking", kind: "placeholder", src: `${BASE}/remy_talking.png` },
  remyWave: { key: "remyWave", label: "Remy — wave", kind: "placeholder", src: `${BASE}/remy_wave.png` },
  remySleeping: { key: "remySleeping", label: "Remy — sleeping", kind: "placeholder", src: `${BASE}/remy_sleeping.png` },
  remyCelebrating: { key: "remyCelebrating", label: "Remy — celebrating", kind: "placeholder", src: `${BASE}/remy_celebrating.png` },
  nestClosed: { key: "nestClosed", label: "Nest — closed", kind: "placeholder", src: `${BASE}/nest_closed.png` },
  nestOpen: { key: "nestOpen", label: "Nest — open", kind: "placeholder", src: `${BASE}/nest_open.png` },
  nestEmpty: { key: "nestEmpty", label: "Nest — empty", kind: "placeholder", src: `${BASE}/nest_empty.png` },
  goldenFeather: { key: "goldenFeather", label: "Golden feather", kind: "placeholder", src: `${BASE}/golden_feather.png` },
  speechBubble: { key: "speechBubble", label: "Speech bubble", kind: "placeholder", src: `${BASE}/speech_bubble.png` },
  shadow: { key: "shadow", label: "Companion shadow", kind: "placeholder", src: `${BASE}/shadow.png` },
};

export function getRemyAsset(key: RemyAssetKey): RemyAsset {
  return REMY_ASSETS[key];
}

/** True until production artwork replaces the placeholder for a given asset. */
export function isPlaceholderAsset(key: RemyAssetKey): boolean {
  return REMY_ASSETS[key].kind === "placeholder";
}

/** Keys still awaiting a production export (all of them, until art is dropped in). */
export function pendingArtworkKeys(): RemyAssetKey[] {
  return (Object.keys(REMY_ASSETS) as RemyAssetKey[]).filter(isPlaceholderAsset);
}
