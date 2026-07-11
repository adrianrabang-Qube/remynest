/**
 * Memory Intelligence V2 — RELATIONSHIP WEIGHTING (pure).
 *
 * Important people naturally lift the ranking of their related memories. A person's free-text `people.role`
 * is normalised to a relationship tier (high/medium/low/unknown) via the SINGLE `RELATIONSHIP_WEIGHTS` config;
 * a memory's relationship weight is the strongest tier over its linked people, gently boosted by that person's
 * existing relationshipStrength. Deterministic; no IO.
 */
import { RELATIONSHIP_WEIGHTS, RELATIONSHIP_TIER_VALUE, type RelationshipTier } from "./config";
import type { MemoryIntelligenceInput, RelationshipWeighting } from "./types";

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Normalise a free-text role to a lookup key (lowercase, first alnum word). */
export function normalizeRole(role: string | null | undefined): string {
  const cleaned = (role ?? "").toLowerCase().replace(/[^a-z ]/g, " ").trim();
  if (!cleaned) return "";
  // Prefer a known multi/first word (e.g. "my wife" → "wife").
  for (const word of cleaned.split(/\s+/)) {
    if (RELATIONSHIP_WEIGHTS[word]) return word;
  }
  return cleaned.split(/\s+/)[0] ?? "";
}

/** The relationship tier for a role string (unknown roles → "unknown"). */
export function relationshipTierForRole(role: string | null | undefined): RelationshipTier {
  const key = normalizeRole(role);
  return RELATIONSHIP_WEIGHTS[key] ?? "unknown";
}

/**
 * Compute the relationship weighting for a memory from its linked people. Uses the STRONGEST tier value, then
 * nudges it toward 1 by the dominant person's relationshipStrength (0..1). Returns the tier, a 0..1 weight, and
 * the dominant person id. A memory with no people → unknown tier at the neutral value.
 */
export function computeRelationshipWeighting(
  people: MemoryIntelligenceInput["people"],
): RelationshipWeighting {
  const list = people ?? [];
  if (list.length === 0) {
    return { tier: "unknown", weight: RELATIONSHIP_TIER_VALUE.unknown, dominantPersonId: null };
  }

  let bestTier: RelationshipTier = "unknown";
  let bestValue = -1;
  let dominantPersonId: string | null = null;
  let dominantStrength = 0;

  for (const person of list) {
    const tier = relationshipTierForRole(person.role);
    const value = RELATIONSHIP_TIER_VALUE[tier];
    const strength = clamp01(person.relationshipStrength ?? 0);
    // Rank by tier value first, then by relationship strength as a tiebreaker.
    if (value > bestValue || (value === bestValue && strength > dominantStrength)) {
      bestTier = tier;
      bestValue = value;
      dominantPersonId = person.id;
      dominantStrength = strength;
    }
  }

  // Blend: the tier sets the base; the dominant person's strength lifts it up to 15% toward 1.
  const weight = clamp01(bestValue + (1 - bestValue) * 0.15 * dominantStrength);
  return { tier: bestTier, weight, dominantPersonId };
}
