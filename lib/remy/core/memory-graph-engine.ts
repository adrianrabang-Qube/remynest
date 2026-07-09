/**
 * Remy Platform (v2) — MEMORY GRAPH ENGINE (pure).
 *
 * Individual memories are already understood; this engine understands how they CONNECT. From the
 * `MemoryUnderstanding` layer it builds a deterministic semantic graph: each memory is a node, and
 * an edge joins two memories that share REAL attributes (same person / family / theme / chapter /
 * year / category / event / life stage), weighted deterministically. Clusters group memories by
 * their dominant theme (graph-supported by the same-theme links). NO GPT, NO guessing, NO fabricated
 * links or facts. Internal only — the foundation for future related-memories / journeys /
 * semantic-search / reasoning. PURE: no React/DOM/Supabase/fetch/timers/persistence.
 */
import type {
  ConnectionStrength,
  MemoryCluster,
  MemoryEdge,
  MemoryEdgeType,
  MemoryGraph,
  MemoryNode,
  MemoryTheme,
  MemoryUnderstanding,
} from "./family-types";

/** Minimum weight for an edge to exist (prunes noise — a single weak shared attribute is dropped). */
const MIN_EDGE_WEIGHT = 3;
/** Deterministic cap on total edges (strongest kept) so a shared-hub attribute can't explode output. */
const MAX_EDGES = 2000;
/** Minimum memories for a theme to form a named cluster. */
const MIN_CLUSTER_SIZE = 3;

const THEME_CLUSTER_LABEL: Record<MemoryTheme, string> = {
  family: "Family Memories",
  travel: "Travel",
  celebration: "Celebrations",
  achievement: "Achievements",
  health: "Medical Journey",
  pets: "Pet Memories",
  home: "Home Life",
  work: "Work Life",
  education: "School Years",
  friendship: "Friendships",
  care: "Care Journey",
  relationships: "Relationships",
  other: "Other Memories",
};

function peopleOf(u: MemoryUnderstanding): string[] {
  const r = u.relationship;
  return r.primaryPerson ? [r.primaryPerson, ...r.secondaryPeople] : [...r.secondaryPeople];
}

function decadeOf(year: number): number {
  return Math.floor(year / 10) * 10;
}

function strengthOf(weight: number): ConnectionStrength {
  if (weight >= 12) return "strong";
  if (weight >= 6) return "moderate";
  return "weak";
}

interface NodeInfo {
  id: string;
  people: string[];
  peopleSet: Set<string>;
  themes: MemoryTheme[];
  themeSet: Set<MemoryTheme>;
  category: string | null;
  event: string | null;
  year: number;
  decade: number;
  lifeStage: MemoryUnderstanding["lifeStage"];
  isFamily: boolean;
}

export function buildMemoryGraph(understandings: MemoryUnderstanding[]): MemoryGraph {
  const nodes: MemoryNode[] = understandings.map((u) => ({
    id: u.id,
    year: u.timeSpan.year,
    primaryPerson: u.relationship.primaryPerson,
    themes: u.themes,
    importance: u.importance,
    lifeStage: u.lifeStage,
  }));

  const info: NodeInfo[] = understandings.map((u) => {
    const people = peopleOf(u);
    return {
      id: u.id,
      people,
      peopleSet: new Set(people),
      themes: u.themes,
      themeSet: new Set(u.themes),
      category: u.dominantCategories[0] ?? null,
      event: u.eventType,
      year: u.timeSpan.year,
      decade: u.timeSpan.year ? decadeOf(u.timeSpan.year) : 0,
      lifeStage: u.lifeStage,
      isFamily: u.relationship.isFamilyMemory,
    };
  });

  const edges: MemoryEdge[] = [];
  for (let i = 0; i < info.length; i++) {
    const a = info[i];
    for (let j = i + 1; j < info.length; j++) {
      const b = info[j];
      const types: MemoryEdgeType[] = [];
      let weight = 0;

      const sharedPeople = a.people.filter((p) => b.peopleSet.has(p));
      if (sharedPeople.length > 0) {
        types.push("same-person");
        weight += Math.min(12, sharedPeople.length * 4);
        if (a.isFamily && b.isFamily) {
          types.push("same-family");
          weight += 2;
        }
      }
      const eventMatch = a.event != null && a.event === b.event;
      if (eventMatch) {
        types.push("same-event");
        weight += 3;
      }
      if (a.themes.some((t) => b.themeSet.has(t))) {
        types.push("same-theme");
        weight += 2;
      }
      if (a.year && b.year && a.year === b.year) {
        types.push("same-year");
        weight += 2;
      } else if (a.decade && a.decade === b.decade) {
        types.push("same-chapter");
        weight += 1;
      }
      // Count the category only when it isn't already captured by the (currently category-derived)
      // event, so a single shared category is never double-weighted.
      if (
        a.category &&
        b.category &&
        a.category === b.category &&
        !(eventMatch && a.event === a.category)
      ) {
        types.push("same-category");
        weight += 1;
      }
      if (a.lifeStage !== "unknown" && a.lifeStage === b.lifeStage) {
        types.push("same-life-stage");
        weight += 2;
      }

      if (weight >= MIN_EDGE_WEIGHT && types.length > 0) {
        edges.push({ source: a.id, target: b.id, types, weight, strength: strengthOf(weight) });
      }
    }
  }

  // Deterministic bound: strongest first (stable tiebreak by ids), capped.
  edges.sort((x, y) => {
    if (y.weight !== x.weight) return y.weight - x.weight;
    if (x.source !== y.source) return x.source < y.source ? -1 : 1;
    return x.target < y.target ? -1 : x.target > y.target ? 1 : 0;
  });
  const cappedEdges = edges.slice(0, MAX_EDGES);

  // Clusters: memories grouped by their dominant (first) theme — supported by the same-theme links.
  const byTheme = new Map<MemoryTheme, string[]>();
  for (const u of understandings) {
    const theme = u.themes[0];
    if (!theme || theme === "other") continue;
    const list = byTheme.get(theme);
    if (list) list.push(u.id);
    else byTheme.set(theme, [u.id]);
  }
  const clusters: MemoryCluster[] = [];
  for (const [theme, memoryIds] of byTheme) {
    if (memoryIds.length >= MIN_CLUSTER_SIZE) {
      clusters.push({ id: `theme-${theme}`, label: THEME_CLUSTER_LABEL[theme], theme, memoryIds });
    }
  }
  clusters.sort((x, y) => y.memoryIds.length - x.memoryIds.length || (x.id < y.id ? -1 : 1));

  return { nodes, edges: cappedEdges, clusters };
}
