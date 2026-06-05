import { test, expect } from "@playwright/test";

import { owner, hasCreds } from "./helpers";

// Mirrors lib/gdpr/plan-user-deletion.ts DELETION_ORDER. Kept local so the test
// stays independent of the server-only module (which loads the admin client).
const EXPECTED_DELETION_ORDER = [
  "storage_media",
  "memory_clusters",
  "memories",
  "reminders",
  "profile_relationships",
  "caregiver_invites",
  "device_registrations",
  "memory_profiles",
  "profiles",
  "auth_user",
];

/**
 * GDPR Deletion — dry-run scaffold [P0].
 *
 * Validates the cascade PLAN and ownership checks without deleting anything,
 * and confirms the destructive DELETE is disabled. Read-only; no data modified.
 */

test.describe("GDPR deletion — dry-run plan", () => {
  test.skip(
    !hasCreds(owner),
    "Requires E2E_OWNER_* creds"
  );

  test("GET returns a dry-run plan with the exact cascade order", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/gdpr/delete-account"
    );
    expect(res.status()).toBe(200);

    const plan = await res.json();
    expect(plan.mode).toBe("dry-run");
    expect(plan.executable).toBe(false);
    expect(plan.account).toHaveProperty("userId");

    // Exact deletion order is validated against the canonical cascade.
    const stages = plan.steps.map(
      (s: { stage: string }) => s.stage
    );
    expect(stages).toEqual(EXPECTED_DELETION_ORDER);

    // Each step reports a numeric count.
    for (const step of plan.steps) {
      expect(typeof step.count).toBe("number");
    }
  });

  test("ownership check flags a shared owned profile as a blocker", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/gdpr/delete-account"
    );
    const plan = await res.json();

    // The owner account owns "RemyNest E2E Owner Profile A", which is shared
    // with the seeded caregiver — so deletion must be blocked pending policy.
    expect(
      Array.isArray(plan.ownership.sharedOwnedProfiles)
    ).toBeTruthy();
    expect(
      plan.ownership.sharedOwnedProfiles.length
    ).toBeGreaterThan(0);
    expect(plan.blocked).toBe(true);
    expect(plan.blockers.length).toBeGreaterThan(0);
  });

  test("DELETE is disabled (no destructive path)", async ({
    request,
  }) => {
    const res = await request.delete(
      "/api/gdpr/delete-account"
    );
    expect(res.status()).toBe(501);
    const body = await res.json();
    expect(body.code).toBe(
      "DELETION_NOT_IMPLEMENTED"
    );
  });
});

test.describe("GDPR deletion — unauthenticated", () => {
  test.use({
    storageState: { cookies: [], origins: [] },
  });

  test("denies unauthenticated access", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/gdpr/delete-account",
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
  });
});
