import type { createClient } from "@/utils/supabase/server";
import { signMemories } from "@/lib/memory-media-signing";
import { resolveEffectiveDate } from "@/lib/memories/memory-date";

type DashboardSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Reminiscence Mode — a calm, caregiver/family experience for revisiting the
 * past. Reuses existing historical (dated) memories and the shared date helpers;
 * read-only, best-effort, no AI, no new scans beyond this one fetch.
 *
 * Memories are grouped into eras (decades) by EFFECTIVE date. Reminiscence is
 * about the past, so only dated memories (memory_date set) are included — undated
 * notes would otherwise all collapse into the present year.
 */
export interface ReminiscenceMemory {
  id: string;
  title: string | null;
  ai_title: string | null;
  ai_summary: string | null;
  content: string | null;
  cover_image_url: string | null;
  attachments: unknown;
  created_at: string;
  memory_date: string | null;
  memory_date_precision: string | null;
}

export interface ReminiscenceEra {
  /** Decade start, e.g. 1980. */
  startYear: number;
  /** "1980s". */
  label: string;
  memoryCount: number;
  /** A few image-forward memories for the era highlight. */
  representative: ReminiscenceMemory[];
  /** All memories in the era, oldest first. */
  memories: ReminiscenceMemory[];
}

export interface ReminiscenceData {
  totalDated: number;
  eras: ReminiscenceEra[];
}

const FETCH_LIMIT = 500;
const REPRESENTATIVE_PER_ERA = 3;

function hasImage(m: ReminiscenceMemory): boolean {
  if (m.cover_image_url) return true;
  if (Array.isArray(m.attachments)) {
    return m.attachments.some(
      (a) =>
        a &&
        typeof a === "object" &&
        (a as { type?: string; url?: string }).type === "image" &&
        Boolean((a as { url?: string }).url)
    );
  }
  return false;
}

export async function getReminiscence(
  supabase: DashboardSupabase,
  memoryProfileId: string | null
): Promise<ReminiscenceData> {
  let rows: ReminiscenceMemory[] = [];
  try {
    let q = supabase
      .from("memories")
      .select(
        "id, title, ai_title, ai_summary, content, cover_image_url, attachments, created_at, memory_date, memory_date_precision"
      )
      .not("memory_date", "is", null)
      .order("memory_date", { ascending: true })
      .limit(FETCH_LIMIT);
    q = memoryProfileId
      ? q.eq("memory_profile_id", memoryProfileId)
      : q.is("memory_profile_id", null);
    const { data } = await q;
    const signed = await signMemories(
      (data as { cover_image_url?: string | null }[] | null) ?? []
    );
    rows = signed as unknown as ReminiscenceMemory[];
  } catch {
    rows = [];
  }

  const eraMap = new Map<number, ReminiscenceMemory[]>();
  for (const m of rows) {
    const year = resolveEffectiveDate(m).getFullYear();
    if (Number.isNaN(year)) continue;
    const decadeStart = Math.floor(year / 10) * 10;
    const list = eraMap.get(decadeStart) ?? [];
    list.push(m);
    eraMap.set(decadeStart, list);
  }

  const eras: ReminiscenceEra[] = [...eraMap.entries()]
    .sort((a, b) => a[0] - b[0]) // oldest era first — a life unfolding
    .map(([startYear, memories]) => {
      const representative = [...memories]
        .sort((a, b) => Number(hasImage(b)) - Number(hasImage(a)))
        .slice(0, REPRESENTATIVE_PER_ERA);
      return {
        startYear,
        label: `${startYear}s`,
        memoryCount: memories.length,
        representative,
        memories,
      };
    });

  return { totalDated: rows.length, eras };
}
