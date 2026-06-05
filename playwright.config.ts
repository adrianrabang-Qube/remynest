import { defineConfig, devices } from "@playwright/test";

/**
 * Phase 1 QA automation — security / isolation smoke tests only.
 *
 * Scope (do not expand without approval):
 *   1. Authentication Gate Protection   (e2e/auth-gate.spec.ts)        — no auth needed
 *   2. Profile Switching Data Isolation (e2e/profile-isolation.spec.ts) — owner auth + seed
 *   3. Caregiver IDOR Protection        (e2e/caregiver-idor.spec.ts)    — caregiver auth + seed
 *
 * Tests 2 & 3 self-skip unless the required E2E_* env vars are provided
 * (see .env.test.example). They never touch production data, billing, or schema.
 */

const BASE_URL =
  process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      // Public/unauthenticated gate checks — no stored auth required.
      name: "auth-gate",
      testMatch: /auth-gate\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "isolation",
      testMatch: /profile-isolation\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".auth/owner.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "caregiver-idor",
      testMatch: /caregiver-idor\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".auth/caregiver.json",
      },
      dependencies: ["setup"],
    },
  ],

  // When E2E_BASE_URL is set we test that deployed URL and start no local server.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
