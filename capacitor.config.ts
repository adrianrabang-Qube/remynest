import type { CapacitorConfig } from "@capacitor/cli";

/**
 * RemyNest mobile wrapper (Capacitor) — remote-URL architecture.
 *
 * RemyNest is a server-rendered Next.js app, so it cannot be statically exported;
 * the native shell loads the live production site in the WebView via `server.url`.
 * `webDir` (mobile/www) is only a local fallback shown if the remote URL is
 * unreachable. Reminder local notifications are scheduled on-device via
 * @capacitor/local-notifications (auto-registers — no plugin block required).
 */
const config: CapacitorConfig = {
  appId: "com.remynest.app",
  appName: "RemyNest",
  webDir: "mobile/www",
  server: {
    url: "https://www.remynest.com",
    cleartext: false,
    allowNavigation: [
      "www.remynest.com",
      "remynest.com",
      "*.supabase.co",
      "*.onesignal.com",
    ],
  },
  ios: {
    // The web layer owns all safe-area insets (viewport-fit=cover + CSS env()),
    // so the WebView must not double-inset.
    contentInset: "never",
    limitsNavigationsToAppBoundDomains: false,
  },
};

export default config;
