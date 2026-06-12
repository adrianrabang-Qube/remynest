import type { createClient } from "@/utils/supabase/server";

type DashboardSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Memory Date Adoption — coverage detection.
 *
 * A memory is "dated" when it has a historical memory_date. Increasing coverage
 * directly improves Remy's intelligence (timeline, historical observations, life
 * chapters). Read-only + best-effort; scoped to the active workspace (a care
 * profile, or My Nest when memoryProfileId is null).
 */
export interface DateCoverage {
  total: number;
  dated: number;
  missing: number;
  /** 0–100, rounded. */
  percentage: number;
}

export interface UndatedMemory {
  id: string;
  title: string | null;
  ai_title: string | null;
  content: string | null;
  created_at: string;
}

export function computeCoverage(
  total: number,
  dated: number
): DateCoverage {
  const safeTotal = Math.max(0, total);
  const safeDated = Math.min(safeTotal, Math.max(0, dated));
  const missing = safeTotal - safeDated;
  const percentage =
    safeTotal > 0 ? Math.round((safeDated / safeTotal) * 100) : 0;
  return { total: safeTotal, dated: safeDated, missing, percentage };
}

export type CoverageMilestone = "0–25%" | "25–50%" | "50–75%" | "75–100%";

export function coverageMilestone(percentage: number): CoverageMilestone {
  if (percentage < 25) return "0–25%";
  if (percentage < 50) return "25–50%";
  if (percentage < 75) return "50–75%";
  return "75–100%";
}

export async function getDateCoverage(
  supabase: DashboardSupabase,
  memoryProfileId: string | null
): Promise<DateCoverage> {
  const [total, dated] = await Promise.all([
    countMemories(supabase, memoryProfileId, false),
    countMemories(supabase, memoryProfileId, true),
  ]);
  return computeCoverage(total, dated);
}

export async function getMemoriesMissingDates(
  supabase: DashboardSupabase,
  memoryProfileId: string | null,
  limit = 100
): Promise<UndatedMemory[]> {
  try {
    let q = supabase
      .from("memories")
      .select("id, title, ai_title, content, created_at")
      .is("memory_date", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    q = memoryProfileId
      ? q.eq("memory_profile_id", memoryProfileId)
      : q.is("memory_profile_id", null);
    const { data } = await q;
    return (data as UndatedMemory[] | null) ?? [];
  } catch {
    return [];
  }
}

async function countMemories(
  supabase: DashboardSupabase,
  memoryProfileId: string | null,
  datedOnly: boolean
): Promise<number> {
  try {
    let q = supabase
      .from("memories")
      .select("id", { count: "exact", head: true });
    if (datedOnly) q = q.not("memory_date", "is", null);
    q = memoryProfileId
      ? q.eq("memory_profile_id", memoryProfileId)
      : q.is("memory_profile_id", null);
    const { count } = await q;
    return count ?? 0;
  } catch {
    return 0;
  }
}
