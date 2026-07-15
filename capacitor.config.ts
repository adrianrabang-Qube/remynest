import type { CapacitorConfig } from '@capacitor/cli';

/**
 * RemyNest mobile wrapper (Capacitor) — Remote-URL architecture.
 *
 * RemyNest is a server-rendered Next.js app (App Router, edge-middleware auth,
 * 24 API routes), so it cannot be statically exported. Instead the native shell
 * loads the live production site in the WebView via `server.url`. SSR, auth,
 * Supabase sessions, billing and uploads all keep working exactly as on the web.
 *
 * `webDir` (mobile/www) is only a local fallback shown if the remote URL is
 * unreachable; the real app is always served from production.
 */
const config: CapacitorConfig = {
  appId: 'com.remynest.app',
  appName: 'RemyNest',
  webDir: 'mobile/www',
  server: {
    url: 'https://www.remynest.com',
    cleartext: false,
    // Top-level navigations allowed to stay inside the WebView. XHR/fetch to
    // other hosts (Supabase, Stripe, OpenAI, OneSignal) is unaffected by this.
    allowNavigation: [
      'www.remynest.com',
      'remynest.com',
      '*.supabase.co',
      '*.onesignal.com',
    ],
  },
  ios: {
    // `viewport-fit=cover` (app/layout.tsx) makes CSS env(safe-area-inset-*) the
    // single source of truth for insets — the headers/nav pad themselves. Pairing
    // that with WKWebView's own `contentInset: 'always'` DOUBLE-insets and fights
    // `cover`, which shifted the sticky mobile header (the "My Nest" top-left
    // defect). `'never'` lets the web layer own all insets. (Native config —
    // requires `npx cap sync ios` + a rebuild to take effect.)
    contentInset: 'never',
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#F5F1EA', // Warm Sand — matches the branded splash image
      showSpinner: false,
    },
  },
};

export default config;
