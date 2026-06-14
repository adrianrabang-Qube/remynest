import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { resolveActiveProfileId } from "@/lib/context-resolver";
import { getAccessibleProfiles } from "@/lib/profile-access";
import { getRemyCollections } from "@/lib/remy/collections";
import { getRemyConnections } from "@/lib/remy/connections";
import { getRemyLifeChapters } from "@/lib/remy/life-chapters";

import { EMPTY_RESULTS, type SearchHit, type SearchResults } from "@/components/search/types";

/**
 * Global keyword search (Search V2). One request fans out across every indexed
 * surface — memories (title/content ILIKE), collections, connections, chapters
 * and people (name match) — and returns grouped, render-ready hits. No
 * embeddings, no vector search, no AI: this is the free, fast retrieval layer.
 * The premium semantic endpoints (/api/search, /api/memories/search) are
 * unchanged and remain available as a future "smart" mode.
 */

const MEMORY_LIMIT = 20;
const GROUP_LIMIT = 12;
const MIN_QUERY = 2;

/** Strip PostgREST-significant characters so user input can't break .or(). */
function sanitize(query: string): string {
  return query.replace(/[,()%*\\]/g, " ").replace(/\s+/g, " ").trim();
}

function matches(value: string | null | undefined, needle: string): boolean {
  return (value ?? "").toLowerCase().includes(needle);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw = "";
  try {
    const body = (await request.json()) as { query?: unknown };
    raw = typeof body.query === "string" ? body.query : "";
  } catch {
    raw = "";
  }

  const query = sanitize(raw);
  if (query.length < MIN_QUERY) {
    return NextResponse.json(EMPTY_RESULTS satisfies SearchResults);
  }
  const needle = query.toLowerCase();

  try {
    const activeProfileId = await resolveActiveProfileId();

    // Memory keyword search — RLS scopes by user; we additionally narrow to the
    // active workspace exactly as Memories/Dashboard/Profile do.
    let memoryQuery = supabase
      .from("memories")
      .select(
        "id, title, content, ai_title, ai_summary, ai_category, created_at, memory_date, memory_date_precision",
      )
      .or(
        [
          `title.ilike.%${query}%`,
          `content.ilike.%${query}%`,
          `ai_title.ilike.%${query}%`,
          `ai_summary.ilike.%${query}%`,
          `ai_category.ilike.%${query}%`,
        ].join(","),
      )
      .order("created_at", { ascending: false })
      .limit(MEMORY_LIMIT);
    memoryQuery = activeProfileId
      ? memoryQuery.eq("memory_profile_id", activeProfileId)
      : memoryQuery.is("memory_profile_id", null);

    const [memoryResult, collections, connections, chapters, profiles] =
      await Promise.all([
        memoryQuery,
        getRemyCollections(supabase, user.id, { limit: 100 }),
        getRemyConnections(supabase, user.id, { limit: 100 }),
        getRemyLifeChapters(supabase, user.id, { limit: 100 }),
        getAccessibleProfiles(),
      ]);

    const results: SearchResults = { ...EMPTY_RESULTS };

    results.memories = (memoryResult.data ?? []).map(
      (m): SearchHit => ({
        id: m.id,
        type: "memory",
        title: m.ai_title || m.title || "Untitled memory",
        preview: m.ai_summary || m.content || undefined,
        meta: m.ai_category ?? undefined,
        href: `/memories/${m.id}`,
      }),
    );

    results.collections = collections
      .filter((c) => matches(c.title, needle))
      .slice(0, GROUP_LIMIT)
      .map(
        (c): SearchHit => ({
          id: c.id,
          type: "collection",
          title: c.title,
          meta: `${c.memoryCount} ${c.memoryCount === 1 ? "memory" : "memories"}`,
          href: `/collections/${c.id}`,
        }),
      );

    results.connections = connections
      .filter((c) => matches(c.title, needle))
      .slice(0, GROUP_LIMIT)
      .map(
        (c): SearchHit => ({
          id: c.id,
          type: "connection",
          title: c.title,
          meta: `${c.connectedCount} connected`,
          href: `/connections/${c.id}`,
        }),
      );

    results.chapters = chapters
      .filter((c) => matches(c.title, needle))
      .slice(0, GROUP_LIMIT)
      .map(
        (c): SearchHit => ({
          id: c.id,
          type: "chapter",
          title: c.title,
          meta: `${c.memoryCount} ${c.memoryCount === 1 ? "memory" : "memories"}`,
          href: `/chapters/${c.id}`,
        }),
      );

    results.people = (profiles ?? [])
      .map((p) => {
        // Profile name fields arrive as `unknown` (index signature); narrow safely.
        const preferred =
          typeof p.preferred_name === "string" ? p.preferred_name : "";
        const profileName =
          typeof p.profile_name === "string" ? p.profile_name : "";
        return { id: p.id, label: preferred || profileName };
      })
      .filter((p) => matches(p.label, needle))
      .slice(0, GROUP_LIMIT)
      .map(
        (p): SearchHit => ({
          id: p.id,
          type: "person",
          title: p.label || "Care profile",
          meta: "Care profile",
          href: `/profiles/${p.id}`,
        }),
      );

    return NextResponse.json(results);
  } catch {
    // Expected business failure — return structured empty results, never throw.
    return NextResponse.json(EMPTY_RESULTS satisfies SearchResults);
  }
}
