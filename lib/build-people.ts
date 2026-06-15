import { createClient } from "@/lib/supabase/server";
import { generateMemoryInsights, type ExtractedPerson } from "@/lib/ai-memory";
import { norm, containsWord } from "@/lib/remy/retrieval";

/**
 * Phase C2 — People Extraction Foundation.
 *
 * A best-effort cognition task (alongside buildRelationships / buildClusters): for a
 * created memory, identify GROUNDED people mentions and persist them into `people`
 * and `memory_person_links`. It NEVER throws and NEVER blocks memory creation.
 *
 * Invariants preserved:
 *   - grounded-only: a person is persisted ONLY if its mention is a verbatim,
 *     word-bounded substring of the memory content (the AI is untrusted);
 *   - no-AI-on-empty: nothing is persisted when there are no grounded candidates;
 *   - workspace isolation: writes carry memory_profile_id (NULL = My Nest), resolved
 *     within the active workspace; performed as the AUTHENTICATED OWNER (createClient,
 *     never the service role, which bypasses RLS);
 *   - idempotent: re-running creates no duplicates (dedupe by normalized name + the
 *     people partial-unique indexes + memory_person_links unique(memory_id, person_id)).
 *
 * Known minor limitations (no data corruption; C-phase hardening candidates):
 *   - Locale casing: resolve compares norm() (JS toLowerCase) against the trigger's
 *     lower(btrim(display_name)); for locale-sensitive letters (e.g. Turkish İ, Greek
 *     final sigma) the two can differ, so a rare non-Latin name may get a skipped link
 *     on a later memory (never a duplicate — the partial-unique + 23505 re-resolve block that).
 *   - Cached aggregates (mention_count, max_mention_confidence) are recomputed best-effort
 *     and are eventually-consistent; the links table is authoritative.
 *   - Caregiver-authored memories in a profile the caregiver does not own get no people
 *     (people write is owner-only by C1 RLS) — intentional; relax the write policy if/when
 *     caregiver-authored extraction is required.
 */
const BUILD_PEOPLE_TAG = "build-people-engine";

/** Safety cap on candidates persisted per memory. */
const MAX_PEOPLE_PER_MEMORY = 12;
const MAX_MENTION_LENGTH = 200;

export interface BuildPeopleResult {
  success: boolean;
  linked: number;
}

function logStage(stage: string, metadata?: unknown) {
  console.info(`[${BUILD_PEOPLE_TAG}] ${stage}`, metadata || {});
}
function logError(stage: string, error: unknown) {
  console.error(`[${BUILD_PEOPLE_TAG}] ${stage}`, error);
}

function clampConfidence(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  const scaled = n > 0 && n <= 1 ? n * 100 : n;
  return Math.max(0, Math.min(100, Math.round(scaled)));
}

/**
 * Grounding gate (Deliverable #3, the most important). Keeps only candidates whose
 * mention is a verbatim, word-bounded token in the memory content — reusing the
 * deterministic `containsWord` boundary logic. Also dedupes by normalized name
 * within the memory. Pure + unit-testable; the AI's labels are NOT trusted here.
 */
export function groundPeople(
  content: string,
  candidates: ExtractedPerson[],
): ExtractedPerson[] {
  const haystack = norm(content);
  if (!haystack || !Array.isArray(candidates)) return [];

  const seen = new Set<string>();
  const grounded: ExtractedPerson[] = [];
  for (const candidate of candidates) {
    const nameKey = norm(candidate?.name);
    const mention = norm(candidate?.mention) || nameKey;
    if (!nameKey || !mention) continue;
    // Verbatim, word-boundary check — discard anything not actually in the text.
    if (!containsWord(haystack, mention)) continue;
    if (seen.has(nameKey)) continue; // one person per normalized name per memory
    seen.add(nameKey);
    grounded.push(candidate);
  }
  return grounded;
}

type RemySupabase = Awaited<ReturnType<typeof createClient>>;

async function addAliasIfNew(
  supabase: RemySupabase,
  personId: string,
  currentAliases: unknown,
  surfaceForm: string,
): Promise<void> {
  if (!surfaceForm) return;
  const aliases = Array.isArray(currentAliases) ? (currentAliases as string[]) : [];
  if (aliases.includes(surfaceForm)) return; // idempotent
  await supabase
    .from("people")
    .update({ aliases: [...aliases, surfaceForm] })
    .eq("id", personId);
}

/**
 * Canonical person resolution (Deliverable #4). Resolves to an existing person by
 * EXACT normalized-name match within (owner, workspace); otherwise creates one.
 * Merge policy: surface forms with the SAME normalized name fold onto one person
 * (aliases accumulate); DIFFERENT normalized names ("John" vs "John Smith") stay
 * SEPARATE — never auto-merged. Cross-owner / cross-workspace merges are impossible
 * by construction (the resolve query is scoped by created_by_account_id +
 * memory_profile_id). Race/retry-safe via the partial-unique re-resolve.
 */
async function resolvePersonId(
  supabase: RemySupabase,
  candidate: ExtractedPerson,
  ownerAccountId: string,
  memoryProfileId: string | null,
): Promise<string | null> {
  const displayName = candidate.name.trim();
  const normKey = norm(displayName);
  const surfaceForm = norm(candidate.mention) || normKey;
  if (!normKey) return null;

  const findExisting = async () => {
    let q = supabase
      .from("people")
      .select("id, aliases")
      .eq("created_by_account_id", ownerAccountId)
      .eq("normalized_name", normKey)
      .eq("status", "active");
    q = memoryProfileId
      ? q.eq("memory_profile_id", memoryProfileId)
      : q.is("memory_profile_id", null);
    return q.maybeSingle();
  };

  const { data: existing } = await findExisting();
  if (existing) {
    await addAliasIfNew(supabase, existing.id, existing.aliases, surfaceForm);
    return existing.id;
  }

  // Create — normalized_name is derived by the DB trigger; do NOT set it here.
  const { data: inserted, error } = await supabase
    .from("people")
    .insert({
      created_by_account_id: ownerAccountId,
      memory_profile_id: memoryProfileId,
      display_name: displayName,
      aliases: surfaceForm ? [surfaceForm] : [],
      role: candidate.role ?? null,
    })
    .select("id")
    .single();

  if (!error && inserted) return inserted.id;

  // Concurrent insert / retry won the partial-unique index → re-resolve.
  if (error && (error as { code?: string }).code === "23505") {
    const { data: raced } = await findExisting();
    if (raced) {
      await addAliasIfNew(supabase, raced.id, raced.aliases, surfaceForm);
      return raced.id;
    }
  }
  if (error) logError("person-insert-failed", { displayName, error });
  return null;
}

/**
 * Idempotent link upsert (Deliverable #5). unique(memory_id, person_id) → no dupes.
 * Returns true ONLY when a NEW link row was created: with ignoreDuplicates the
 * `.select` returns the inserted row, or an empty set when the link already existed
 * (so a retry reports linked=0, keeping the metric accurate; the DB is idempotent
 * either way).
 */
async function linkPersonToMemory(
  supabase: RemySupabase,
  memoryId: string,
  personId: string,
  mention: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("memory_person_links")
    .upsert(
      {
        memory_id: memoryId,
        person_id: personId,
        matched_text: mention.slice(0, MAX_MENTION_LENGTH),
        source: "extraction",
      },
      { onConflict: "memory_id,person_id", ignoreDuplicates: true },
    )
    .select("id");
  if (error) {
    logError("link-upsert-failed", { memoryId, personId, error });
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/** Recompute cached aggregates from the authoritative links. Idempotent. */
async function recomputeAggregates(
  supabase: RemySupabase,
  personId: string,
  candidateConfidence: number,
): Promise<void> {
  const { count } = await supabase
    .from("memory_person_links")
    .select("id", { count: "exact", head: true })
    .eq("person_id", personId);

  const { data: person } = await supabase
    .from("people")
    .select("max_mention_confidence")
    .eq("id", personId)
    .maybeSingle();

  const currentMax =
    typeof person?.max_mention_confidence === "number" ? person.max_mention_confidence : 0;

  await supabase
    .from("people")
    .update({
      mention_count: count ?? 0,
      max_mention_confidence: Math.max(currentMax, clampConfidence(candidateConfidence)),
    })
    .eq("id", personId);
}

/**
 * Build people for a memory. `prefetchedPeople` (the already-computed enrichment
 * candidates from the create route) avoids a second AI call; when omitted (e.g. a
 * backfill), candidates are extracted fresh. Never throws.
 */
export async function buildPeople(
  memoryId: string,
  content: string,
  ownerAccountId: string,
  memoryProfileId: string | null,
  prefetchedPeople?: ExtractedPerson[],
): Promise<BuildPeopleResult> {
  try {
    const candidates = Array.isArray(prefetchedPeople)
      ? prefetchedPeople
      : (await generateMemoryInsights(content)).people;

    if (!candidates || candidates.length === 0) {
      return { success: true, linked: 0 };
    }

    const grounded = groundPeople(content, candidates).slice(0, MAX_PEOPLE_PER_MEMORY);
    if (grounded.length === 0) {
      logStage("no-grounded-people", { memoryId, candidates: candidates.length });
      return { success: true, linked: 0 };
    }

    // Authenticated OWNER client (RLS). Never the service role.
    const supabase = await createClient();

    let linked = 0;
    for (const candidate of grounded) {
      try {
        const personId = await resolvePersonId(
          supabase,
          candidate,
          ownerAccountId,
          memoryProfileId,
        );
        if (!personId) continue;
        const created = await linkPersonToMemory(
          supabase,
          memoryId,
          personId,
          candidate.mention,
        );
        if (created) linked += 1;
        await recomputeAggregates(supabase, personId, candidate.confidence);
      } catch (perCandidate) {
        // One bad candidate must not abort the rest, or the memory.
        logError("person-persist-failed", { memoryId, name: candidate.name, perCandidate });
      }
    }

    logStage("people-built", {
      memoryId,
      candidates: candidates.length,
      grounded: grounded.length,
      linked,
    });
    return { success: true, linked };
  } catch (error) {
    // NEVER throw — extraction failure must not fail the memory insert.
    logError("build-people-failed", { memoryId, error });
    return { success: false, linked: 0 };
  }
}
