import path from 'path'
import { fileURLToPath } from 'url'
import { withSentryConfig } from '@sentry/nextjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enables instrumentation.ts on Next 14 (server/edge Sentry init).
  experimental: {
    instrumentationHook: true,
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
