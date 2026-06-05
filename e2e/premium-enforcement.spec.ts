import { test, expect } from "@playwright/test";

import { owner, hasCreds } from "./helpers";

/**
 * Premium API-layer enforcement [P0].
 *
 * Confirms semantic-search endpoints reject free-tier access even when called
 * directly (UI bypass). Runs as the free-tier owner account (storageState in
 * playwright.config.ts). Premium-allow path is env-gated (see note) because a
 * premium account cannot be created under the "no production data changes" rule.
 */

const PREMIUM_EMAIL = process.env.E2E_PREMIUM_EMAIL ?? "";

test.describe("Premium API enforcement [P0]", () => {
  test.skip(
    !hasCreds(owner),
    "Requires E2E_OWNER_* creds (free-tier account)"
  );

  test("free user is blocked from /api/search (semantic)", async ({
    request,
  }) => {
    const res = await request.post("/api/search", {
      data: { query: "a test query" },
    });
    expect(res.status()).toBe(402);
    const body = await res.json();
    expect(body.code).toBe("UPGRADE_REQUIRED");
  });

  test("free user is blocked from /api/memories/search (semantic)", async ({
    request,
  }) => {
    const res = await request.post(
      "/api/memories/search",
      { data: { query: "a test query" } }
    );
    expect(res.status()).toBe(402);
    const body = await res.json();
    expect(body.code).toBe("UPGRADE_REQUIRED");
  });

  test("premium user is allowed semantic search", async ({
    request,
  }) => {
    test.skip(
      !PREMIUM_EMAIL,
      "Requires a premium E2E account (E2E_PREMIUM_*); cannot create one without modifying production data"
    );
    const res = await request.post("/api/search", {
      data: { query: "a test query" },
    });
    expect(res.status()).not.toBe(402);
  });
});
