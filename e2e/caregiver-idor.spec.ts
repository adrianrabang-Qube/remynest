import { test, expect } from "@playwright/test";

import {
  caregiver,
  hasCreds,
  foreignProfileId,
  foreignMemoryId,
} from "./helpers";

/**
 * TEST 3 — Caregiver IDOR Protection  (QA_TEST_PLAN §10)  [P0]
 *
 * A caregiver must not reach data for a profile/memory that has NOT been shared
 * with them, even via direct URL or by forcing an active-profile switch.
 *
 * Self-skips unless caregiver credentials + at least one non-shared seeded ID
 * (E2E_FOREIGN_PROFILE_ID / E2E_FOREIGN_MEMORY_ID) are provided.
 * Runs with the caregiver storageState (see playwright.config.ts).
 */

test.describe("Caregiver IDOR Protection [P0]", () => {
  test.skip(
    !hasCreds(caregiver) ||
      (!foreignProfileId && !foreignMemoryId),
    "Requires E2E_CAREGIVER_* creds and a non-shared E2E_FOREIGN_PROFILE_ID / E2E_FOREIGN_MEMORY_ID"
  );

  test("caregiver cannot open a non-shared memory via direct URL", async ({
    page,
  }) => {
    test.skip(
      !foreignMemoryId,
      "E2E_FOREIGN_MEMORY_ID not set"
    );

    const resp = await page.goto(
      `/memories/${foreignMemoryId}`
    );
    const status = resp?.status() ?? 0;

    // Secure outcomes: a hard deny (401/403/404) OR a 200 shell that renders
    // no foreign content. A 200 that exposes the memory body is a P0 failure.
    if (status === 200) {
      const content = await page.content();
      expect(content).not.toContain(
        foreignMemoryId
      );
    } else {
      expect([401, 403, 404]).toContain(status);
    }
  });

  test("caregiver cannot switch into a non-shared profile and read its data", async ({
    request,
  }) => {
    test.skip(
      !foreignProfileId,
      "E2E_FOREIGN_PROFILE_ID not set"
    );

    await request.post("/api/active-profile", {
      data: { profileId: foreignProfileId },
    });

    const getRes = await request.get(
      "/api/active-profile"
    );
    const body = await getRes.json();
    expect(body.profile ?? null).toBeNull();
  });
});
