/**
 * Memory Intelligence V2 (Phase 28) — DATA LAYER (service-role repository).
 *
 * The persistence for the mutable V2 state (`memory_intelligence`). All reads/writes go through the service-
 * role client scoped by an EXPLICIT session-derived user_id (the service role bypasses RLS). Reads are BATCH
 * (no N+1) and a MISSING row degrades to the default state (lazy — backfill is optional). Every function NEVER
 * throws (degraded reads return defaults / empty; degraded writes are swallowed) so V2 can never break a
 * caller. This is the ONLY module in the subsystem that touches the DB; the engines stay pure.
 */
import { supabaseAdmin } from "@/utils/supabase/admin";
import type { MemoryCategory, MemoryClusterType } from "./config";
import type { MemoryIntelligenceState } from "./types";
import { defaultState } from "./reinforcement-engine";

interface IntelligenceRow {
  memory_id?: string;
  retrieval_count?: number | null;
  last_recalled_at?: string | null;
  reinforcement_events?: number | null;
  down_rank_events?: number | null;
  conversation_count?: number | null;
  pinned?: boolean | null;
  favourite?: boolean | null;
  classification?: string | null;
  cluster_type?: string | null;
}

function rowToState(row: IntelligenceRow): MemoryIntelligenceState {
  const memoryId = typeof row.memory_id === "string" ? row.memory_id : "";
  return {
    memoryId,
    retrievalCount: Number(row.retrieval_count ?? 0),
    lastRecalledAt: row.last_recalled_at ?? null,
    reinforcementEvents: Number(row.reinforcement_events ?? 0),
    downRankEvents: Number(row.down_rank_events ?? 0),
    conversationCount: Number(row.conversation_count ?? 0),
    pinned: Boolean(row.pinned),
    favourite: Boolean(row.favourite),
    classification: (row.classification as MemoryCategory | null) ?? null,
    clusterType: (row.cluster_type as MemoryClusterType | null) ?? null,
  };
}

/**
 * Batch-load intelligence state for a user's memories. Scoped by user_id; a memory with no row degrades to its
 * default state (so the engines always have complete input). Never throws.
 */
export async function getMemoryIntelligenceStates(
  userId: string,
  memoryIds: string[],
): Promise<Map<string, MemoryIntelligenceState>> {
  const out = new Map<string, MemoryIntelligenceState>();
  const ids = [...new Set(memoryIds.filter(Boolean))];
  // Seed defaults so every requested id is present regardless of the read outcome.
  for (const id of ids) out.set(id, defaultState(id));
  if (ids.length === 0) return out;

  try {
    const { data } = await supabaseAdmin
      .from("memory_intelligence")
      .select(
        "memory_id, retrieval_count, last_recalled_at, reinforcement_events, down_rank_events, conversation_count, pinned, favourite, classification, cluster_type",
      )
      .eq("user_id", userId)
      .in("memory_id", ids);
    for (const row of (data ?? []) as IntelligenceRow[]) {
      const state = rowToState(row);
      if (state.memoryId) out.set(state.memoryId, state);
    }
  } catch {
    // Degrade to defaults — never break the caller.
  }
  return out;
}

/**
 * Reinforce a memory after a SUCCESSFUL retrieval (the hook a future retrieval path calls). Atomic upsert +
 * increment via the service-role RPC, scoped by user_id. `nowIso` is supplied (clock-free). Never throws.
 */
export async function reinforceMemory(
  userId: string,
  memoryId: string,
  workspaceId: string | null,
  nowIso: string,
): Promise<void> {
  try {
    await supabaseAdmin.rpc("reinforce_memory", {
      p_memory_id: memoryId,
      p_user_id: userId,
      p_workspace_id: workspaceId,
      p_now: nowIso,
    });
  } catch {
    // Reinforcement is best-effort observability — swallow.
  }
}

/**
 * Apply an absolute-set patch (pin/favourite/classification cache), scoped by user_id. USER-SCOPED update
 * first — it can only touch the caller's OWN row; if no such row exists, insert one. A row owned by a
 * DIFFERENT user is never re-owned or clobbered (the insert would conflict on the memory_id PK and is
 * swallowed). Never throws.
 */
async function upsertPatch(
  userId: string,
  memoryId: string,
  workspaceId: string | null,
  patch: Record<string, unknown>,
): Promise<void> {
  try {
    const { data } = await supabaseAdmin
      .from("memory_intelligence")
      .update(patch)
      .eq("memory_id", memoryId)
      .eq("user_id", userId)
      .select("memory_id");
    if (!data || data.length === 0) {
      // No row for THIS user yet → insert. If a foreign-user row already holds this memory_id, the PK
      // conflict throws and is swallowed below (that memory's row is never re-owned).
      await supabaseAdmin
        .from("memory_intelligence")
        .insert({ memory_id: memoryId, user_id: userId, workspace_id: workspaceId, ...patch });
    }
  } catch {
    // Swallow — never break the caller.
  }
}

/** Set the manual pin flag (future user action). Never throws. */
export async function setMemoryPinned(
  userId: string,
  memoryId: string,
  workspaceId: string | null,
  pinned: boolean,
): Promise<void> {
  return upsertPatch(userId, memoryId, workspaceId, { pinned });
}

/** Set the favourite flag (future user action). Never throws. */
export async function setMemoryFavourite(
  userId: string,
  memoryId: string,
  workspaceId: string | null,
  favourite: boolean,
): Promise<void> {
  return upsertPatch(userId, memoryId, workspaceId, { favourite });
}

/** Cache the deterministic classification + cluster (so identical memories are never re-classified). Never throws. */
export async function cacheMemoryClassification(
  userId: string,
  memoryId: string,
  workspaceId: string | null,
  classification: MemoryCategory,
  clusterType: MemoryClusterType,
): Promise<void> {
  return upsertPatch(userId, memoryId, workspaceId, {
    classification,
    cluster_type: clusterType,
  });
}

/** Eagerly seed default rows for a user's memories (optional; reads work without it). Returns count. Never throws. */
export async function backfillMemoryIntelligence(userId: string): Promise<number> {
  try {
    const { data } = await supabaseAdmin.rpc("backfill_memory_intelligence", { p_user_id: userId });
    return typeof data === "number" ? data : 0;
  } catch {
    return 0;
  }
}
