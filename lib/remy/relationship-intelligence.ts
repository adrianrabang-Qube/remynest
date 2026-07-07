import type { createClient } from "@/utils/supabase/server";

/**
 * Phase C5 — Relationship Intelligence Foundation (SERVER ONLY, read-only).
 *
 * Derives relationship signals from EXISTING data only — `people`,
 * `memory_person_links`, `memories` — with NO new extraction, embeddings, schema,
 * AI, graph, or persistence. Pattern: fetch a workspace+owner-scoped dataset once
 * (the IO), then compute every metric with PURE, unit-testable derivations.
 *
 * Safety: every query is owner-scoped (created_by_account_id / user_id = auth.uid())
 * AND workspace-scoped (memory_profile_id, NULL = My Nest); runs as the AUTHENTICATED
 * OWNER (the caller's createClient), never the service role; metrics are factual
 * counts/dates only — no sentiment, no psychological profiling, no inference.
 *
 * `createClient` is imported type-only (erased) so the metric functions take the
 * caller's `supabase` and this module stays pure-importable for tests.
 */
type RemySupabase = Awaited<ReturnType<typeof createClient>>;

const PEOPLE_CAP = 500;
const LINK_CAP = 5000;
const MEMORY_CAP = 5000;

/** Relationship-strength weights + saturation/recency constants (documented formula). */
export const STRENGTH_W_MENTION = 0.5;
export const STRENGTH_W_RECENCY = 0.2;
export const STRENGTH_W_COOCCUR = 0.3;
const STRENGTH_SATURATION = 5; // count/(count+5): 5 mentions ≈ 0.5
const RECENCY_HALF_LIFE_DAYS = 1825; // 5 years

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface PersonInfo {
  id: string;
  displayName: string;
  role: string | null;
}
export interface PersonLink {
  personId: string;
  memoryId: string;
}
export interface MemoryMeta {
  id: string;
  memoryDate: string | null;
  title: string | null;
  category: string | null;
  tags: string[];
}
export interface RelationshipDataset {
  people: Map<string, PersonInfo>;
  links: PersonLink[]; // already filtered to in-workspace, owner-scoped memories
  memories: Map<string, MemoryMeta>;
}

export interface PersonMetric {
  personId: string;
  displayName: string;
  role: string | null;
  mentionCount: number;
  firstMentionDate: string | null;
  latestMentionDate: string | null;
  coOccurrenceTotal: number;
  relationshipStrength: number;
}

export interface CoOccurrence {
  personId: string;
  displayName: string;
  count: number;
}

export interface PersonTimeline {
  personId: string;
  displayName: string;
  firstMentionDate: string | null;
  latestMentionDate: string | null;
  totalMentionCount: number;
  memories: { memoryId: string; title: string | null; memoryDate: string | null }[];
}

export interface PersonRelationshipContext {
  metric: PersonMetric | null;
  timeline: PersonTimeline | null;
  strongestCoOccurrences: CoOccurrence[];
  recentMemories: { memoryId: string; title: string | null; memoryDate: string | null }[];
  /** Recurring themes (categories/tags) across this person's memories. */
  topThemes: string[];
  /** Number of distinct decades this person's memories span ("life periods"). */
  periodCount: number;
}

// ---------------------------------------------------------------------------
// IO — fetch the workspace+owner-scoped dataset (the only DB access)
// ---------------------------------------------------------------------------
export async function getRelationshipDataset(
  supabase: RemySupabase,
  ownerAccountId: string,
  memoryProfileId: string | null,
): Promise<RelationshipDataset> {
  const empty: RelationshipDataset = { people: new Map(), links: [], memories: new Map() };

  let pq = supabase
    .from("people")
    .select("id, display_name, role")
    .eq("created_by_account_id", ownerAccountId)
    .eq("status", "active")
    .limit(PEOPLE_CAP);
  pq = memoryProfileId ? pq.eq("memory_profile_id", memoryProfileId) : pq.is("memory_profile_id", null);
  const { data: peopleRows } = await pq;

  const people = new Map<string, PersonInfo>();
  for (const r of (peopleRows ?? []) as { id: string; display_name: string; role: string | null }[]) {
    people.set(r.id, { id: r.id, displayName: r.display_name, role: r.role ?? null });
  }
  const personIds = [...people.keys()];
  if (personIds.length === 0) return empty;

  const { data: linkRows } = await supabase
    .from("memory_person_links")
    .select("person_id, memory_id")
    .in("person_id", personIds)
    .limit(LINK_CAP);
  const rawLinks = ((linkRows ?? []) as { person_id?: string; memory_id?: string }[])
    .filter((l) => l.person_id && l.memory_id)
    .map((l) => ({ personId: l.person_id as string, memoryId: l.memory_id as string }));

  const memoryIds = [...new Set(rawLinks.map((l) => l.memoryId))];
  if (memoryIds.length === 0) return { people, links: [], memories: new Map() };

  let mq = supabase
    .from("memories")
    .select("id, memory_date, title, ai_title, ai_category, ai_tags")
    .eq("user_id", ownerAccountId)
    .in("id", memoryIds)
    .limit(MEMORY_CAP);
  mq = memoryProfileId ? mq.eq("memory_profile_id", memoryProfileId) : mq.is("memory_profile_id", null);
  const { data: memRows } = await mq;

  const memories = new Map<string, MemoryMeta>();
  for (const r of (memRows ?? []) as {
    id: string;
    memory_date: string | null;
    title: string | null;
    ai_title: string | null;
    ai_category: string | null;
    ai_tags: string[] | null;
  }[]) {
    memories.set(r.id, {
      id: r.id,
      memoryDate: r.memory_date ?? null,
      title: r.ai_title || r.title || null,
      category: r.ai_category ?? null,
      tags: Array.isArray(r.ai_tags) ? r.ai_tags : [],
    });
  }

  // DEFENSE: keep only links whose memory passed the owner+workspace memory fetch,
  // so every derived metric uses in-workspace, owner-scoped memories only.
  const valid = new Set(memories.keys());
  const links = rawLinks.filter((l) => valid.has(l.memoryId));
  return { people, links, memories };
}

// ---------------------------------------------------------------------------
// Pure derivations (no IO) — unit-testable
// ---------------------------------------------------------------------------
function recencyFromDate(iso: string | null, now: number): number {
  if (!iso) return 0;
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return 0;
  const ageDays = (now - ts) / 86_400_000;
  if (ageDays <= 0) return 1;
  return Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);
}

function saturate(count: number): number {
  return count <= 0 ? 0 : count / (count + STRENGTH_SATURATION);
}

/**
 * Deterministic, explainable relationship strength (no AI):
 *   strength = 0.5*saturate(mentionCount) + 0.2*recency(latestMention) + 0.3*saturate(coOccurrenceTotal)
 * where saturate(n) = n/(n+5) ∈ [0,1) and recency = 0.5^(ageDays/1825) ∈ [0,1].
 */
export function relationshipStrength(
  input: { mentionCount: number; latestMentionDate: string | null; coOccurrenceTotal: number },
  now: number = Date.now(),
): number {
  return (
    STRENGTH_W_MENTION * saturate(input.mentionCount) +
    STRENGTH_W_RECENCY * recencyFromDate(input.latestMentionDate, now) +
    STRENGTH_W_COOCCUR * saturate(input.coOccurrenceTotal)
  );
}

/**
 * Co-occurrence counts over the dataset's links. Returns canonical "a|b" (a<b)
 * pair keys → count of distinct memories both appear in. Self-pairs excluded;
 * duplicate pairs removed (canonical ordering + per-memory distinct persons). Pure.
 */
export function deriveCoOccurrences(links: PersonLink[]): Map<string, number> {
  const byMemory = new Map<string, Set<string>>();
  for (const l of links) {
    let set = byMemory.get(l.memoryId);
    if (!set) byMemory.set(l.memoryId, (set = new Set()));
    set.add(l.personId);
  }
  const pairs = new Map<string, number>();
  for (const set of byMemory.values()) {
    const ids = [...set].sort();
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = `${ids[i]}|${ids[j]}`;
        pairs.set(key, (pairs.get(key) ?? 0) + 1);
      }
    }
  }
  return pairs;
}

/** Per-person co-occurrence total (sum over pairs involving the person). Pure. */
export function coOccurrenceTotals(pairs: Map<string, number>): Map<string, number> {
  const totals = new Map<string, number>();
  for (const [key, count] of pairs) {
    const [a, b] = key.split("|");
    totals.set(a, (totals.get(a) ?? 0) + count);
    totals.set(b, (totals.get(b) ?? 0) + count);
  }
  return totals;
}

/** Build per-person metrics from the dataset. Pure. */
export function derivePersonMetrics(
  dataset: RelationshipDataset,
  now: number = Date.now(),
): PersonMetric[] {
  // Count DISTINCT memories per person (defensive: correct even if a duplicate
  // link row ever existed — not solely reliant on the DB unique(memory_id,person_id)).
  const memoriesByPerson = new Map<string, Set<string>>();
  const firstDate = new Map<string, string | null>();
  const lastDate = new Map<string, string | null>();
  for (const l of dataset.links) {
    let mset = memoriesByPerson.get(l.personId);
    if (!mset) memoriesByPerson.set(l.personId, (mset = new Set()));
    mset.add(l.memoryId);
    const d = dataset.memories.get(l.memoryId)?.memoryDate ?? null;
    if (d) {
      const f = firstDate.get(l.personId);
      if (f === undefined || f === null || d < f) firstDate.set(l.personId, d);
      const last = lastDate.get(l.personId);
      if (last === undefined || last === null || d > last) lastDate.set(l.personId, d);
    }
  }
  const coTotals = coOccurrenceTotals(deriveCoOccurrences(dataset.links));

  const metrics: PersonMetric[] = [];
  for (const [id, info] of dataset.people) {
    const mentionCount = memoriesByPerson.get(id)?.size ?? 0;
    const latestMentionDate = lastDate.get(id) ?? null;
    const coOccurrenceTotal = coTotals.get(id) ?? 0;
    metrics.push({
      personId: id,
      displayName: info.displayName,
      role: info.role,
      mentionCount,
      firstMentionDate: firstDate.get(id) ?? null,
      latestMentionDate,
      coOccurrenceTotal,
      relationshipStrength: relationshipStrength(
        { mentionCount, latestMentionDate, coOccurrenceTotal },
        now,
      ),
    });
  }
  return metrics;
}

/** The distinct memory metas a person appears in (dataset-scoped). Pure. */
export function personMemoryMetas(dataset: RelationshipDataset, personId: string): MemoryMeta[] {
  const seen = new Set<string>();
  const out: MemoryMeta[] = [];
  for (const l of dataset.links) {
    if (l.personId !== personId) continue;
    const m = dataset.memories.get(l.memoryId);
    if (m && !seen.has(m.id)) {
      seen.add(m.id);
      out.push(m);
    }
  }
  return out;
}

/** Top recurring themes (categories + tags) across a set of memories. Pure. */
export function topThemesOf(metas: MemoryMeta[], limit = 4): string[] {
  const counts = new Map<string, number>();
  for (const m of metas) {
    const cat = (m.category ?? "").trim();
    if (cat) counts.set(cat, (counts.get(cat) ?? 0) + 1);
    for (const raw of m.tags) {
      const t = (raw ?? "").trim();
      if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key]) => key);
}

/** Distinct decades a set of memories spans ("life periods"). Pure. */
export function decadeCountOf(metas: MemoryMeta[]): number {
  const decades = new Set<number>();
  for (const m of metas) {
    if (!m.memoryDate) continue;
    const year = new Date(m.memoryDate).getFullYear();
    if (!Number.isNaN(year)) decades.add(Math.floor(year / 10) * 10);
  }
  return decades.size;
}

/**
 * The memories that CONNECT the given people — memories in which at least `minPeople` of them
 * co-appear (default: all). Sorted by how many of the people appear, then most-recent. Pure.
 * This is the deterministic "which memories connect Mary and John".
 */
export function connectMemories(
  dataset: RelationshipDataset,
  personIds: string[],
  minPeople = personIds.length,
): { memory: MemoryMeta; sharedCount: number }[] {
  const ids = new Set(personIds);
  const byMemory = new Map<string, Set<string>>();
  for (const l of dataset.links) {
    if (!ids.has(l.personId)) continue;
    let set = byMemory.get(l.memoryId);
    if (!set) byMemory.set(l.memoryId, (set = new Set()));
    set.add(l.personId);
  }
  const out: { memory: MemoryMeta; sharedCount: number }[] = [];
  for (const [memoryId, persons] of byMemory) {
    if (persons.size < minPeople) continue;
    const memory = dataset.memories.get(memoryId);
    if (memory) out.push({ memory, sharedCount: persons.size });
  }
  out.sort(
    (a, b) =>
      b.sharedCount - a.sharedCount ||
      (b.memory.memoryDate ?? "").localeCompare(a.memory.memoryDate ?? "") ||
      a.memory.id.localeCompare(b.memory.id),
  );
  return out;
}

/** Deterministic comparator helpers (stable: tie-break by id) so ranking is stable. */
function byMention(a: PersonMetric, b: PersonMetric): number {
  return b.mentionCount - a.mentionCount || a.personId.localeCompare(b.personId);
}
function byStrength(a: PersonMetric, b: PersonMetric): number {
  return b.relationshipStrength - a.relationshipStrength || a.personId.localeCompare(b.personId);
}
function byRecency(a: PersonMetric, b: PersonMetric): number {
  const ad = a.latestMentionDate ?? "";
  const bd = b.latestMentionDate ?? "";
  return bd.localeCompare(ad) || a.personId.localeCompare(b.personId);
}

// ---------------------------------------------------------------------------
// Public API (IO + pure)
// ---------------------------------------------------------------------------
export async function getRelationshipMetrics(
  supabase: RemySupabase,
  ownerAccountId: string,
  memoryProfileId: string | null,
  now: number = Date.now(),
): Promise<PersonMetric[]> {
  return derivePersonMetrics(await getRelationshipDataset(supabase, ownerAccountId, memoryProfileId), now);
}

export async function getTopPeople(
  supabase: RemySupabase,
  ownerAccountId: string,
  memoryProfileId: string | null,
  options?: { by?: "mention" | "strength"; limit?: number; now?: number },
): Promise<PersonMetric[]> {
  const now = options?.now ?? Date.now();
  const metrics = (await getRelationshipMetrics(supabase, ownerAccountId, memoryProfileId, now)).filter(
    (m) => m.mentionCount > 0,
  );
  metrics.sort(options?.by === "strength" ? byStrength : byMention);
  return metrics.slice(0, options?.limit ?? 10);
}

export async function getRecentPeople(
  supabase: RemySupabase,
  ownerAccountId: string,
  memoryProfileId: string | null,
  options?: { limit?: number; now?: number },
): Promise<PersonMetric[]> {
  const metrics = (
    await getRelationshipMetrics(supabase, ownerAccountId, memoryProfileId, options?.now ?? Date.now())
  ).filter((m) => m.latestMentionDate);
  metrics.sort(byRecency);
  return metrics.slice(0, options?.limit ?? 10);
}

export async function getPersonTimeline(
  supabase: RemySupabase,
  personId: string,
  ownerAccountId: string,
  memoryProfileId: string | null,
): Promise<PersonTimeline | null> {
  const dataset = await getRelationshipDataset(supabase, ownerAccountId, memoryProfileId);
  const info = dataset.people.get(personId);
  if (!info) return null; // person not in this workspace/owner → no timeline (isolation)

  const seen = new Set<string>();
  const memories: { memoryId: string; title: string | null; memoryDate: string | null }[] = [];
  for (const l of dataset.links) {
    if (l.personId !== personId) continue;
    const m = dataset.memories.get(l.memoryId);
    if (!m || seen.has(m.id)) continue;
    seen.add(m.id);
    memories.push({ memoryId: m.id, title: m.title, memoryDate: m.memoryDate });
  }
  memories.sort((a, b) => (a.memoryDate ?? "").localeCompare(b.memoryDate ?? ""));

  const dated = memories.map((m) => m.memoryDate).filter((d): d is string => Boolean(d));
  return {
    personId,
    displayName: info.displayName,
    firstMentionDate: dated.length ? dated[0] : null,
    latestMentionDate: dated.length ? dated[dated.length - 1] : null,
    totalMentionCount: memories.length,
    memories,
  };
}

export async function getPersonCoOccurrences(
  supabase: RemySupabase,
  personId: string,
  ownerAccountId: string,
  memoryProfileId: string | null,
  options?: { limit?: number },
): Promise<CoOccurrence[]> {
  const dataset = await getRelationshipDataset(supabase, ownerAccountId, memoryProfileId);
  if (!dataset.people.has(personId)) return [];
  const pairs = deriveCoOccurrences(dataset.links);
  const out: CoOccurrence[] = [];
  for (const [key, count] of pairs) {
    const [a, b] = key.split("|");
    const other = a === personId ? b : b === personId ? a : null;
    if (!other) continue;
    const info = dataset.people.get(other);
    if (info) out.push({ personId: other, displayName: info.displayName, count });
  }
  out.sort((x, y) => y.count - x.count || x.personId.localeCompare(y.personId));
  return out.slice(0, options?.limit ?? 10);
}

/**
 * Data preparation for a person summary (Step 5). Returns metrics + timeline +
 * strongest co-occurrences + recent memories. Does NOT call OpenAI or generate prose.
 */
export async function buildPersonRelationshipContext(
  supabase: RemySupabase,
  personId: string,
  ownerAccountId: string,
  memoryProfileId: string | null,
  now: number = Date.now(),
): Promise<PersonRelationshipContext> {
  // ONE dataset fetch (previously three) → derive every signal purely from it.
  const dataset = await getRelationshipDataset(supabase, ownerAccountId, memoryProfileId);
  const metric = derivePersonMetrics(dataset, now).find((m) => m.personId === personId) ?? null;

  const metas = personMemoryMetas(dataset, personId);
  const chrono = [...metas].sort((a, b) => (a.memoryDate ?? "").localeCompare(b.memoryDate ?? ""));
  const dated = chrono.map((m) => m.memoryDate).filter((d): d is string => Boolean(d));
  const info = dataset.people.get(personId);
  const timeline: PersonTimeline | null = info
    ? {
        personId,
        displayName: info.displayName,
        firstMentionDate: dated.length ? dated[0] : null,
        latestMentionDate: dated.length ? dated[dated.length - 1] : null,
        totalMentionCount: chrono.length,
        memories: chrono.map((m) => ({ memoryId: m.id, title: m.title, memoryDate: m.memoryDate })),
      }
    : null;

  const coPairs = deriveCoOccurrences(dataset.links);
  const strongestCoOccurrences: CoOccurrence[] = [];
  for (const [key, count] of coPairs) {
    const [a, b] = key.split("|");
    const other = a === personId ? b : b === personId ? a : null;
    if (!other) continue;
    const otherInfo = dataset.people.get(other);
    if (otherInfo) {
      strongestCoOccurrences.push({ personId: other, displayName: otherInfo.displayName, count });
    }
  }
  strongestCoOccurrences.sort((x, y) => y.count - x.count || x.personId.localeCompare(y.personId));

  const recentMemories = [...(timeline?.memories ?? [])].reverse().slice(0, 5);

  return {
    metric,
    timeline,
    strongestCoOccurrences: strongestCoOccurrences.slice(0, 5),
    recentMemories,
    topThemes: topThemesOf(metas),
    periodCount: decadeCountOf(metas),
  };
}

// ---------------------------------------------------------------------------
// Step 6 — limited Ask Remy integration helpers (deterministic; no AI; no prose
// generation; factual counts/dates only — no sentiment, no profiling).
// ---------------------------------------------------------------------------
export type RelationshipIntent =
  | { kind: "aggregate"; type: "TOP_MENTIONS" | "TOP_STRENGTH" | "TOP_COOCCURRENCE" | "RECENT" }
  | { kind: "person" }
  | null;

const RE_TOP_COOCCURRENCE = /\b(who|which people).*(appear|come up|together).*(together|most often)\b|\bwho.*together (the )?most\b/;
const RE_TOP_STRENGTH = /\bwho do i spend (the )?most time with\b|\bwho('?s| is) closest to me\b/;
const RE_RECENT = /\bwho (have|did) i (mention|talk about|see).*(recent|lately|last)/;
const RE_TOP_MENTIONS =
  /\bwho do i (mention|talk about) (the )?most\b|\bwho (appears|comes up|shows up) (the )?most\b|\bwho('?s| is) in my memories the most\b/;

/** Detect a relationship-intent query deterministically (pure). */
export function detectRelationshipIntent(query: string): RelationshipIntent {
  const q = (query ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!q) return null;
  if (RE_TOP_COOCCURRENCE.test(q)) return { kind: "aggregate", type: "TOP_COOCCURRENCE" };
  if (RE_TOP_STRENGTH.test(q)) return { kind: "aggregate", type: "TOP_STRENGTH" };
  if (RE_RECENT.test(q)) return { kind: "aggregate", type: "RECENT" };
  if (RE_TOP_MENTIONS.test(q)) return { kind: "aggregate", type: "TOP_MENTIONS" };
  if (/\brelationship\b/.test(q)) return { kind: "person" };
  return null;
}

export interface AggregateRelationshipAnswer {
  text: string;
  count: number;
  personIds: string[];
  personNames: string[];
}

function exampleTitles(dataset: RelationshipDataset, personId: string, limit = 2): string[] {
  const titles: string[] = [];
  for (const l of dataset.links) {
    if (l.personId !== personId) continue;
    const t = dataset.memories.get(l.memoryId)?.title;
    if (t && !titles.includes(t)) {
      titles.push(t);
      if (titles.length >= limit) break;
    }
  }
  return titles;
}

const NO_DATA = "I don't have enough recorded people in your memories yet to answer that.";

/**
 * Deterministic, grounded answer for an AGGREGATE relationship question. Built
 * entirely from real mention counts / co-occurrence / dates + example memory titles
 * (cited) — NO LLM, no inference, no sentiment/profiling. Returns NO_DATA gracefully
 * when there is nothing to report. Read-only.
 */
export async function answerAggregateRelationship(
  supabase: RemySupabase,
  intent: { type: "TOP_MENTIONS" | "TOP_STRENGTH" | "TOP_COOCCURRENCE" | "RECENT" },
  ownerAccountId: string,
  memoryProfileId: string | null,
  now: number = Date.now(),
): Promise<AggregateRelationshipAnswer> {
  const dataset = await getRelationshipDataset(supabase, ownerAccountId, memoryProfileId);
  const metrics = derivePersonMetrics(dataset, now);

  if (intent.type === "TOP_COOCCURRENCE") {
    const pairs = [...deriveCoOccurrences(dataset.links).entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5);
    if (pairs.length === 0) return { text: NO_DATA, count: 0, personIds: [], personNames: [] };
    const ids = new Set<string>();
    const lines = pairs.map(([key, count]) => {
      const [a, b] = key.split("|");
      ids.add(a);
      ids.add(b);
      const na = dataset.people.get(a)?.displayName ?? "someone";
      const nb = dataset.people.get(b)?.displayName ?? "someone";
      return `${na} and ${nb} (${count} shared ${count === 1 ? "memory" : "memories"})`;
    });
    const names = [...ids].map((id) => dataset.people.get(id)?.displayName ?? "").filter(Boolean);
    return {
      text: `The people who appear together most often in your recorded memories: ${lines.join("; ")}.`,
      count: pairs.length,
      personIds: [...ids],
      personNames: names,
    };
  }

  const ranked = metrics
    .filter((m) => (intent.type === "RECENT" ? m.latestMentionDate : m.mentionCount > 0))
    .sort((a, b) => {
      if (intent.type === "RECENT") return (b.latestMentionDate ?? "").localeCompare(a.latestMentionDate ?? "") || a.personId.localeCompare(b.personId);
      if (intent.type === "TOP_STRENGTH") return b.relationshipStrength - a.relationshipStrength || a.personId.localeCompare(b.personId);
      return b.mentionCount - a.mentionCount || a.personId.localeCompare(b.personId);
    })
    .slice(0, 5);

  if (ranked.length === 0) return { text: NO_DATA, count: 0, personIds: [], personNames: [] };

  const lines = ranked.map((m) => {
    const titles = exampleTitles(dataset, m.personId);
    const eg = titles.length ? ` — e.g. ${titles.map((t) => `"${t}"`).join(", ")}` : "";
    if (intent.type === "RECENT") {
      return `${m.displayName} (most recently ${m.latestMentionDate ?? "an undated memory"}${eg})`;
    }
    return `${m.displayName} (${m.mentionCount} ${m.mentionCount === 1 ? "memory" : "memories"}${eg})`;
  });
  const lead =
    intent.type === "RECENT"
      ? "People you've mentioned most recently in your memories"
      : intent.type === "TOP_STRENGTH"
        ? "Based on how often and how recently they appear in your recorded memories, the people you spend the most time with"
        : "The people who appear most in your recorded memories";

  return {
    text: `${lead}: ${lines.join("; ")}.`,
    count: ranked.length,
    personIds: ranked.map((m) => m.personId),
    personNames: ranked.map((m) => m.displayName),
  };
}

/**
 * A short, FACTUAL relationship-facts block to append to a single-person grounded
 * answer's context (counts + dates + co-occurrence only). Pure. Returns "" when
 * there is nothing factual to add.
 */
export function formatPersonRelationshipFacts(ctx: PersonRelationshipContext): string {
  if (!ctx.metric || ctx.metric.mentionCount === 0) return "";
  const m = ctx.metric;
  const span =
    m.firstMentionDate && m.latestMentionDate
      ? `, from ${m.firstMentionDate} to ${m.latestMentionDate}`
      : "";
  const lines = [
    `Relationship facts about ${m.displayName} (factual counts and dates only — do NOT infer feelings, health, or psychology):`,
    `- Appears in ${m.mentionCount} of your recorded ${m.mentionCount === 1 ? "memory" : "memories"}${span}.`,
  ];
  if (ctx.strongestCoOccurrences.length > 0) {
    lines.push(
      `- Most often appears alongside: ${ctx.strongestCoOccurrences
        .map((c) => `${c.displayName} (${c.count})`)
        .join(", ")}.`,
    );
  }
  if (ctx.topThemes.length > 0) {
    lines.push(`- Recurring themes in these memories: ${ctx.topThemes.join(", ")}.`);
  }
  if (ctx.periodCount >= 2) {
    lines.push(`- These memories span ${ctx.periodCount} different decades.`);
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Milestone B — people-connection intelligence (deterministic; no AI).
// ---------------------------------------------------------------------------
const RE_CONNECT =
  /\b(connect|connects|connection|connected|together|both of|link|linked|shared|in common|same memor)\b/;

/** Does the query ask how people/memories are connected? Pure. */
export function isConnectQuery(query: string): boolean {
  return RE_CONNECT.test((query ?? "").toLowerCase());
}

export interface ConnectPeopleAnswer {
  text: string;
  count: number;
  memories: { memoryId: string; title: string | null; memoryDate: string | null }[];
}

/**
 * Deterministic "which memories connect these people". Prefers memories in which ALL named
 * people co-appear; if none, falls back to any-two-of-them. Grounded in real links only.
 */
export async function answerConnectPeople(
  supabase: RemySupabase,
  personIds: string[],
  personNames: string[],
  ownerAccountId: string,
  memoryProfileId: string | null,
): Promise<ConnectPeopleAnswer> {
  const names = personNames.length ? personNames.join(" and ") : "those people";
  if (personIds.length < 2) return { text: "", count: 0, memories: [] };

  const dataset = await getRelationshipDataset(supabase, ownerAccountId, memoryProfileId);
  let connected = connectMemories(dataset, personIds, personIds.length);
  // Fallback for 3+ people with no single shared memory: memories where at least TWO co-appear.
  let allTogether = true;
  if (connected.length === 0 && personIds.length > 2) {
    connected = connectMemories(dataset, personIds, 2);
    allTogether = false;
  }

  if (connected.length === 0) {
    return {
      text: `I don't have any recorded memories that connect ${names}.`,
      count: 0,
      memories: [],
    };
  }

  const memories = connected.slice(0, 8).map((c) => ({
    memoryId: c.memory.id,
    title: c.memory.title,
    memoryDate: c.memory.memoryDate,
  }));
  const examples = memories
    .slice(0, 3)
    .map((m) => `"${m.title ?? "Untitled memory"}"`)
    .join(", ");
  // Honest wording: only claim ALL appear together when they actually do (else "at least two").
  const subject = allTogether ? `${names} appear together` : `At least two of ${names} appear together`;
  return {
    text: `${subject} in ${connected.length} of your recorded ${
      connected.length === 1 ? "memory" : "memories"
    } — for example ${examples}.`,
    count: connected.length,
    memories,
  };
}
