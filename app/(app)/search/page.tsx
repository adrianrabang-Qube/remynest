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
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-4">
          <h1 className="font-serif text-2xl font-semibold text-charcoal md:text-3xl">
            Search
          </h1>
          <p className="mt-1 text-sm text-charcoal-muted">
            Find a memory, a person, or a moment — just start typing.
          </p>
        </header>
        <div className="mb-4">
          <RemySearchInsights health={health} />
        </div>
      </div>
      <SearchView />
    </>
  );
}
