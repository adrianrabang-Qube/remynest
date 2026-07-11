import { test, expect } from "@playwright/test";

/**
 * CRON_SECRET hardening [P0].
 *
 * The cron / internal-notification endpoints are public (middleware allowlist)
 * and must reject callers that don't present the correct Bearer secret.
 *
 * The "authorized" case is proven via /api/send-notification with a valid
 * secret but NO params: it passes auth and fails validation (400) WITHOUT
 * sending any notification — no side effects, no production data changes.
 */

const ENDPOINTS = [
  "/api/cron/send-due-reminders",
  "/api/send-notification",
];

const CRON_SECRET = process.env.CRON_SECRET ?? "";

test.describe("CRON_SECRET hardening [P0]", () => {
  for (const path of ENDPOINTS) {
    test(`rejects unauthenticated GET ${path}`, async ({
      request,
    }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(401);
    });
  }

  test("rejects an incorrect secret", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/send-notification",
      {
        headers: {
          authorization: "Bearer wrong-secret",
        },
      }
    );
    expect(res.status()).toBe(401);
  });

  test("allows a correct secret (auth passes, no side effects)", async ({
    request,
  }) => {
    test.skip(
      !CRON_SECRET,
      "CRON_SECRET not set in this run"
    );
    const res = await request.get(
      "/api/send-notification",
      {
        headers: {
          authorization: `Bearer ${CRON_SECRET}`,
        },
      }
    );
    // Auth passed; validation fails because no message/userId were provided.
    expect(res.status()).not.toBe(401);
    expect(res.status()).toBe(400);
  });
});
