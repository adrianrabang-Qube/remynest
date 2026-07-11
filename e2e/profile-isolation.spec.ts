import { test, expect } from "@playwright/test";

import {
  owner,
  hasCreds,
  foreignProfileId,
} from "./helpers";

/**
 * TEST 2 — Profile Switching Data Isolation  (QA_TEST_PLAN §11)  [P0]
 *
 * As an authenticated owner, attempt to set the active profile to a profile the
 * account is NOT allowed to access, then confirm none of that profile's data is
 * exposed. POST /api/active-profile sets context without verifying access, so the
 * isolation guarantee MUST be enforced downstream when data is fetched.
 *
 * Self-skips unless owner credentials + a non-accessible E2E_FOREIGN_PROFILE_ID
 * are provided. Runs with the owner storageState (see playwright.config.ts).
 */

test.describe("Profile Switching Data Isolation [P0]", () => {
  test.skip(
    !hasCreds(owner) || !foreignProfileId,
    "Requires E2E_OWNER_* creds and a non-accessible E2E_FOREIGN_PROFILE_ID"
  );

  test("switching to a non-accessible profile does not expose its data", async ({
    request,
  }) => {
    // Attempt to switch into a foreign (non-accessible) profile.
    const setRes = await request.post(
      "/api/active-profile",
      { data: { profileId: foreignProfileId } }
    );
    // RC2: the POST now REJECTS a non-accessible profileId at write time (403) — the workspace cookie is
    // never set for a profile the caller cannot access (defense-in-depth on top of the read-side boundary).
    expect(setRes.status()).toBe(403);

    // The active-profile read must NOT return the foreign profile object.
    const getRes = await request.get(
      "/api/active-profile"
    );
    expect(getRes.ok()).toBeTruthy();
    const body = await getRes.json();
    expect(body.profile ?? null).toBeNull();

    // The timeline must not surface anything tied to the foreign profile.
    const timelineRes = await request.get(
      "/api/timeline"
    );
    if (timelineRes.ok()) {
      const timeline = await timelineRes.json();
      expect(JSON.stringify(timeline)).not.toContain(
        foreignProfileId
      );
    }
  });
});
