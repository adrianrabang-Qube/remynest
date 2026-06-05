import { test, expect } from "@playwright/test";

/**
 * TEST 1 — Authentication Gate Protection  (QA_TEST_PLAN §1)  [P0]
 *
 * Verifies that unauthenticated users cannot reach protected surfaces:
 *   - protected PAGE routes redirect to /login
 *   - a protected API route returns 401 (not data, not 200)
 *
 * Requires no seeded data — always runs against the app under test.
 * Source of truth for the protected list: middleware.ts (PROTECTED_ROUTES).
 */

const PROTECTED_PAGES = [
  "/dashboard",
  "/memories",
  "/timeline",
  "/reminders",
  "/insights",
  "/memory-chat",
];

test.describe("Authentication Gate Protection [P0]", () => {
  for (const route of PROTECTED_PAGES) {
    test(`unauthenticated ${route} redirects to /login`, async ({
      page,
    }) => {
      await page.goto(route);
      // Middleware should bounce the unauthenticated request to the login page.
      await expect(page).toHaveURL(/\/login/, {
        timeout: 15_000,
      });
    });
  }

  test("protected API GET /api/active-profile denies unauthenticated access without leaking data", async ({
    request,
  }) => {
    // Do not follow redirects: middleware bounces protected routes to /login.
    const res = await request.get(
      "/api/active-profile",
      { maxRedirects: 0 }
    );
    const status = res.status();

    // Secure outcomes: a 401, or a redirect to /login.
    const isRedirectToLogin =
      [301, 302, 303, 307, 308].includes(status) &&
      (res.headers()["location"] ?? "").includes(
        "/login"
      );
    expect(
      status === 401 || isRedirectToLogin
    ).toBeTruthy();

    // In all cases, the protected payload must NOT be exposed.
    const body = await res.text();
    expect(body).not.toContain("activeProfileId");
  });
});
