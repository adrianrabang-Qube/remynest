import path from 'path'
import { fileURLToPath } from 'url'
import { withSentryConfig } from '@sentry/nextjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// -------------------------------------------------------------------------
// Production security headers (RC2). Applied to every response.
//
// Compatibility note: the Capacitor iOS app loads the LIVE site in its WebView
// (capacitor.config `server.url`), so these headers reach the native app too —
// the CSP is therefore crafted to keep Next.js, Supabase (REST + storage +
// realtime wss), Stripe (js/checkout), OneSignal (web SDK + push), and Sentry
// (ingest) working. `connect-src`/`img-src`/`media-src` intentionally allow
// https:/wss: so no third-party API is accidentally blocked (no false positives),
// while the high-value directives are strict: frame-ancestors 'none' (anti-
// clickjacking), object-src 'none', base-uri 'self', a script-src allowlist.
// (A nonce-based script-src is a future hardening; App-Router + the Capacitor
// bridge + OneSignal/Stripe currently need 'unsafe-inline'.)
// -------------------------------------------------------------------------
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://checkout.stripe.com",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.onesignal.com https://cdn.onesignal.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' blob: https:",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://*.onesignal.com",
  "worker-src 'self' blob:",
  "connect-src 'self' https: wss:",
  "manifest-src 'self'",
  'upgrade-insecure-requests',
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(), browsing-topics=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  // Allow Stripe's popup/redirect while isolating the browsing context.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enables instrumentation.ts on Next 14 (server/edge Sentry init).
  experimental: {
    instrumentationHook: true,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname)
    return config
  },
}

// withSentryConfig adds source-map upload + release tracking. Source maps are
// uploaded only when SENTRY_AUTH_TOKEN (+ SENTRY_ORG/SENTRY_PROJECT) are set in
// the build environment; otherwise the build proceeds without upload.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
})
