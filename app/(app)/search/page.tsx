import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import SearchView from "@/components/search/SearchView";

export const dynamic = "force-dynamic";

/**
 * Search V2 — the single global retrieval destination. Keyword search across
 * memories, collections, connections, chapters and people, grouped by type. The
 * actual search is a client-driven fan-out to /api/search/global (one request).
 */
export default async function SearchPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <>
      <h1 className="sr-only">Search</h1>
      <SearchView />
    </>
  );
}
