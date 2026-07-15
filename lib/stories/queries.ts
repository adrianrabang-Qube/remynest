import { supabaseAdmin } from "@/utils/supabase/admin";
import { signMemories, stripEmbedding } from "@/lib/memory-media-signing";
import { normalizeMemoryIds, type StoryRecord } from "./types";

/**
 * Story Builder — server-only reads (RSC + actions). Service-role client, so
 * EVERY query is explicitly scoped by workspace context (callers authorize
 * first — see actions.ts / the pages). Probe-gated: a missing relation
 * (migration not applied) degrades to empty results, never throws.
 */

export interface StoryListing {
  stories: StoryRecord[];
  /** False when the migration hasn't been applied yet (operator-gated). */
  available: boolean;
}

/** A story moment ready to render: the signed memory + display fields. */
export interface StoryMoment {
  id: string;
  title: string;
  content: string;
  memoryDate: string | null;
  /** Signed image url (MEDIUM variant when transforms are on) or null for text moments. */
  imageUrl: string | null;
  imageFallbackUrl: string | null;
}

function normalizeStory(row: Record<string, unknown>): StoryRecord {
  return {
    ...(row as unknown as StoryRecord),
    memory_ids: normalizeMemoryIds(row.memory_ids),
  };
}

function scopeStories(userId: string, activeProfileId: string | null) {
  const q = supabaseAdmin.from("stories").select("*");
  return activeProfileId
    ? q.eq("memory_profile_id", activeProfileId)
    : q.eq("user_id", userId).is("memory_profile_id", null);
}

export async function listStories(
  userId: string,
  activeProfileId: string | null,
): Promise<StoryListing> {
  const { data, error } = await scopeStories(userId, activeProfileId).order(
    "updated_at",
    { ascending: false },
  );
  if (error) return { stories: [], available: false };
  return {
    stories: (data ?? []).map((r) => normalizeStory(r as Record<string, unknown>)),
    available: true,
  };
}

export async function getStory(storyId: string): Promise<StoryRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("stories")
    .select("*")
    .eq("id", storyId)
    .maybeSingle();
  if (error || !data) return null;
  return normalizeStory(data as Record<string, unknown>);
}

type SignedAttachment = {
  url?: string;
  fallbackUrl?: string;
  mimeType?: string;
  type?: string;
};

/**
 * The story's memories, in STORY ORDER, signed for reading (private bucket —
 * MEDIUM variant via the established `signMemories` path). Scoped by the
 * story's OWN workspace, so a foreign memory id planted in `memory_ids` can
 * never resolve (defense in depth on top of the save-time verification).
 */
export async function getStoryMoments(story: StoryRecord): Promise<StoryMoment[]> {
  if (story.memory_ids.length === 0) return [];
  let q = supabaseAdmin
    .from("memories")
    .select("*")
    .in("id", story.memory_ids);
  q = story.memory_profile_id
    ? q.eq("memory_profile_id", story.memory_profile_id)
    : q.eq("user_id", story.user_id).is("memory_profile_id", null);
  const { data, error } = await q;
  if (error || !data) return [];

  const signed = await signMemories(stripEmbedding(data), {
    variant: "medium",
    maxImagesPerMemory: 1,
  });
  const byId = new Map(
    (signed as Array<Record<string, unknown>>).map((m) => [String(m.id), m]),
  );

  return story.memory_ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((m) => {
      const mem = m as Record<string, unknown>;
      const attachments = (Array.isArray(mem.attachments)
        ? mem.attachments
        : []) as SignedAttachment[];
      const image = attachments.find((a) => {
        const mime = String(a?.mimeType ?? a?.type ?? "");
        return !!a?.url && (!mime || mime.startsWith("image"));
      });
      return {
        id: String(mem.id),
        title: typeof mem.title === "string" ? mem.title : "",
        content: typeof mem.content === "string" ? mem.content : "",
        memoryDate:
          typeof mem.memory_date === "string"
            ? mem.memory_date
            : typeof mem.created_at === "string"
              ? mem.created_at
              : null,
        imageUrl: image?.url ?? null,
        imageFallbackUrl: image?.fallbackUrl ?? null,
      };
    });
}

/**
 * Save-time ownership check: true only when EVERY id is a real memory in the
 * given workspace (count must match exactly — no foreign/deleted ids).
 */
export async function memoriesBelongToWorkspace(
  memoryIds: string[],
  userId: string,
  profileId: string | null,
): Promise<boolean> {
  if (memoryIds.length === 0) return false;
  let q = supabaseAdmin.from("memories").select("id").in("id", memoryIds);
  q = profileId
    ? q.eq("memory_profile_id", profileId)
    : q.eq("user_id", userId).is("memory_profile_id", null);
  const { data, error } = await q;
  if (error) return false;
  return new Set((data ?? []).map((r) => String(r.id))).size === memoryIds.length;
}
