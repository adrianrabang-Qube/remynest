import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getActiveContext } from "@/lib/active-profile";

/**
 * Read-only data source for the Living Relationship System (RemyRelationship). Returns REAL,
 * workspace-scoped relationship data — memory count, first-memory date, the people extracted from
 * memories (with how many memories mention each), and a bounded set of dated memories (effective
 * date = memory_date ?? created_at) for chapters / anniversaries / legacy. Auth-gated and scoped
 * exactly like the app (My Nest = null profile / owner; care = active profile from the cookie).
 *
 * Fetched ONCE when the shell mounts (never polled). Degraded reads return empties so the companion
 * silently does nothing rather than erroring. No fabricated data — every field is a real query.
 */
export const dynamic = "force-dynamic";

const MEMORY_LIMIT = 300;
const PEOPLE_LIMIT = 200;

interface SnapshotMemory {
  id: string;
  title: string;
  dateIso: string;
  precision: "day" | "month" | "year" | "decade";
  category: string | null;
  attachmentCount: number;
  importance: number;
  historical: boolean;
  peopleIds: string[];
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const context = await getActiveContext();
  const activeProfileId = context.type === "CARE" ? context.profileId : null;
  const isMyNest = !activeProfileId;

  const empty = {
    isMyNest,
    memoryCount: 0,
    firstMemoryDate: null as string | null,
    peopleTotal: 0,
    people: [] as { id: string; name: string; memoryCount: number }[],
    datedMemories: [] as SnapshotMemory[],
  };

  try {
    // --- Memory count (workspace-scoped head count) ---
    let countQuery = supabase.from("memories").select("id", { count: "exact", head: true });
    countQuery = activeProfileId
      ? countQuery.eq("memory_profile_id", activeProfileId)
      : countQuery.is("memory_profile_id", null).eq("user_id", user.id);

    // --- First memory (earliest created_at) ---
    let firstQuery = supabase
      .from("memories")
      .select("created_at")
      .order("created_at", { ascending: true })
      .limit(1);
    firstQuery = activeProfileId
      ? firstQuery.eq("memory_profile_id", activeProfileId)
      : firstQuery.is("memory_profile_id", null).eq("user_id", user.id);

    // --- Recent dated memories (for chapters / anniversaries / legacy) ---
    let memQuery = supabase
      .from("memories")
      .select(
        "id, title, created_at, memory_date, memory_date_precision, ai_category, attachments, ai_importance",
      )
      .order("created_at", { ascending: false })
      .limit(MEMORY_LIMIT);
    memQuery = activeProfileId
      ? memQuery.eq("memory_profile_id", activeProfileId)
      : memQuery.is("memory_profile_id", null).eq("user_id", user.id);

    // --- People extracted from memories (the `people` table + its mention aggregate) ---
    let peopleQuery = supabase
      .from("people")
      .select("id, display_name, mention_count")
      .eq("status", "active")
      .order("mention_count", { ascending: false })
      .limit(PEOPLE_LIMIT);
    peopleQuery = activeProfileId
      ? peopleQuery.eq("memory_profile_id", activeProfileId)
      : peopleQuery.is("memory_profile_id", null).eq("created_by_account_id", user.id);

    const [countRes, firstRes, memRes, peopleRes] = await Promise.all([
      countQuery,
      firstQuery,
      memQuery,
      peopleQuery,
    ]);

    const firstRow = (firstRes.data ?? [])[0] as { created_at?: string } | undefined;

    // People per memory (memory_person_links for the fetched memories) — RLS-scoped to the caller.
    const memoryIds = ((memRes.data ?? []) as Array<{ id?: unknown }>)
      .map((m) => (typeof m.id === "string" ? m.id : null))
      .filter((id): id is string => id != null);

    const peopleByMemory = new Map<string, string[]>();
    if (memoryIds.length > 0) {
      const { data: links } = await supabase
        .from("memory_person_links")
        .select("memory_id, person_id")
        .in("memory_id", memoryIds);
      for (const link of (links ?? []) as Array<{ memory_id?: string; person_id?: string }>) {
        if (typeof link.memory_id !== "string" || typeof link.person_id !== "string") continue;
        const list = peopleByMemory.get(link.memory_id);
        if (list) list.push(link.person_id);
        else peopleByMemory.set(link.memory_id, [link.person_id]);
      }
    }

    const datedMemories: SnapshotMemory[] = ((memRes.data ?? []) as Array<{
      id?: string;
      title?: string;
      created_at?: string;
      memory_date?: string | null;
      memory_date_precision?: string | null;
      ai_category?: string | null;
      attachments?: unknown;
      ai_importance?: number | null;
    }>)
      .map((m) => {
        const id = typeof m.id === "string" ? m.id : null;
        const historical = typeof m.memory_date === "string" && Boolean(m.memory_date);
        const dateIso = historical
          ? (m.memory_date as string)
          : typeof m.created_at === "string"
            ? m.created_at
            : null;
        if (!id || !dateIso) return null;
        const rawPrecision = historical ? m.memory_date_precision : "day";
        const precision =
          rawPrecision === "month" || rawPrecision === "year" || rawPrecision === "decade"
            ? rawPrecision
            : "day";
        return {
          id,
          title: typeof m.title === "string" && m.title ? m.title : "A memory",
          dateIso,
          precision: precision as SnapshotMemory["precision"],
          category: typeof m.ai_category === "string" && m.ai_category ? m.ai_category : null,
          attachmentCount: Array.isArray(m.attachments) ? m.attachments.length : 0,
          importance: typeof m.ai_importance === "number" ? m.ai_importance : 0,
          historical,
          peopleIds: peopleByMemory.get(id) ?? [],
        };
      })
      .filter((m): m is SnapshotMemory => m != null);

    const people = ((peopleRes.data ?? []) as Array<{
      id?: string;
      display_name?: string | null;
      mention_count?: number | null;
    }>)
      .map((p) => ({
        id: typeof p.id === "string" ? p.id : "",
        name: typeof p.display_name === "string" && p.display_name ? p.display_name : "",
        memoryCount: typeof p.mention_count === "number" ? p.mention_count : 0,
      }))
      .filter((p) => p.id && p.name);

    return NextResponse.json(
      {
        isMyNest,
        memoryCount: countRes.count ?? 0,
        firstMemoryDate: firstRow?.created_at ?? null,
        peopleTotal: people.length,
        people,
        datedMemories,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(empty, { headers: { "Cache-Control": "no-store" } });
  }
}
