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
    .select("id, memory_date, title, ai_title")
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
  }[]) {
    memories.set(r.id, { id: r.id, memoryDate: r.memory_date ?? null, title: r.ai_title || r.title || null });
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
  const [metrics, timeline, coOcc] = await Promise.all([
    getRelationshipMetrics(supabase, ownerAccountId, memoryProfileId, now),
    getPersonTimeline(supabase, personId, ownerAccountId, memoryProfileId),
    getPersonCoOccurrences(supabase, personId, ownerAccountId, memoryProfileId, { limit: 5 }),
  ]);
  const metric = metrics.find((m) => m.personId === personId) ?? null;
  const recentMemories = (timeline?.memories ?? [])
    .slice()
    .reverse()
    .slice(0, 5);
  return { metric, timeline, strongestCoOccurrences: coOcc, recentMemories };
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
  return lines.join("\n");
}
