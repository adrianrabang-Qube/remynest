/**
 * Remy Platform (v2) — LEGACY ENGINE (pure, NOT AI).
 *
 * Builds a structured, deterministic LIFE SUMMARY from real stored memories + people — timeline,
 * inferred chapters (via the story engine), key people (via the favourite engine), major events
 * (the anchor memory of each chapter), and the most significant memories. No GPT, no fabrication.
 * Consumed by future timeline screens and the legacy export.
 */
import type {
  DatedMemory,
  FamilyPerson,
  LifeSummary,
} from "./family-types";
import { buildChapters } from "./story-engine";
import { rankFavouritePeople } from "./favourite-engine";

export interface LegacyInput {
  memories: DatedMemory[];
  people: FamilyPerson[];
  memoryCount: number;
}

export function buildLifeSummary(input: LegacyInput): LifeSummary {
  const chapters = buildChapters(input.memories);
  const keyPeople = rankFavouritePeople(input.people).slice(0, 8);

  const sorted = input.memories
    .filter((m) => m.dateIso && !Number.isNaN(Date.parse(m.dateIso)))
    .sort((a, b) => Date.parse(a.dateIso) - Date.parse(b.dateIso));

  const byId = new Map(sorted.map((m) => [m.id, m]));
  const majorEvents = chapters
    .map((c) => byId.get(c.memoryIds[0]))
    .filter((m): m is DatedMemory => Boolean(m))
    .map((m) => ({ memoryId: m.id, title: m.title, dateIso: m.dateIso }));

  return {
    timeline: {
      startIso: sorted[0]?.dateIso ?? null,
      endIso: sorted[sorted.length - 1]?.dateIso ?? null,
      memoryCount: input.memoryCount,
    },
    chapters,
    keyPeople,
    majorEvents,
    importantMemories: sorted.slice(0, 12),
  };
}
