import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { resolveActiveProfileId } from "@/lib/context-resolver";
import { getSearchHealth } from "@/lib/remy/search-health";
import SearchView from "@/components/search/SearchView";
import RemySearchInsights from "@/components/remy/RemySearchInsights";

export const dynamic = "force-dynamic";

/**
 * Search V2 — the single global retrieval destination. Keyword search across
 * memories, collections, connections, chapters and people, grouped by type. The
 * actual search is a client-driven fan-out to /api/search/global (one request).
 * A small, factual Search Insights readout sits above it (deterministic
 * search-health over the active workspace's memories).
 */
export default async function SearchPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Search-health for the active workspace (same scoping as the search itself).
  const memoryProfileId = await resolveActiveProfileId();
  const health = await getSearchHealth(supabase, memoryProfileId);

  return (
    <>
      <h1 className="sr-only">Search</h1>
      <div className="mx-auto mb-4 w-full max-w-3xl">
        <RemySearchInsights health={health} />
      </div>
      <SearchView />
    </>
  );
}
