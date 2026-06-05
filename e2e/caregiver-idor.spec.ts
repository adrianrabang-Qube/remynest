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

    // Determine the security signal WITHOUT relying on the memory UUID, which
    // Next.js legitimately embeds in framework HTML (canonical URL) even on a 404.
    const html = await page.content();

    const hardDeny = [401, 403, 404].includes(status);
    const notFoundState =
      /content="not-found"|NEXT_NOT_FOUND|could not be found/i.test(
        html
      );

    // These chrome strings render ONLY when a memory successfully loads
    // (app/(app)/memories/[id]/page.tsx). Their presence would mean data leaked.
    const memoryRendered =
      html.includes("Original Memory") &&
      html.includes("RemyNest Cognitive Engine");

    expect(
      memoryRendered,
      "Foreign memory data must not be exposed to a caregiver"
    ).toBe(false);

    expect(
      hardDeny || notFoundState,
      "Access should be denied (4xx) or render the Next notFound() state"
    ).toBeTruthy();
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
