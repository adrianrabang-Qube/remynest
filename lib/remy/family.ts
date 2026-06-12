import type { createClient } from "@/utils/supabase/server";
import { resolveEffectiveDate } from "@/lib/memories/memory-date";
import { TONE_MOOD } from "./persona";
import type { RemyObservation } from "./types";

type DashboardSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Family Workspace Intelligence (V1) — the first family-level layer above Memory
 * Dates, Collections V2, Connections V2, and Life Chapters V2.
 *
 * For each accessible care profile it derives, from a SINGLE scoped `memories`
 * read, the stats that the per-profile Remy layers would compute: memory count,
 * dated count, chapter count (Life-Chapters-V2 decade periods among dated
 * memories), collection count (Collections-V2 category themes with >= 3
 * members), and last activity. It also aggregates the most common family themes
 * and a few human family observations.
 *
 * Read-only, best-effort, no AI, no migrations, existing data only. Intelligence
 * only — no notifications/alerts/predictions. Degrades to empty gracefully.
 */
export interface FamilyProfileStats {
  id: string;
  name: string;
  memoryCount: number;
  datedCount: number;
  chapterCount: number;
  collectionCount: number;
  lastActivityAt: string | null;
}

export interface FamilyTheme {
  label: string;
  memoryCount: number;
  /** How many family members have memories in this theme. */
  profileCount: number;
}

export interface FamilyIntelligence {
  profiles: FamilyProfileStats[];
  themes: FamilyTheme[];
  observations: RemyObservation[];
  totalMemories: number;
  totalDated: number;
  profileCount: number;
}

interface MemoryRow {
  memory_profile_id: string | null;
  ai_category: string | null;
  memory_date: string | null;
  created_at: string;
}

const GENERIC_CATEGORIES = new Set([
  "",
  "general",
  "uncategorized",
  "memory",
  "other",
]);
// A family is small; these bounds keep one query cheap at any scale.
const MAX_PROFILES = 50;
const ROW_CAP = 8000;
const MIN_COLLECTION_MEMBERS = 3;
const MIN_CHAPTER_DATED = 2;
const MAX_THEMES = 6;

function clean(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function themeOf(category: string | null): { slug: string; label: string } | null {
  const c = clean(category);
  if (!c || GENERIC_CATEGORIES.has(c.toLowerCase())) return null;
  return { slug: c.toLowerCase(), label: titleCase(c) };
}

interface ProfileAgg {
  memoryCount: number;
  datedCount: number;
  lastMs: number;
  lastActivityAt: string | null;
  datedDecades: Set<number>;
  categoryCounts: Map<string, number>;
}

export async function getFamilyIntelligence(
  supabase: DashboardSupabase,
  profiles: { id: string; name: string }[]
): Promise<FamilyIntelligence> {
  const scoped = profiles.slice(0, MAX_PROFILES);
  const nameById = new Map(scoped.map((p) => [p.id, p.name]));
  const ids = scoped.map((p) => p.id);
  if (ids.length === 0) {
    return emptyFamily(profiles.length);
  }

  const rows = await fetchProfileMemories(supabase, ids);

  const aggById = new Map<string, ProfileAgg>();
  const themeMap = new Map<
    string,
    { label: string; total: number; profiles: Set<string> }
  >();
  let totalMemories = 0;
  let totalDated = 0;

  for (const r of rows) {
    const pid = r.memory_profile_id;
    if (!pid || !nameById.has(pid)) continue;
    totalMemories += 1;

    let agg = aggById.get(pid);
    if (!agg) {
      agg = {
        memoryCount: 0,
        datedCount: 0,
        lastMs: -Infinity,
        lastActivityAt: null,
        datedDecades: new Set(),
        categoryCounts: new Map(),
      };
      aggById.set(pid, agg);
    }
    agg.memoryCount += 1;

    if (r.memory_date) {
      agg.datedCount += 1;
      totalDated += 1;
      const year = resolveEffectiveDate(r).getFullYear();
      if (!Number.isNaN(year)) agg.datedDecades.add(Math.floor(year / 10) * 10);
    }

    const createdMs = new Date(r.created_at).getTime();
    if (!Number.isNaN(createdMs) && createdMs > agg.lastMs) {
      agg.lastMs = createdMs;
      agg.lastActivityAt = r.created_at;
    }

    const theme = themeOf(r.ai_category);
    if (theme) {
      agg.categoryCounts.set(
        theme.slug,
        (agg.categoryCounts.get(theme.slug) ?? 0) + 1
      );
      const t = themeMap.get(theme.slug) ?? {
        label: theme.label,
        total: 0,
        profiles: new Set<string>(),
      };
      t.total += 1;
      t.profiles.add(pid);
      themeMap.set(theme.slug, t);
    }
  }

  const profileStats: FamilyProfileStats[] = scoped
    .map((p) => {
      const agg = aggById.get(p.id);
      if (!agg) {
        return {
          id: p.id,
          name: p.name,
          memoryCount: 0,
          datedCount: 0,
          chapterCount: 0,
          collectionCount: 0,
          lastActivityAt: null,
        };
      }
      const collectionCount = [...agg.categoryCounts.values()].filter(
        (n) => n >= MIN_COLLECTION_MEMBERS
      ).length;
      const chapterCount =
        agg.datedCount >= MIN_CHAPTER_DATED ? agg.datedDecades.size : 0;
      return {
        id: p.id,
        name: p.name,
        memoryCount: agg.memoryCount,
        datedCount: agg.datedCount,
        chapterCount,
        collectionCount,
        lastActivityAt: agg.lastActivityAt,
      };
    })
    // Show every family member (incl. those with no memories yet); active
    // members first, empty ones last.
    .sort(
      (a, b) =>
        new Date(b.lastActivityAt ?? 0).getTime() -
          new Date(a.lastActivityAt ?? 0).getTime() ||
        b.memoryCount - a.memoryCount
    );

  const themes: FamilyTheme[] = [...themeMap.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, MAX_THEMES)
    .map((t) => ({
      label: t.label,
      memoryCount: t.total,
      profileCount: t.profiles.size,
    }));

  const observations = buildFamilyObservations({
    profileStats,
    themes,
    totalMemories,
    totalDated,
  });

  return {
    profiles: profileStats,
    themes,
    observations,
    totalMemories,
    totalDated,
    profileCount: profileStats.length,
  };
}

function buildFamilyObservations(input: {
  profileStats: FamilyProfileStats[];
  themes: FamilyTheme[];
  totalMemories: number;
  totalDated: number;
}): RemyObservation[] {
  const out: RemyObservation[] = [];
  const add = (
    id: string,
    priority: number,
    tone: RemyObservation["tone"],
    text: string,
    cta?: RemyObservation["cta"]
  ) =>
    out.push({
      id,
      surface: "caregiver",
      tone,
      mood: TONE_MOOD[tone],
      priority,
      text,
      cta,
    });

  // Most recent activity centered around the most-recently-active member.
  const mostActive = input.profileStats.find((p) => p.lastActivityAt);
  if (mostActive) {
    add(
      "family-active",
      60,
      "informative",
      `Most recent activity is centered around ${mostActive.name}.`
    );
  }

  // A theme several family members share.
  const shared = input.themes.find((t) => t.profileCount >= 2);
  if (shared) {
    add(
      "family-shared-theme",
      50,
      "encouraging",
      `Several family members share ${shared.label} memories.`
    );
  }

  // Dating nudge across the family.
  if (
    input.totalMemories > 0 &&
    input.totalDated / input.totalMemories < 0.5
  ) {
    add(
      "family-dates",
      45,
      "gentle",
      `Most family memories still need dates — adding them helps Remy understand each story.`,
      { label: "Add memory dates", href: "/memory-dates" }
    );
  }

  return out.sort((a, b) => b.priority - a.priority);
}

function emptyFamily(profileCount: number): FamilyIntelligence {
  return {
    profiles: [],
    themes: [],
    observations: [],
    totalMemories: 0,
    totalDated: 0,
    profileCount,
  };
}

async function fetchProfileMemories(
  supabase: DashboardSupabase,
  profileIds: string[]
): Promise<MemoryRow[]> {
  try {
    const { data } = await supabase
      .from("memories")
      .select("memory_profile_id, ai_category, memory_date, created_at")
      .in("memory_profile_id", profileIds)
      .order("created_at", { ascending: false })
      .limit(ROW_CAP);
    return (data as MemoryRow[] | null) ?? [];
  } catch {
    return [];
  }
}
