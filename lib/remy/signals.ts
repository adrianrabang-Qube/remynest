import type { createClient } from "@/utils/supabase/server";
import type { RemySignals } from "./types";

type DashboardSupabase = Awaited<ReturnType<typeof createClient>>;

/** Inputs the dashboard already has — Remy only adds the memory-trend reads. */
interface BuildRemySignalsArgs {
  /** Active care profile, or null for My Nest (memory_profile_id IS NULL). */
  memoryProfileId: string | null;
  totalMemories: number;
  reminders: RemySignals["reminders"];
  subjectName: string | null;
  isCareContext: boolean;
  pendingInvites: number;
  accessibleProfiles: number;
}

/**
 * Gather Remy's signals from EXISTING data only — read-only `memories` counts
 * scoped exactly like the dashboard (active care profile, or My Nest). Every
 * query is best-effort: a failure degrades that signal to 0 and never throws,
 * so Remy can never break the dashboard render.
 */
export async function buildRemySignals(
  supabase: DashboardSupabase,
  args: BuildRemySignalsArgs
): Promise<RemySignals> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString();
  const startOfLastMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1
  ).toISOString();

  const [addedThisWeek, addedThisMonth, addedLastMonth, lastAddedAt] =
    await Promise.all([
      countMemories(supabase, args.memoryProfileId, weekAgo),
      countMemories(supabase, args.memoryProfileId, startOfMonth),
      countMemories(
        supabase,
        args.memoryProfileId,
        startOfLastMonth,
        startOfMonth
      ),
      latestMemoryAt(supabase, args.memoryProfileId),
    ]);

  return {
    subjectName: args.subjectName,
    isCareContext: args.isCareContext,
    memories: {
      total: args.totalMemories,
      addedThisWeek,
      addedThisMonth,
      addedLastMonth,
      lastAddedAt,
    },
    reminders: args.reminders,
    workspace: {
      pendingInvites: args.pendingInvites,
      accessibleProfiles: args.accessibleProfiles,
    },
  };
}

async function countMemories(
  supabase: DashboardSupabase,
  memoryProfileId: string | null,
  gte: string,
  lt?: string
): Promise<number> {
  try {
    let q = supabase
      .from("memories")
      .select("id", { count: "exact", head: true })
      .gte("created_at", gte);
    if (lt) q = q.lt("created_at", lt);
    q = memoryProfileId
      ? q.eq("memory_profile_id", memoryProfileId)
      : q.is("memory_profile_id", null);
    const { count } = await q;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function latestMemoryAt(
  supabase: DashboardSupabase,
  memoryProfileId: string | null
): Promise<string | null> {
  try {
    let q = supabase
      .from("memories")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1);
    q = memoryProfileId
      ? q.eq("memory_profile_id", memoryProfileId)
      : q.is("memory_profile_id", null);
    const { data } = await q.maybeSingle();
    return (data as { created_at?: string } | null)?.created_at ?? null;
  } catch {
    return null;
  }
}
