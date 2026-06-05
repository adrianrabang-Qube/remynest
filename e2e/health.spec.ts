import { test, expect } from "@playwright/test";

/**
 * Health endpoint [P1].
 * Public, unauthenticated liveness probe — returns 200 with a status payload.
 */
test.describe("Health endpoint", () => {
  test("GET /api/health returns 200 ok (no auth)", async ({
    request,
  }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body).toHaveProperty("timestamp");
  });
});
