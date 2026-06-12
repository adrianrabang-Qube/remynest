#!/usr/bin/env node
/**
 * Sentry environment validation (read-only).
 *
 * Confirms the env vars required for production error visibility + source-map
 * upload are present. Prints PASS/MISSING per var, NEVER logs values, and exits
 * non-zero if any required var is missing — usable as a pre-deploy / CI preflight.
 *
 * Setting the vars is an operator step (they live in Vercel, not the repo):
 *   vercel env add SENTRY_DSN production
 *   vercel env add NEXT_PUBLIC_SENTRY_DSN production
 *   vercel env add SENTRY_ORG production
 *   vercel env add SENTRY_PROJECT production
 *   vercel env add SENTRY_AUTH_TOKEN production
 * (repeat for `preview` where post-deploy visibility is wanted)
 *
 * Run: `npm run validate:sentry-env`
 */

const REQUIRED = [
  "SENTRY_DSN", // server runtime DSN
  "NEXT_PUBLIC_SENTRY_DSN", // browser DSN
  "SENTRY_ORG", // source-map upload
  "SENTRY_PROJECT", // source-map upload
  "SENTRY_AUTH_TOKEN", // source-map upload auth
];

let missing = 0;
process.stdout.write("Sentry environment validation\n\n");

for (const key of REQUIRED) {
  const value = process.env[key];
  const present = typeof value === "string" && value.length > 0;
  process.stdout.write(`  ${present ? "PASS    " : "MISSING "} ${key}\n`);
  if (!present) missing += 1;
}

process.stdout.write("\n");

if (missing > 0) {
  process.stderr.write(
    `FAIL: ${missing}/${REQUIRED.length} Sentry env var(s) missing — no production error visibility until set.\n`,
  );
  process.exit(1);
}

process.stdout.write(
  `OK: all ${REQUIRED.length} Sentry environment variables present.\n`,
);
