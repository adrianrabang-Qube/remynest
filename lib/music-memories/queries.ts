import { supabaseAdmin } from "@/utils/supabase/admin";
import {
  getStoryMoments,
  type StoryMoment,
} from "@/lib/stories/queries";
import {
  normalizeLinkedMemoryIds,
  type SongMemoryRecord,
} from "./types";

/**
 * Music Memories — server-only reads. Service-role client, so EVERY query is
 * explicitly scoped by workspace context (callers authorize first). Probe-gated:
 * a missing relation (migration not applied) degrades to empty, never throws.
 *
 * Linked memories render through Story Builder's `getStoryMoments` — a
 * structurally generic "ordered, workspace-scoped, signed moments" helper
 * (SongMemoryRecord carries every field it reads). REUSED, not duplicated;
 * Story Builder itself is untouched.
 */

export type { StoryMoment as LinkedMoment };

export interface SongListing {
  songs: SongMemoryRecord[];
  /** False when the migration hasn't been applied yet (operator-gated). */
  available: boolean;
}

function normalizeSong(row: Record<string, unknown>): SongMemoryRecord {
  return {
    ...(row as unknown as SongMemoryRecord),
    memory_ids: normalizeLinkedMemoryIds(row.memory_ids),
    // Probe-gated column: absent until the spotify migration is applied.
    spotify_url: typeof row.spotify_url === "string" ? row.spotify_url : "",
  };
}

function scopeSongs(userId: string, activeProfileId: string | null) {
  const q = supabaseAdmin.from("song_memories").select("*");
  return activeProfileId
    ? q.eq("memory_profile_id", activeProfileId)
    : q.eq("user_id", userId).is("memory_profile_id", null);
}

export async function listSongMemories(
  userId: string,
  activeProfileId: string | null,
): Promise<SongListing> {
  const { data, error } = await scopeSongs(userId, activeProfileId).order(
    "updated_at",
    { ascending: false },
  );
  if (error) return { songs: [], available: false };
  return {
    songs: (data ?? []).map((r) => normalizeSong(r as Record<string, unknown>)),
    available: true,
  };
}

export async function getSongMemory(
  songId: string,
): Promise<SongMemoryRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("song_memories")
    .select("*")
    .eq("id", songId)
    .maybeSingle();
  if (error || !data) return null;
  return normalizeSong(data as Record<string, unknown>);
}

/** The song's linked memories, in saved order, signed for display. */
export async function getLinkedMoments(
  song: SongMemoryRecord,
): Promise<StoryMoment[]> {
  if (song.memory_ids.length === 0) return [];
  return getStoryMoments(song);
}
