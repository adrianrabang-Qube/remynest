import { test, expect } from "@playwright/test";

import {
  canUseSemanticSearch,
  canUseVoiceMemories,
  canCreateCareProfile,
  getUsageLimits,
} from "../lib/billing/usage-limits";

/**
 * Premium entitlement LOGIC tests [P0].
 *
 * Pure-function verification of the entitlement matrix (no browser, no network,
 * no production data). Proves free is blocked and paid tiers are allowed at the
 * guard level, complementing the API-layer enforcement test.
 */

test.describe("Premium entitlement logic [P0]", () => {
  test("semantic search: free blocked, paid allowed", () => {
    expect(canUseSemanticSearch("FREE")).toBe(false);
    expect(canUseSemanticSearch("PREMIUM")).toBe(true);
    expect(canUseSemanticSearch("FAMILY")).toBe(true);
    expect(canUseSemanticSearch("ENTERPRISE")).toBe(true);
  });

  test("voice memories: free blocked, paid allowed", () => {
    expect(canUseVoiceMemories("FREE")).toBe(false);
    expect(canUseVoiceMemories("PREMIUM")).toBe(true);
    expect(canUseVoiceMemories("FAMILY")).toBe(true);
  });

  test("caregiver collaboration: only family / enterprise", () => {
    expect(
      getUsageLimits("FREE").caregiverCollaborationEnabled
    ).toBe(false);
    expect(
      getUsageLimits("PREMIUM").caregiverCollaborationEnabled
    ).toBe(false);
    expect(
      getUsageLimits("FAMILY").caregiverCollaborationEnabled
    ).toBe(true);
    expect(
      getUsageLimits("ENTERPRISE").caregiverCollaborationEnabled
    ).toBe(true);
  });

  test("care profile limits enforced per plan", () => {
    // FREE max 1
    expect(canCreateCareProfile(0, "FREE")).toBe(true);
    expect(canCreateCareProfile(1, "FREE")).toBe(false);
    // PREMIUM max 3
    expect(canCreateCareProfile(2, "PREMIUM")).toBe(true);
    expect(canCreateCareProfile(3, "PREMIUM")).toBe(false);
    // ENTERPRISE unlimited
    expect(canCreateCareProfile(999, "ENTERPRISE")).toBe(true);
  });
});
