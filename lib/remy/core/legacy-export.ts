/**
 * Remy Platform (v2) — LEGACY EXPORT (pure).
 *
 * Transforms a `LifeSummary` (+ the real memory set) into a flat, structured EXPORT object a future
 * generator (legacy book / PDF) will consume. NO PDF generation, NO rendering, NO clock — a pure
 * data transform. Chapter memories are resolved against the real memory list; missing titles are
 * simply omitted (never fabricated).
 */
import type { DatedMemory, LegacyExport, LifeSummary } from "./family-types";

function yearOf(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : String(d.getFullYear());
}

export function buildLegacyExport(
  summary: LifeSummary,
  memories: DatedMemory[],
  title = "A Life in Memories",
): LegacyExport {
  const byId = new Map(memories.map((m) => [m.id, m]));

  return {
    title,
    timeline: summary.timeline,
    chapters: summary.chapters.map((c) => ({
      title: c.title,
      period:
        yearOf(c.startIso) && yearOf(c.endIso)
          ? `${yearOf(c.startIso)}–${yearOf(c.endIso)}`
          : "",
      memories: c.memoryIds
        .map((id) => byId.get(id))
        .filter((m): m is DatedMemory => Boolean(m))
        .map((m) => ({ title: m.title, dateIso: m.dateIso })),
    })),
    keyPeople: summary.keyPeople.map((p) => ({ name: p.name, memoryCount: p.memoryCount })),
    majorEvents: summary.majorEvents.map((e) => ({ title: e.title, dateIso: e.dateIso })),
  };
}
