import { type Page, expect } from "@playwright/test";

/**
 * Shared helpers + environment accessors for the Phase 1 security tests.
 * No secrets live here — credentials and seeded IDs come from env vars.
 * See .env.test.example for the full list.
 */

export interface Account {
  email: string;
  password: string;
}

export const owner: Account = {
  email: process.env.E2E_OWNER_EMAIL ?? "",
  password: process.env.E2E_OWNER_PASSWORD ?? "",
};

export const caregiver: Account = {
  email: process.env.E2E_CAREGIVER_EMAIL ?? "",
  password: process.env.E2E_CAREGIVER_PASSWORD ?? "",
};

/** A profile the test accounts must NOT be able to access (other tenant). */
export const foreignProfileId =
  process.env.E2E_FOREIGN_PROFILE_ID ?? "";

/** A memory inside a non-shared profile, used for the direct-URL IDOR check. */
export const foreignMemoryId =
  process.env.E2E_FOREIGN_MEMORY_ID ?? "";

export function hasCreds(account: Account): boolean {
  return account.email.length > 0 && account.password.length > 0;
}

/**
 * Log in through the real login form ([app/(auth)/login/LoginClient.tsx]).
 * On success the app redirects to /memories.
 */
export async function login(
  page: Page,
  account: Account
): Promise<void> {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(account.email);
  await page.getByPlaceholder("Password").fill(account.password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/memories/, {
    timeout: 15_000,
  });
}
