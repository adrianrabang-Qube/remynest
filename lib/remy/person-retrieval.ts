import type { createClient } from "@/utils/supabase/server";
import {
  extractNameTokens,
  matchPeopleByTokens,
  rankWithPersonBoost,
  MEMORY_SELECT_FIELDS,
  type MemoryRecord,
  type PersonRow,
  type ResolvedPerson,
  type RetrievalQuery,
} from "@/lib/remy/retrieval";
import { retrieveAskRecordsHybrid } from "@/lib/remy/semantic-retrieval";

/**
 * Phase C3 — Person Retrieval Foundation (SERVER ONLY, read-only).
 *
 * Makes people first-class retrieval entities: detect person references in a query,
 * resolve them to person ids (owner + workspace scoped), retrieve the memories
 * linked through memory_person_links, and merge them into the existing hybrid
 * candidate set with a ranking BOOST (never a hard filter) plus explainability
 * metadata. Composes the existing pipeline additively — it does NOT modify
 * extraction, schema, the hybrid retriever, or the Ask Remy answer/intent layers.
 *
 * Safety: never creates/modifies people or links; runs as the AUTHENTICATED OWNER
 * (createClient), never the service role; no AI / embeddings / OpenAI calls; person
 * resolution and memory retrieval are workspace + owner scoped so personal and care
 * "Dad" stay distinct and people never resolve across users or workspaces.
 */
type RemySupabase = Awaited<ReturnType<typeof createClient>>;

const PERSON_RESOLVE_CAP = 200; // candidate people scanned per query
const PERSON_LINK_MEMORY_CAP = 500; // linked memory ids fetched

export interface PersonAwareResult {
  records: MemoryRecord[];
  /** People resolved from the query (for future Ask Remy explanations). */
  matchedPersonIds: string[];
  matchedPersonNames: string[];
}

const PEOPLE_SELECT = "id, display_name, normalized_name, aliases";

/**
 * Resolve people referenced in a free-text query, scoped to the active workspace
 * and owner. Two parameterized, indexed lookups (exact normalized_name; alias
 * overlap) — constant, NOT N+1 — unioned and classified by the pure matcher
 * (exact name beats alias). Returns [] when the query names no known person.
 */
export async function resolvePeopleInQuery(
  supabase: RemySupabase,
  query: string,
  ownerAccountId: string,
  memoryProfileId: string | null,
): Promise<ResolvedPerson[]> {
  const tokens = extractNameTokens(query);
  if (tokens.length === 0) return [];

  const scoped = () => {
    let q = supabase
      .from("people")
      .select(PEOPLE_SELECT)
      .eq("created_by_account_id", ownerAccountId)
      .eq("status", "active")
      .limit(PERSON_RESOLVE_CAP);
    q = memoryProfileId
      ? q.eq("memory_profile_id", memoryProfileId)
      : q.is("memory_profile_id", null);
    return q;
  };

  const [byName, byAlias] = await Promise.all([
    scoped().in("normalized_name", tokens),
    scoped().overlaps("aliases", tokens),
  ]);

  const rows: PersonRow[] = [];
  const seen = new Set<string>();
  for (const row of [...(byName.data ?? []), ...(byAlias.data ?? [])] as PersonRow[]) {
    if (row?.id && !seen.has(row.id)) {
      seen.add(row.id);
      rows.push(row);
    }
  }
  return matchPeopleByTokens(rows, tokens);
}

/**
 * Retrieve the memories linked to the given people, scoped to the active workspace
 * + owner. Two parameterized queries (links -> memory ids; memories) — not N+1.
 */
export async function retrievePersonLinkedRecords(
  supabase: RemySupabase,
  personIds: string[],
  ownerAccountId: string,
  memoryProfileId: string | null,
): Promise<MemoryRecord[]> {
  if (personIds.length === 0) return [];

  // personIds are already owner+workspace-scoped (from resolvePeopleInQuery), and
  // mpl RLS scopes through the owner's people; the memory re-fetch below is the
  // authoritative owner+workspace filter. .order keeps the capped sample deterministic.
  const { data: links } = await supabase
    .from("memory_person_links")
    .select("memory_id")
    .in("person_id", personIds)
    .order("created_at", { ascending: false })
    .limit(PERSON_LINK_MEMORY_CAP);

  const memoryIds = [
    ...new Set(((links ?? []) as { memory_id?: string }[]).map((l) => l.memory_id).filter(Boolean)),
  ] as string[];
  if (memoryIds.length === 0) return [];

  let q = supabase
    .from("memories")
    .select(MEMORY_SELECT_FIELDS)
    .eq("user_id", ownerAccountId) // owner-authored (C2 links are owner-only) + defense-in-depth
    .in("id", memoryIds);
  q = memoryProfileId
    ? q.eq("memory_profile_id", memoryProfileId)
    : q.is("memory_profile_id", null);

  const { data } = await q;
  return (data ?? []) as MemoryRecord[];
}

/**
 * Person-aware retrieval: the existing hybrid candidate set UNIONed with the
 * person-linked memories, re-ranked with a person boost, plus matched-person
 * metadata. Additive — when the query names no known person this returns exactly
 * the hybrid result (same set, same blended order). Read-only.
 */
export async function retrievePersonAware(
  supabase: RemySupabase,
  question: string,
  query: RetrievalQuery,
  ownerAccountId: string,
  memoryProfileId: string | null,
): Promise<PersonAwareResult> {
  const [base, people] = await Promise.all([
    retrieveAskRecordsHybrid(supabase, question, query, ownerAccountId, memoryProfileId),
    resolvePeopleInQuery(supabase, question, ownerAccountId, memoryProfileId),
  ]);

  const matchedPersonIds = people.map((p) => p.id);
  const matchedPersonNames = people.map((p) => p.displayName);

  const personRecords =
    matchedPersonIds.length > 0
      ? await retrievePersonLinkedRecords(
          supabase,
          matchedPersonIds,
          ownerAccountId,
          memoryProfileId,
        )
      : [];

  // Union by id (no duplicate memories); base wins (keeps its similarity).
  const byId = new Map<string, MemoryRecord>();
  for (const record of base) byId.set(record.id, record);
  for (const record of personRecords) {
    if (!byId.has(record.id)) byId.set(record.id, { ...record, similarity: record.similarity ?? 0 });
  }

  const linkedIds = new Set(personRecords.map((r) => r.id));
  const records = rankWithPersonBoost([...byId.values()], query, linkedIds);

  return { records, matchedPersonIds, matchedPersonNames };
}
