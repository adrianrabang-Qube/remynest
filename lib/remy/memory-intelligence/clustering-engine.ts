/**
 * Memory Intelligence V2 — CLUSTERING ENGINE (pure, deterministic, data-layer only, NO UI).
 *
 * Identifies event-based memory clusters (wedding / hospital-stay / university / holiday / moving-house /
 * employment / school / family-event / birthday) from keywords. Each memory joins at most ONE cluster type by
 * its strongest keyword match; memories with no event signal are "other". This is a lightweight, deterministic
 * complement to the existing persisted `memory_clusters` (semantic) — it is NOT a rebuild of that system.
 */
import { MEMORY_CLUSTER_TYPES, type MemoryClusterType } from "./config";
import type { MemoryClusterV2, MemoryIntelligenceInput } from "./types";

/** Ordered keyword signals per event cluster type (first strong match wins; order gives priority). */
const CLUSTER_KEYWORDS: readonly { type: MemoryClusterType; keywords: readonly string[] }[] = [
  { type: "wedding", keywords: ["wedding", "married", "marriage", "bride", "groom", "engagement"] },
  { type: "hospital-stay", keywords: ["hospital", "surgery", "operation", "ward", "icu", "admitted", "discharge"] },
  { type: "birthday", keywords: ["birthday", "birth day", "turned ", "bday"] },
  { type: "university", keywords: ["university", "college", "campus", "dorm", "degree", "graduation", "graduated"] },
  { type: "school", keywords: ["school", "classroom", "teacher", "pupil", "primary school", "high school"] },
  { type: "holiday", keywords: ["holiday", "vacation", "trip", "beach", "resort", "cruise", "abroad", "sightseeing"] },
  { type: "moving-house", keywords: ["moved house", "moving house", "new house", "new home", "relocat", "moved to"] },
  { type: "employment", keywords: ["new job", "first job", "started work", "promotion", "hired", "retirement", "retired"] },
  { type: "family-event", keywords: ["reunion", "family gathering", "family event", "christmas", "thanksgiving", "gathering"] },
];

function norm(s: string | null | undefined): string {
  return (s ?? "").toLowerCase();
}

/** The strongest event cluster type for a single memory (deterministic; "other" when no event signal). */
export function clusterTypeForMemory(input: MemoryIntelligenceInput): MemoryClusterType {
  const haystack = [norm(input.title), norm(input.content), norm(input.aiCategory), ...(input.aiTags ?? []).map(norm)]
    .filter(Boolean)
    .join(" ");
  if (!haystack) return "other";

  let best: MemoryClusterType = "other";
  let bestHits = 0;
  for (const { type, keywords } of CLUSTER_KEYWORDS) {
    let hits = 0;
    for (const kw of keywords) if (haystack.includes(kw)) hits++;
    if (hits > bestHits) {
      bestHits = hits;
      best = type;
    }
  }
  return best;
}

/**
 * Group a set of memories into deterministic event clusters. Memories of type "other" are excluded from the
 * cluster list. Clusters are ordered by the fixed `MEMORY_CLUSTER_TYPES` order (stable); memoryIds keep input
 * order. Pure — no IO, no clock.
 */
export function deriveMemoryClusters(inputs: MemoryIntelligenceInput[]): MemoryClusterV2[] {
  const byType = new Map<MemoryClusterType, string[]>();
  for (const input of inputs) {
    const type = clusterTypeForMemory(input);
    if (type === "other") continue;
    const list = byType.get(type);
    if (list) list.push(input.id);
    else byType.set(type, [input.id]);
  }

  const clusters: MemoryClusterV2[] = [];
  for (const type of MEMORY_CLUSTER_TYPES) {
    const memoryIds = byType.get(type);
    if (memoryIds && memoryIds.length > 0) {
      clusters.push({ type, memoryIds, size: memoryIds.length });
    }
  }
  return clusters;
}
