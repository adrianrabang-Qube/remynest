/**
 * Remy Platform (v2) — PERSONALITY ENGINE (pure).
 *
 * Turns real, long-term signals into behavioural TRAITS about how a family remembers — Family
 * Historian, Memory Guardian, Story Teller, Legacy Builder, Care Champion, Photo Collector, Daily
 * Rememberer, Occasional Visitor. Remy never exposes the raw scores behind these; only the traits
 * (behaviours) surface. Pure: no React/DOM/DB/timers/clock — the caller supplies every signal.
 */
import type { PersonalitySignals, PersonalityTrait } from "./family-types";

export function derivePersonalityTraits(s: PersonalitySignals): PersonalityTrait[] {
  const traits: PersonalityTrait[] = [];

  if (s.datedRatio >= 0.4 && s.memoryCount >= 20) traits.push("family-historian");
  if (s.memoryPreservation >= 70 && s.memoryCount >= 30) traits.push("memory-guardian");
  if (s.chapterCount >= 4) traits.push("story-teller");
  if (s.memoryCount >= 100 && s.chapterCount >= 3) traits.push("legacy-builder");
  if (s.isCareWorkspace && s.daysSinceLastVisit != null && s.daysSinceLastVisit <= 2) {
    traits.push("care-champion");
  }
  if (s.attachmentRatio >= 0.6 && s.memoryCount >= 15) traits.push("photo-collector");

  // Cadence — mutually exclusive endpoints.
  if (s.daysSinceLastVisit != null && s.daysSinceLastVisit <= 1) {
    traits.push("daily-rememberer");
  } else if (s.daysSinceLastVisit != null && s.daysSinceLastVisit >= 7) {
    traits.push("occasional-visitor");
  }

  return traits;
}
