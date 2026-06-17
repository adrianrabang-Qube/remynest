import { useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * Native-platform detection for App Store (Apple Guideline 3.1.1) compliance.
 *
 * RemyNest ships as a remote-URL Capacitor WebView; the same production web app
 * is served to the iOS shell and to web browsers. Apple prohibits selling digital
 * subscriptions via web checkout inside the app, so all Stripe purchase entry
 * points are hidden on native. The server cannot tell the platforms apart (same
 * URL, no distinguishing UA), so detection is client-side via the Capacitor bridge.
 */

/**
 * Synchronous check — true only inside a native Capacitor shell (iOS/Android),
 * false on the web and during SSR. Use in EVENT HANDLERS as a defense-in-depth
 * guard so a purchase flow can never be initiated on native even if a CTA renders.
 */
export function isNativePlatform(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

// The native-platform value never changes for the life of the document, so the
// store has no real subscription.
const subscribeNoop = () => () => {};

/**
 * Render-time, hydration-safe native detection (via `useSyncExternalStore`).
 *
 * The server snapshot is `true` (treat as native → HIDE purchase UI), so SSR and
 * the hydration render emit the no-purchase branch; after hydration the client
 * snapshot returns the real value. Components must therefore render
 * purchase/checkout UI only when this is `false` — guaranteeing the
 * App-Store-prohibited purchase UI never appears on iOS, not even as a hydration
 * flash. The web cost is that a purchase CTA paints one tick after hydration
 * (negligible; the control is unchanged and non-critical to first paint).
 */
export function useIsNativePlatform(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => isNativePlatform(), // client snapshot — the real value
    () => true, // server + hydration snapshot — hide-first
  );
}
