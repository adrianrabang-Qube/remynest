"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveContext } from "@/lib/active-profile";
import {
  buildStoryConversationInputs,
  type StorySnapshot,
} from "@/lib/remy/story-pipeline";
import { executeConversationWithUsage } from "@/lib/remy/execute-conversation-with-usage";
import type { DatedMemory, FamilyPerson } from "@/lib/remy/core/family-types";

/**
 * Phase 25 — the FIRST user-facing invocation of `executeConversation`. A user explicitly asks Remy to
 * narrate their story; this server action loads the REAL, workspace-scoped snapshot (exactly like
 * `/api/remy/relationship-snapshot`), runs the EXISTING deterministic companion pipeline server-side to build
 * the conversation inputs, and calls `executeConversation` (→ `getProductionProvider()` → OpenAIProvider).
 *
 * Server-authoritative: the prompt is built entirely from the database here — the client supplies NOTHING,
 * so it cannot craft or bill arbitrary provider calls. Auth-gated + workspace-scoped (My Nest = null profile /
 * owner; care = active profile from the cookie). Structured result, NEVER throws (a provider/network failure —
 * incl. an unconfigured `OPENAI_API_KEY` — degrades to a safe "unavailable" state). It does NOT touch the live
 * Ask Remy chat or the app-open path (RemyRelationship).
 */

const MEMORY_LIMIT = 300;
const PEOPLE_LIMIT = 200;
const MAX_ANSWER_LENGTH = 8000;

export type StoryConversationStatus = "generated" | "empty" | "unavailable";

export interface StoryConversationResult {
  /** The narrated story text from the provider, or null when empty/unavailable. */
  text: string | null;
  status: StoryConversationStatus;
  /** Workspace memory count (for the UI's empty-state copy). */
  memoryCount: number;
}

/**
 * Load the workspace-scoped snapshot the deterministic pipeline consumes. Mirrors the read-only
 * `/api/remy/relationship-snapshot` route (same queries + scoping); returns null when unauthenticated and
 * degrades to empties on a failed read.
 */
async function loadStorySnapshot(): Promise<
  (StorySnapshot & { memoryCount: number; userId: string; workspaceId: string | null }) | null
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const context = await getActiveContext();
    const activeProfileId = context.type === "CARE" ? context.profileId : null;

    let countQuery = supabase.from("memories").select("id", { count: "exact", head: true });
    countQuery = activeProfileId
      ? countQuery.eq("memory_profile_id", activeProfileId)
      : countQuery.is("memory_profile_id", null).eq("user_id", user.id);

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

    let peopleQuery = supabase
      .from("people")
      .select("id, display_name, mention_count")
      .eq("status", "active")
      .order("mention_count", { ascending: false })
      .limit(PEOPLE_LIMIT);
    peopleQuery = activeProfileId
      ? peopleQuery.eq("memory_profile_id", activeProfileId)
      : peopleQuery.is("memory_profile_id", null).eq("created_by_account_id", user.id);

    const [countRes, memRes, peopleRes] = await Promise.all([countQuery, memQuery, peopleQuery]);

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

    const datedMemories: DatedMemory[] = ((memRes.data ?? []) as Array<{
      id?: string;
      title?: string;
      created_at?: string;
      memory_date?: string | null;
      memory_date_precision?: string | null;
      ai_category?: string | null;
      attachments?: unknown;
      ai_importance?: number | null;
    }>)
      .map((m): DatedMemory | null => {
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
          precision,
          category: typeof m.ai_category === "string" && m.ai_category ? m.ai_category : null,
          attachmentCount: Array.isArray(m.attachments) ? m.attachments.length : 0,
          importance: typeof m.ai_importance === "number" ? m.ai_importance : 0,
          historical,
          peopleIds: peopleByMemory.get(id) ?? [],
        };
      })
      .filter((m): m is DatedMemory => m != null);

    const people: FamilyPerson[] = ((peopleRes.data ?? []) as Array<{
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

    return {
      people,
      datedMemories,
      memoryCount: countRes.count ?? 0,
      userId: user.id,
      workspaceId: activeProfileId,
    };
  } catch {
    // Unauthenticated OR a degraded read/context error → null, surfaced by the caller as "unavailable"
    // (never conflated with a genuinely empty workspace, and never thrown).
    return null;
  }
}

/**
 * Narrate the active workspace's life story via the deterministic pipeline + the production provider. Never
 * throws — returns a structured status the UI renders.
 */
export async function narrateStoryConversation(): Promise<StoryConversationResult> {
  // Whole body guarded so the "never throws" contract holds even if auth/context/provider fails.
  try {
    const snapshot = await loadStorySnapshot();
    if (!snapshot) return { text: null, status: "unavailable", memoryCount: 0 };
    if (snapshot.datedMemories.length === 0) {
      // No memories → never call the provider (nothing to narrate, no wasted/ungrounded call).
      return { text: null, status: "empty", memoryCount: snapshot.memoryCount };
    }

    const inputs = buildStoryConversationInputs({
      people: snapshot.people,
      datedMemories: snapshot.datedMemories,
    });
    const response = await executeConversationWithUsage(inputs, {
      userId: snapshot.userId,
      workspaceId: snapshot.workspaceId,
      operation: "story_narration",
    });
    const text = (response.text ?? "").trim().slice(0, MAX_ANSWER_LENGTH) || null;
    return {
      text,
      status: text ? "generated" : "unavailable",
      memoryCount: snapshot.memoryCount,
    };
  } catch {
    // Provider/network/auth/context failure (incl. an unconfigured OPENAI_API_KEY) → safe, non-throwing degrade.
    return { text: null, status: "unavailable", memoryCount: 0 };
  }
}
