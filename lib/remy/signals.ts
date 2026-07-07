import type { createClient } from "@/utils/supabase/server";
import type { RemySignals, RemyIntelligence } from "./types";

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
  /** Account id — used for user-scoped signals (clusters). */
  userId: string;
}

const GENERIC_CATEGORIES = new Set([
  "",
  "general",
  "uncategorized",
  "memory",
  "other",
]);

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

  const [
    addedThisWeek,
    addedThisMonth,
    addedLastMonth,
    lastAddedAt,
    intelligence,
  ] = await Promise.all([
    countMemories(supabase, args.memoryProfileId, weekAgo),
    countMemories(supabase, args.memoryProfileId, startOfMonth),
    countMemories(
      supabase,
      args.memoryProfileId,
      startOfLastMonth,
      startOfMonth
    ),
    latestMemoryAt(supabase, args.memoryProfileId),
    buildIntelligence(
      supabase,
      args.memoryProfileId,
      args.userId,
      now
    ),
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
    intelligence,
  };
}

/**
 * Deeper workspace intelligence from existing stored data. Best-effort and
 * deterministic: each piece degrades to a safe zero/null on failure or sparse
 * data, so Remy never invents or breaks the dashboard.
 */
async function buildIntelligence(
  supabase: DashboardSupabase,
  memoryProfileId: string | null,
  userId: string,
  now: Date
): Promise<RemyIntelligence> {
  const weekAgoMs = now.getTime() - 7 * 86_400_000;

  const [historicalTotal, earliestYear, clustersDiscovered, sample] =
    await Promise.all([
      countHistoricalMemories(supabase, memoryProfileId),
      earliestMemoryYear(supabase, memoryProfileId),
      countClusters(supabase, userId),
      sampleRecentMemories(supabase, memoryProfileId),
    ]);

  // ── Category signals (top theme + most-recent theme) ─────────────────────
  const overall = new Map<string, { label: string; count: number }>();
  const recent = new Map<string, { label: string; count: number }>();

  const tally = (
    map: Map<string, { label: string; count: number }>,
    raw: string | null | undefined
  ) => {
    const label = (raw ?? "").trim();
    if (!label || GENERIC_CATEGORIES.has(label.toLowerCase())) return;
    const key = label.toLowerCase();
    const entry = map.get(key) ?? { label, count: 0 };
    entry.count += 1;
    map.set(key, entry);
  };

  sample.forEach((row, index) => {
    tally(overall, row.ai_category);
    if (index < 12) tally(recent, row.ai_category);
  });

  const topCategory = pickTop(overall);
  const recentTop = pickTop(recent);
  const recentTheme =
    recentTop && recentTop.count >= 2 ? recentTop.label : null;

  // ── Historical memories preserved this week (+ shared decade) ─────────────
  let historicalThisWeek = 0;
  const decades = new Set<number>();
  for (const row of sample) {
    if (!row.memory_date) continue;
    const recordedMs = new Date(row.created_at).getTime();
    if (Number.isNaN(recordedMs) || recordedMs < weekAgoMs) continue;
    historicalThisWeek += 1;
    const year = new Date(row.memory_date).getFullYear();
    if (!Number.isNaN(year)) decades.add(Math.floor(year / 10) * 10);
  }
  const historicalThisWeekEra =
    decades.size === 1 ? `${[...decades][0]}s` : null;

  return {
    historicalTotal,
    historicalThisWeek,
    historicalThisWeekEra,
    topCategory,
    recentTheme,
    earliestYear,
    clustersDiscovered,
  };
}

function pickTop(
  map: Map<string, { label: string; count: number }>
): { label: string; count: number } | null {
  let top: { label: string; count: number } | null = null;
  for (const entry of map.values()) {
    if (!top || entry.count > top.count) top = entry;
  }
  return top;
}

async function countHistoricalMemories(
  supabase: DashboardSupabase,
  memoryProfileId: string | null
): Promise<number> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;
    let q = supabase
      .from("memories")
      .select("id", { count: "exact", head: true })
      .not("memory_date", "is", null);
    q = memoryProfileId
      ? q.eq("memory_profile_id", memoryProfileId)
      : q.is("memory_profile_id", null).eq("user_id", user.id);
    const { count } = await q;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function earliestMemoryYear(
  supabase: DashboardSupabase,
  memoryProfileId: string | null
): Promise<number | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    let q = supabase
      .from("memories")
      .select("memory_date")
      .not("memory_date", "is", null)
      .order("memory_date", { ascending: true })
      .limit(1);
    q = memoryProfileId
      ? q.eq("memory_profile_id", memoryProfileId)
      : q.is("memory_profile_id", null).eq("user_id", user.id);
    const { data } = await q.maybeSingle();
    const iso = (data as { memory_date?: string } | null)?.memory_date;
    if (!iso) return null;
    const year = new Date(iso).getFullYear();
    return Number.isNaN(year) ? null : year;
  } catch {
    return null;
  }
}

async function countClusters(
  supabase: DashboardSupabase,
  userId: string
): Promise<number> {
  try {
    const { count } = await supabase
      .from("memory_clusters")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    return count ?? 0;
  } catch {
    return 0;
  }
}

interface SampleRow {
  ai_category: string | null;
  created_at: string;
  memory_date: string | null;
}

async function sampleRecentMemories(
  supabase: DashboardSupabase,
  memoryProfileId: string | null
): Promise<SampleRow[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    let q = supabase
      .from("memories")
      .select("ai_category, created_at, memory_date")
      .order("created_at", { ascending: false })
      .limit(250);
    q = memoryProfileId
      ? q.eq("memory_profile_id", memoryProfileId)
      : q.is("memory_profile_id", null).eq("user_id", user.id);
    const { data } = await q;
    return (data as SampleRow[] | null) ?? [];
  } catch {
    return [];
  }
}

async function countMemories(
  supabase: DashboardSupabase,
  memoryProfileId: string | null,
  gte: string,
  lt?: string
): Promise<number> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;
    let q = supabase
      .from("memories")
      .select("id", { count: "exact", head: true })
      .gte("created_at", gte);
    if (lt) q = q.lt("created_at", lt);
    q = memoryProfileId
      ? q.eq("memory_profile_id", memoryProfileId)
      : q.is("memory_profile_id", null).eq("user_id", user.id);
    const { count } = await q;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/** Minimal memory shape Remy needs from already-fetched telemetry. */
export interface TelemetryMemory {
  created_at: string;
}

/**
 * Derive Remy signals from in-memory telemetry (no DB) — lets surfaces that
 * already hold memory rows (e.g. Insights) feed the SAME observation engine the
 * dashboard uses, with zero extra queries. Reminder buckets are left at 0
 * because adherence-grade reminder data is computed per-surface where available.
 */
export function deriveRemySignals(
  memories: TelemetryMemory[],
  opts: {
    subjectName: string | null;
    isCareContext: boolean;
    now?: Date;
  }
): RemySignals {
  const now = opts.now ?? new Date();
  const weekAgo = now.getTime() - 7 * 86_400_000;
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).getTime();
  const lastMonthStart = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1
  ).getTime();

  let addedThisWeek = 0;
  let addedThisMonth = 0;
  let addedLastMonth = 0;
  let lastAddedAt: string | null = null;
  let lastAddedMs = -Infinity;

  for (const m of memories) {
    const t = new Date(m.created_at).getTime();
    if (Number.isNaN(t)) continue;
    if (t >= weekAgo) addedThisWeek += 1;
    if (t >= monthStart) addedThisMonth += 1;
    else if (t >= lastMonthStart) addedLastMonth += 1;
    if (t > lastAddedMs) {
      lastAddedMs = t;
      lastAddedAt = m.created_at;
    }
  }

  return {
    subjectName: opts.subjectName,
    isCareContext: opts.isCareContext,
    memories: {
      total: memories.length,
      addedThisWeek,
      addedThisMonth,
      addedLastMonth,
      lastAddedAt,
    },
    reminders: {
      today: 0,
      overdue: 0,
      upcomingToday: 0,
      completedToday: 0,
      routines: 0,
    },
    workspace: {
      pendingInvites: 0,
      accessibleProfiles: 0,
    },
  };
}

async function latestMemoryAt(
  supabase: DashboardSupabase,
  memoryProfileId: string | null
): Promise<string | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    let q = supabase
      .from("memories")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1);
    q = memoryProfileId
      ? q.eq("memory_profile_id", memoryProfileId)
      : q.is("memory_profile_id", null).eq("user_id", user.id);
    const { data } = await q.maybeSingle();
    return (data as { created_at?: string } | null)?.created_at ?? null;
  } catch {
    return null;
  }
}
