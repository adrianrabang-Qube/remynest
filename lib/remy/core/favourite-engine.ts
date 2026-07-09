/**
 * Remy Platform (v2) — FAVOURITE PERSON ENGINE (pure).
 *
 * Ranks the people the family remembers most, from REAL signals: how many memories mention each
 * person (the authoritative `memory_person_links` aggregate), plus optional client-tracked view /
 * search counts (empty until wired — they simply add zero, never fabricated). Pure: the caller
 * supplies all signals; the engine reads no clock/DB. Consumed by the relationship + legacy engines.
 */
import type { FamilyPerson, FavouritePerson } from "./family-types";

const WEIGHT_REMEMBERED = 3;
const WEIGHT_VIEWED = 2;
const WEIGHT_SEARCHED = 1;

export function rankFavouritePeople(
  people: FamilyPerson[],
  viewCounts: Record<string, number> = {},
  searchCounts: Record<string, number> = {},
): FavouritePerson[] {
  return people
    .map((p) => ({
      id: p.id,
      name: p.name,
      memoryCount: p.memoryCount,
      score:
        p.memoryCount * WEIGHT_REMEMBERED +
        (viewCounts[p.id] ?? 0) * WEIGHT_VIEWED +
        (searchCounts[p.id] ?? 0) * WEIGHT_SEARCHED,
    }))
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score || b.memoryCount - a.memoryCount);
}
