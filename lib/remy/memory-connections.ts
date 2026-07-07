import type { createClient } from "@/utils/supabase/server";
import { getMemoryStats } from "@/lib/remy/memory-graph";
import { getRelationshipDataset } from "@/lib/remy/relationship-intelligence";

/**
 * Milestone B+ — MEMORY ↔ MEMORY intelligence (SERVER ONLY, read-only, deterministic).
 *
 * Builds a memory connection graph from EXISTING data — shared people (memory_person_links),
 * shared category, shared tags, shared year/decade — then derives, PURELY: the related memories
 * for a memory (+ why + score), memory importance, and centrality (hub / bridge / connected /
 * isolated). NO new AI, NO embeddings, NO new retrieval engine; it reuses the workspace+owner
 * scoped datasets (getMemoryStats + getRelationshipDataset) already in the codebase, via
 * inverted indexes so it is bounded (never N^2). Complements memory-graph.ts (aggregate) and
 * relationship-intelligence.ts (people). Nothing is inferred beyond stored data → no hallucination.
 */
type RemySupabase = Awaited<ReturnType<typeof createClient>>;

/** A shared attribute in a bucket larger than this is too common to be a MEANINGFUL link. */
const COMMON_BUCKET_CAP = 150;

/** Connection-weight per shared attribute (people are the strongest signal). */
const W_PERSON = 3;
const W_TAG = 1.5;
const W_CATEGORY = 1;
const W_YEAR = 1;
const W_DECADE = 0.5;

export interface MemoryNode {
  id: string;
  title: string;
  date: string | null;
  category: string | null;
  tags: string[];
  people: string[];
  year: number | null;
  decade: number | null;
}

export interface MemoryConnectionGraph {
  nodes: Map<string, MemoryNode>;
  order: string[]; // stable id order (for deterministic iteration)
  byPerson: Map<string, string[]>;
  byCategory: Map<string, string[]>;
  byTag: Map<string, string[]>;
  byYear: Map<number, string[]>;
  byDecade: Map<number, string[]>;
}

export interface RelatedMemory {
  id: string;
  title: string;
  date: string | null;
  score: number;
  reasons: string[];
}

export interface MemoryImportance {
  id: string;
  title: string;
  date: string | null;
  score: number;
  degree: number;
  centrality: "hub" | "bridge" | "connected" | "isolated";
  reasons: string[];
}

function yearOf(date: string | null): number | null {
  if (!date) return null;
  // Timezone-safe: take the leading YYYY of an ISO/date-only string so "2020-01-01" never shifts a
  // day (and thus a year/decade bucket) under a non-UTC runtime. Fall back to a UTC parse otherwise.
  const iso = /^(\d{4})-\d{2}/.exec(date);
  const y = iso ? Number(iso[1]) : new Date(date).getUTCFullYear();
  return Number.isNaN(y) ? null : y;
}

function pushIndex<K>(map: Map<K, string[]>, key: K, id: string): void {
  const list = map.get(key);
  if (list) list.push(id);
  else map.set(key, [id]);
}

/** Fetch + assemble the memory connection graph. ONE getMemoryStats + ONE relationship dataset. */
export async function buildMemoryConnectionGraph(
  supabase: RemySupabase,
  ownerAccountId: string,
  memoryProfileId: string | null,
): Promise<MemoryConnectionGraph> {
  const [stats, dataset] = await Promise.all([
    getMemoryStats(supabase, ownerAccountId, memoryProfileId),
    getRelationshipDataset(supabase, ownerAccountId, memoryProfileId),
  ]);

  // memory id -> person ids (from the workspace-scoped person links).
  const peopleByMemory = new Map<string, string[]>();
  for (const link of dataset.links) pushIndex(peopleByMemory, link.memoryId, link.personId);

  const nodes = new Map<string, MemoryNode>();
  const byPerson = new Map<string, string[]>();
  const byCategory = new Map<string, string[]>();
  const byTag = new Map<string, string[]>();
  const byYear = new Map<number, string[]>();
  const byDecade = new Map<number, string[]>();

  for (const s of stats) {
    const year = yearOf(s.date);
    const decade = year != null ? Math.floor(year / 10) * 10 : null;
    const category = (s.category ?? "").trim().toLowerCase() || null;
    // Dedupe so a duplicated tag/person cannot double-count a single shared signal or
    // double-walk its bucket (byTag/byPerson below already dedupe via the Set).
    const tags = [...new Set(s.tags.map((t) => (t ?? "").trim().toLowerCase()).filter(Boolean))];
    const people = [...new Set(peopleByMemory.get(s.id) ?? [])];
    nodes.set(s.id, {
      id: s.id,
      title: s.title ?? "Untitled memory",
      date: s.date,
      category,
      tags,
      people,
      year,
      decade,
    });
    for (const p of people) pushIndex(byPerson, p, s.id);
    if (category) pushIndex(byCategory, category, s.id);
    for (const t of new Set(tags)) pushIndex(byTag, t, s.id);
    if (year != null) pushIndex(byYear, year, s.id);
    if (decade != null) pushIndex(byDecade, decade, s.id);
  }

  const order = [...nodes.keys()].sort();
  return { nodes, order, byPerson, byCategory, byTag, byYear, byDecade };
}

/** Only count links from buckets small enough to be meaningful (skip mega-common attributes). */
function meaningfulBucket(list: string[] | undefined): string[] | null {
  if (!list || list.length <= 1 || list.length > COMMON_BUCKET_CAP) return null;
  return list;
}

/**
 * ALL scored connections for one memory, UNSORTED. Pure. This is the shared core:
 * `scoredConnections` sorts it (for ordered consumers like relatedMemories), while
 * `importanceRanking` consumes it order-independently (degree + connected metadata only),
 * so it never pays for the sort.
 */
function computeConnections(
  graph: MemoryConnectionGraph,
  memoryId: string,
): RelatedMemory[] {
  const node = graph.nodes.get(memoryId);
  if (!node) return [];

  // Accumulate per-candidate shared signals.
  const shared = new Map<
    string,
    { people: number; tags: number; category: boolean; year: boolean; decade: boolean }
  >();
  const bump = (id: string, key: "people" | "tags", by = 1) => {
    if (id === memoryId) return;
    const s = shared.get(id) ?? { people: 0, tags: 0, category: false, year: false, decade: false };
    s[key] += by;
    shared.set(id, s);
  };
  const flag = (id: string, key: "category" | "year" | "decade") => {
    if (id === memoryId) return;
    const s = shared.get(id) ?? { people: 0, tags: 0, category: false, year: false, decade: false };
    s[key] = true;
    shared.set(id, s);
  };

  for (const p of node.people) for (const id of meaningfulBucket(graph.byPerson.get(p)) ?? []) bump(id, "people");
  for (const t of node.tags) for (const id of meaningfulBucket(graph.byTag.get(t)) ?? []) bump(id, "tags");
  if (node.category) for (const id of meaningfulBucket(graph.byCategory.get(node.category)) ?? []) flag(id, "category");
  if (node.year != null) for (const id of meaningfulBucket(graph.byYear.get(node.year)) ?? []) flag(id, "year");
  // Decade is gated by the SAME commonness cap as every other signal — so a memory in a
  // decade that dominates the library doesn't accrue a phantom +0.5 to every connection, and a
  // same-year pair whose (large) year bucket was skipped isn't mislabeled "same decade".
  if (node.decade != null) for (const id of meaningfulBucket(graph.byDecade.get(node.decade)) ?? []) flag(id, "decade");

  const out: RelatedMemory[] = [];
  for (const [id, s] of shared) {
    const other = graph.nodes.get(id);
    if (!other) continue;
    // Prefer the more precise "same year"; only credit decade when it's a distinct (non-common)
    // decade bucket AND the pair isn't already same-year.
    const sameDecade = s.decade && !s.year;
    const score =
      W_PERSON * s.people +
      W_TAG * s.tags +
      (s.category ? W_CATEGORY : 0) +
      (s.year ? W_YEAR : 0) +
      (sameDecade ? W_DECADE : 0);
    if (score <= 0) continue;
    const reasons: string[] = [];
    if (s.people) reasons.push(`${s.people} shared ${s.people === 1 ? "person" : "people"}`);
    if (s.tags) reasons.push(`${s.tags} shared ${s.tags === 1 ? "tag" : "tags"}`);
    if (s.category && node.category) reasons.push(`same theme (${node.category})`);
    if (s.year && node.year != null) reasons.push(`same year (${node.year})`);
    else if (sameDecade && node.decade != null) reasons.push(`same decade (${node.decade}s)`);
    out.push({ id, title: other.title, date: other.date, score, reasons });
  }
  return out;
}

/** ALL scored connections for one memory (SORTED, uncapped). Pure. */
export function scoredConnections(
  graph: MemoryConnectionGraph,
  memoryId: string,
): RelatedMemory[] {
  const out = computeConnections(graph, memoryId);
  out.sort((a, b) => b.score - a.score || (b.date ?? "").localeCompare(a.date ?? "") || a.id.localeCompare(b.id));
  return out;
}

/** The related memories for one memory, with WHY + a deterministic score. Pure. */
export function relatedMemories(
  graph: MemoryConnectionGraph,
  memoryId: string,
  limit = 6,
): RelatedMemory[] {
  return scoredConnections(graph, memoryId).slice(0, limit);
}

function recencyBoost(date: string | null, now: number): number {
  if (!date) return 0;
  const ts = new Date(date).getTime();
  if (Number.isNaN(ts)) return 0;
  const ageDays = Math.max(0, (now - ts) / 86_400_000);
  return Math.pow(0.5, ageDays / 1825); // 5-year half-life, matches the people graph
}

/**
 * Deterministic memory importance + centrality. Importance blends connection degree, people
 * involved, and recency; centrality is derived from degree + whether a memory bridges themes/eras.
 * Pure (except the injected `now`). Explained per memory.
 */
export function importanceRanking(
  graph: MemoryConnectionGraph,
  now: number = Date.now(),
): MemoryImportance[] {
  // Compute each memory's connections ONCE, then derive degree/centrality/importance from it.
  // Uses the UNSORTED core — the ranking reads degree + connected metadata order-independently,
  // so it skips N per-node sorts (the largest avoidable cost on this path).
  const connections = new Map<string, RelatedMemory[]>();
  let maxDeg = 1;
  for (const id of graph.order) {
    const conn = computeConnections(graph, id);
    connections.set(id, conn);
    if (conn.length > maxDeg) maxDeg = conn.length;
  }
  const hubThreshold = Math.max(3, Math.ceil(maxDeg * 0.6));

  const out: MemoryImportance[] = [];
  for (const id of graph.order) {
    const node = graph.nodes.get(id)!;
    const related = connections.get(id) ?? [];
    const degree = related.length;

    // A memory "bridges" when its connections span multiple themes or multiple decades.
    const themes = new Set<string>();
    const decades = new Set<number>();
    for (const r of related) {
      const rn = graph.nodes.get(r.id);
      if (rn?.category) themes.add(rn.category);
      if (rn?.decade != null) decades.add(rn.decade);
    }
    if (node.category) themes.add(node.category);
    if (node.decade != null) decades.add(node.decade);
    const bridges = degree >= 2 && (themes.size >= 3 || decades.size >= 3);

    const centrality: MemoryImportance["centrality"] =
      degree === 0 ? "isolated" : degree >= hubThreshold ? "hub" : bridges ? "bridge" : "connected";

    const score =
      0.5 * (degree / maxDeg) +
      0.3 * Math.min(1, node.people.length / 3) +
      0.2 * recencyBoost(node.date, now);

    const reasons: string[] = [];
    if (degree > 0) reasons.push(`connected to ${degree} ${degree === 1 ? "memory" : "memories"}`);
    if (node.people.length > 0) reasons.push(`${node.people.length} ${node.people.length === 1 ? "person" : "people"}`);
    if (centrality === "hub") reasons.push("a hub in your memories");
    else if (centrality === "bridge") reasons.push("bridges different themes/periods");
    else if (centrality === "isolated") reasons.push("stands on its own");

    out.push({ id, title: node.title, date: node.date, score, degree, centrality, reasons });
  }
  out.sort((a, b) => b.score - a.score || b.degree - a.degree || a.id.localeCompare(b.id));
  return out;
}

// ---------------------------------------------------------------------------
// Ask Remy integration — deterministic answers for memory-centrality questions.
// ---------------------------------------------------------------------------
export type MemoryIntelIntent = "important" | "isolated" | "hub" | null;

// The centrality adjective must DIRECTLY qualify "memor(y|ies)" (forward) or the memory noun must
// be directly described as isolated/connected (reverse). This deliberately does NOT use a loose
// `.*` gap: "what are the key people in my memories?" must fall through to the grounded LLM path,
// not be hijacked into a memory-centrality ranking just because it contains a common adjective and
// the substring "memor". Reverse forms cover natural phrasings ("memories that stand on their own").
const RE_ISOLATED =
  /\b(isolated|standalone|unconnected|disconnected|orphan(?:ed)?)\s+memor|\bmemor\w*\s+(?:that\s+)?(?:are\s+|stand\s+)?(?:on their own|by themselves|alone|isolated|unconnected|disconnected)\b/;
const RE_HUB =
  /\b(?:most\s+)?(connected|hub|bridge)\s+memor|\bmemor\w*\s+(?:(?:that\s+)?are\s+)?most connected\b/;
const RE_IMPORTANT =
  /\b(?:most\s+)?(important|significant|key|meaningful|central|pivotal)\s+memor|\bmemor\w*\s+(?:that\s+)?(?:are\s+)?(?:most\s+)?(important|significant|key|meaningful|central|pivotal)\b/;

// A memory-centrality answer ranks across ALL memories, so it must only fire for a "bare" centrality
// request. If the query carries an extra constraint — a content noun ("...from my wedding"), a
// date/number, or a qualifier retrieval would use — we DEFER to the grounded retrieval/LLM path so
// the user's filter isn't silently dropped. Erring toward defer is safe: it degrades to a grounded
// answer, never to a wrong one.
const CENTRALITY_FILLER = new Set([
  "a", "an", "the", "my", "mine", "me", "i", "you", "your", "our", "we", "us", "it",
  "what", "whats", "which", "who", "how", "do", "does", "are", "is", "was", "were", "has", "have", "had",
  "can", "could", "would", "will", "should",
  "show", "list", "find", "tell", "give", "see", "view", "display", "get", "please", "remy", "about",
  "most", "all", "some", "any", "more", "top",
  "memory", "memories", "memor", "ones", "entries", "entry",
  "of", "and", "or", "that", "to",
  "on", "their", "own", "by", "themselves", "alone", "stand", "stands", "standing", "together",
  // centrality vocabulary (the matched keywords themselves)
  "important", "significant", "key", "meaningful", "central", "pivotal",
  "isolated", "standalone", "unconnected", "disconnected", "orphan", "orphaned",
  "connected", "connection", "connections", "hub", "hubs", "bridge", "bridges",
]);

function isBareCentralityQuery(q: string): boolean {
  if (/\d/.test(q)) return false; // a number (year, count, …) is a content/time constraint
  // Drop apostrophes first so contractions ("what's", "who's") don't split into a stray "s" token
  // that would wrongly defer an otherwise-bare request.
  const tokens = q.replace(/['’]/g, "").split(/[^a-z]+/).filter(Boolean);
  return tokens.length > 0 && tokens.every((t) => CENTRALITY_FILLER.has(t));
}

export function detectMemoryIntelIntent(query: string): MemoryIntelIntent {
  const q = (query ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!q) return null;
  let intent: MemoryIntelIntent = null;
  if (RE_ISOLATED.test(q)) intent = "isolated";
  else if (RE_HUB.test(q)) intent = "hub";
  else if (RE_IMPORTANT.test(q)) intent = "important";
  // Only answer with the GLOBAL ranking when the query is a bare centrality request (no extra
  // constraint the user expects us to honour).
  return intent && isBareCentralityQuery(q) ? intent : null;
}

export interface MemoryIntelAnswer {
  text: string;
  memories: { memoryId: string; title: string | null; memoryDate: string | null }[];
  importance: MemoryImportance[];
}

/** Deterministic answer for "show important / isolated / most-connected memories". Read-only. */
export async function answerMemoryIntel(
  supabase: RemySupabase,
  intent: NonNullable<MemoryIntelIntent>,
  ownerAccountId: string,
  memoryProfileId: string | null,
  now: number = Date.now(),
): Promise<MemoryIntelAnswer> {
  const graph = await buildMemoryConnectionGraph(supabase, ownerAccountId, memoryProfileId);
  if (graph.nodes.size === 0) {
    return { text: "I don't have enough memories yet to map how they connect.", memories: [], importance: [] };
  }
  const ranking = importanceRanking(graph, now);

  let picked: MemoryImportance[];
  let lead: string;
  if (intent === "isolated") {
    picked = ranking.filter((m) => m.centrality === "isolated").slice(0, 8);
    // "isolated" = no DISTINCTIVE link (a very common attribute is intentionally not counted as a
    // link), so we don't assert an absolute "no shared person/theme/year" — a picked memory may
    // still sit in a big, non-distinctive bucket.
    lead = picked.length
      ? "Memories with no distinctive links to your others yet:"
      : "Every memory you've recorded shares something with at least one other.";
  } else if (intent === "hub") {
    // "Most connected" = a true DEGREE ranking (any memory with links, top-degree first). We do NOT
    // filter to the hub/bridge centrality labels here — that would hide a higher-degree "connected"
    // memory behind a lower-degree "bridge" under a heading that promises the most-connected ones.
    picked = ranking
      .filter((m) => m.degree > 0)
      .sort((a, b) => b.degree - a.degree || b.score - a.score || a.id.localeCompare(b.id))
      .slice(0, 8);
    lead = picked.length
      ? "Your most connected memories — the hubs your other memories cluster around:"
      : "None of your memories link to others yet.";
  } else {
    picked = ranking.slice(0, 8);
    // Describe the RANKING METHOD, not each pick's attributes (a small library's top picks may
    // have few links / no people).
    lead = "Your most central memories — ranked by how they connect to others, who's in them, and how recent they are:";
  }

  const memories = picked.map((m) => ({ memoryId: m.id, title: m.title, memoryDate: m.date }));
  const examples = picked
    .slice(0, 3)
    .map((m) => `"${m.title}"`)
    .join(", ");
  return {
    text: picked.length ? `${lead} for example ${examples}.` : lead,
    memories,
    importance: picked,
  };
}
