/**
 * Remy Platform (v2) — ANNIVERSARY ENGINE (pure).
 *
 * Detects memories whose REAL anniversary is today — only day-precision dates carry a true
 * month-and-day, so month/year/decade-precision memories are skipped (never a fabricated date). The
 * caller supplies "today" (the engine reads no clock). Sorted oldest-first (the most meaningful
 * "N years ago today"). Consumed by the relationship engine / RemyRelationship surface.
 */
import type { Anniversary, DatedMemory } from "./family-types";

export function findAnniversaries(memories: DatedMemory[], todayIso: string): Anniversary[] {
  const today = new Date(todayIso);
  if (Number.isNaN(today.getTime())) return [];
  const tMonth = today.getMonth();
  const tDay = today.getDate();
  const tYear = today.getFullYear();

  const out: Anniversary[] = [];
  for (const m of memories) {
    if (m.precision !== "day") continue; // only a real day gives a real anniversary
    const d = new Date(m.dateIso);
    if (Number.isNaN(d.getTime())) continue;
    if (d.getMonth() === tMonth && d.getDate() === tDay && d.getFullYear() < tYear) {
      out.push({
        memoryId: m.id,
        title: m.title,
        yearsAgo: tYear - d.getFullYear(),
        dateIso: m.dateIso,
      });
    }
  }
  out.sort((a, b) => b.yearsAgo - a.yearsAgo);
  return out;
}
