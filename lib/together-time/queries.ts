import { supabaseAdmin } from "@/utils/supabase/admin";
import { signMemories, stripEmbedding } from "@/lib/memory-media-signing";
import {
  normalizeTogetherMemoryIds,
  type TogetherTimeRecord,
} from "./types";

/**
 * Together Time — server-only reads. Service-role client, so EVERY query is
 * explicitly scoped by workspace context (callers authorize first). Probe-gated:
 * a missing relation (migration not applied) degrades to empty, never throws.
 *
 * The moment loader is DEDICATED (locked decision): unlike Story Builder's
 * image-only `getStoryMoments` (deliberately untouched), Together Time renders
 * photo, text, AND Voice Memory attachments — so this loader extracts both the
 * first signed image and the first signed audio attachment per memory.
 */

export interface TogetherListing {
  sets: TogetherTimeRecord[];
  /** False when the migration hasn't been applied yet (operator-gated). */
  available: boolean;
}

/** One playable moment: photo and/or words and/or a voice recording. */
export interface TogetherMoment {
  id: string;
  title: string;
  content: string;
  memoryDate: string | null;
  imageUrl: string | null;
  imageFallbackUrl: string | null;
  audioUrl: string | null;
  audioName: string;
}

function normalizeSet(row: Record<string, unknown>): TogetherTimeRecord {
  return {
    ...(row as unknown as TogetherTimeRecord),
    memory_ids: normalizeTogetherMemoryIds(row.memory_ids),
    last_opened_at:
      typeof row.last_opened_at === "string" ? row.last_opened_at : null,
  };
}

function scopeSets(userId: string, activeProfileId: string | null) {
  const q = supabaseAdmin.from("together_times").select("*");
  return activeProfileId
    ? q.eq("memory_profile_id", activeProfileId)
    : q.eq("user_id", userId).is("memory_profile_id", null);
}

export async function listTogetherTimes(
  userId: string,
  activeProfileId: string | null,
): Promise<TogetherListing> {
  const { data, error } = await scopeSets(userId, activeProfileId)
    .order("last_opened_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });
  if (error) return { sets: [], available: false };
  return {
    sets: (data ?? []).map((r) => normalizeSet(r as Record<string, unknown>)),
    available: true,
  };
}

export async function getTogetherTime(
  id: string,
): Promise<TogetherTimeRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("together_times")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return normalizeSet(data as Record<string, unknown>);
}

type SignedAttachment = {
  url?: string;
  fallbackUrl?: string;
  mimeType?: string;
  type?: string;
  name?: string;
  filename?: string;
};

function mimeOf(a: SignedAttachment): string {
  return String(a?.mimeType ?? a?.type ?? "");
}

/**
 * The set's memories, in SAVED ORDER, signed for the player (private bucket;
 * MEDIUM variant for images via the established `signMemories` path; audio
 * attachment urls are the signed baseline). Scoped by the set's OWN workspace
 * — a planted foreign id can never resolve; deleted memories simply drop out
 * (the player degrades calmly with whatever remains).
 */
export async function getTogetherMoments(
  set: TogetherTimeRecord,
): Promise<TogetherMoment[]> {
  if (set.memory_ids.length === 0) return [];
  let q = supabaseAdmin.from("memories").select("*").in("id", set.memory_ids);
  q = set.memory_profile_id
    ? q.eq("memory_profile_id", set.memory_profile_id)
    : q.eq("user_id", set.user_id).is("memory_profile_id", null);
  const { data, error } = await q;
  if (error || !data) return [];

  const signed = await signMemories(stripEmbedding(data), {
    variant: "medium",
    maxImagesPerMemory: 1,
  });
  const byId = new Map(
    (signed as Array<Record<string, unknown>>).map((m) => [String(m.id), m]),
  );

  return set.memory_ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((m) => {
      const mem = m as Record<string, unknown>;
      const attachments = (Array.isArray(mem.attachments)
        ? mem.attachments
        : []) as SignedAttachment[];
      const image = attachments.find((a) => {
        const mime = mimeOf(a);
        return !!a?.url && (!mime || mime.startsWith("image"));
      });
      const audio = attachments.find(
        (a) => !!a?.url && mimeOf(a).startsWith("audio"),
      );
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
        audioUrl: audio?.url ?? null,
        audioName: audio?.name ?? audio?.filename ?? "Voice recording",
      };
    });
}
