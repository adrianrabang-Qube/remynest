import { test as setup } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

import {
  login,
  owner,
  caregiver,
  hasCreds,
} from "./helpers";

/**
 * Auth fixture: logs in the owner and caregiver test accounts once and persists
 * their session as Playwright storageState, reused by the isolation / IDOR tests.
 *
 * If credentials are not provided, an EMPTY storage state is written so the
 * dependent projects can still create a browser context without crashing — the
 * dependent tests themselves self-skip when their env vars are missing.
 */

const AUTH_DIR = path.join(process.cwd(), ".auth");
const OWNER_STATE = path.join(AUTH_DIR, "owner.json");
const CAREGIVER_STATE = path.join(AUTH_DIR, "caregiver.json");
const EMPTY_STATE = JSON.stringify({
  cookies: [],
  origins: [],
});

function ensureAuthDir(): void {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }
}

setup("authenticate owner", async ({ page }) => {
  ensureAuthDir();
  if (!hasCreds(owner)) {
    fs.writeFileSync(OWNER_STATE, EMPTY_STATE);
    setup.skip(
      true,
      "E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD not set — wrote empty owner state"
    );
    return;
  }
  await login(page, owner);
  await page
    .context()
    .storageState({ path: OWNER_STATE });
});

setup("authenticate caregiver", async ({ page }) => {
  ensureAuthDir();
  if (!hasCreds(caregiver)) {
    fs.writeFileSync(CAREGIVER_STATE, EMPTY_STATE);
    setup.skip(
      true,
      "E2E_CAREGIVER_EMAIL / E2E_CAREGIVER_PASSWORD not set — wrote empty caregiver state"
    );
    return;
  }
  await login(page, caregiver);
  await page
    .context()
    .storageState({ path: CAREGIVER_STATE });
});
