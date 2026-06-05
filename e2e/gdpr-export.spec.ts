import { test, expect } from "@playwright/test";

import { owner, hasCreds } from "./helpers";

/**
 * GDPR Export [P0].
 *
 * Verifies the authenticated export returns the user's data as a downloadable
 * JSON payload, and that unauthenticated access is denied. Runs as the owner
 * account (storageState in playwright.config.ts). Read-only; creates no data.
 */

const EXPECTED_KEYS = [
  "account",
  "profile",
  "memoryProfiles",
  "memories",
  "reminders",
  "caregiverRelationships",
  "caregiverInvitesSent",
  "caregiverInvitesReceived",
  "mediaReferences",
  "counts",
];

test.describe("GDPR export — authenticated", () => {
  test.skip(
    !hasCreds(owner),
    "Requires E2E_OWNER_* creds"
  );

  test("returns the user's data as a downloadable JSON", async ({
    request,
  }) => {
    const res = await request.get("/api/gdpr/export");

    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain(
      "application/json"
    );
    expect(
      res.headers()["content-disposition"]
    ).toContain("attachment");

    const body = await res.json();
    for (const key of EXPECTED_KEYS) {
      expect(body).toHaveProperty(key);
    }

    // The export must be scoped to the requesting account.
    expect(body.account).toHaveProperty("userId");
    expect(Array.isArray(body.memories)).toBeTruthy();
  });
});

test.describe("GDPR export — unauthenticated", () => {
  test.use({
    storageState: { cookies: [], origins: [] },
  });

  test("denies unauthenticated access without leaking data", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/gdpr/export",
      { maxRedirects: 0 }
    );
    const status = res.status();

    const isRedirectToLogin =
      [301, 302, 303, 307, 308].includes(status) &&
      (res.headers()["location"] ?? "").includes(
        "/login"
      );

    expect(
      status === 401 || isRedirectToLogin
    ).toBeTruthy();

    const text = await res.text();
    expect(text).not.toContain("memoryProfiles");
  });
});
