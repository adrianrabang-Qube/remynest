"use server";

import { createClient } from "@/utils/supabase/server";
import { resolveActiveProfileId } from "@/lib/context-resolver";
import {
  retrieveAskResults,
  type AskRetrievalResults,
} from "@/lib/remy/ask-retrieval";
import type { RetrievalQuery } from "@/lib/remy/retrieval";

/**
 * Server action: run a parsed RetrievalQuery through the deterministic Retrieval
 * Engine, scoped to the active workspace (RLS scopes by account). Returns factual
 * memory candidates only — no AI, no generation, no summaries. The query fields
 * are used by filterMemories (pure JS) and never interpolated into SQL.
 */
export async function askRemyRetrieval(
  query: RetrievalQuery,
): Promise<AskRetrievalResults> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { results: [] };

  const memoryProfileId = await resolveActiveProfileId();
  return retrieveAskResults(supabase, query, memoryProfileId);
}
