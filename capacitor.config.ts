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
    contentInset: 'always',
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
  },
};

export default config;
