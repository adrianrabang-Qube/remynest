"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { getActiveContext } from "@/lib/active-profile";
import {
  userCanAccessProfile,
  userCanWriteProfile,
} from "@/lib/profile-ownership";
import { memoriesBelongToWorkspace } from "@/lib/stories/queries";
import {
  normalizeLinkedMemoryIds,
  normalizeSongFields,
  type SongMemoryRecord,
} from "@/lib/music-memories/types";

/**
 * Music Memories — server actions (Story Builder conventions): STRUCTURED
 * results, never throw; SESSION-derived actor; authorize against the song
 * memory's OWN workspace context; service-role writes explicitly scoped.
 * Links are OPTIONAL — when present, every linked memory is verified to
 * belong to the song's workspace (exact-count check, REUSING Story Builder's
 * `memoriesBelongToWorkspace`; Story Builder itself is untouched).
 * Probe-gated pre-migration. NO audio anywhere in v1.
 */

export type SongActionResult =
  | { ok: true; songId?: string }
  | {
      ok: false;
      reason: "unauthenticated" | "forbidden" | "invalid" | "unavailable";
    };

function isMissingRelation(
  error: { code?: string; message?: string } | null,
): boolean {
  return (
    !!error &&
    (error.code === "42P01" ||
      /relation .* does not exist/i.test(error.message ?? ""))
  );
}

async function sessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function authorizeSong(
  songId: string,
  userId: string,
  mode: "read" | "write",
): Promise<
  | { ok: true; song: SongMemoryRecord }
  | { ok: false; reason: "forbidden" | "invalid" | "unavailable" }
> {
  const { data, error } = await supabaseAdmin
    .from("song_memories")
    .select("*")
    .eq("id", songId)
    .maybeSingle();
  if (error) {
    return { ok: false, reason: isMissingRelation(error) ? "unavailable" : "invalid" };
  }
  if (!data) return { ok: false, reason: "invalid" };
  const song = {
    ...(data as SongMemoryRecord),
    memory_ids: normalizeLinkedMemoryIds((data as Record<string, unknown>).memory_ids),
  };

  const authorized =
    song.memory_profile_id == null
      ? song.user_id === userId
      : mode === "write"
        ? await userCanWriteProfile(userId, song.memory_profile_id)
        : await userCanAccessProfile(userId, song.memory_profile_id);
  if (!authorized) return { ok: false, reason: "forbidden" };
  return { ok: true, song };
}

/** Links are optional; when present they must ALL belong to the workspace. */
async function linksAuthorized(
  memoryIds: string[],
  userId: string,
  profileId: string | null,
): Promise<boolean> {
  if (memoryIds.length === 0) return true;
  return memoriesBelongToWorkspace(memoryIds, userId, profileId);
}

/** Create a song memory in the ACTIVE validated workspace. */
export async function createSongMemory(input: {
  title: string;
  artist: string;
  era: string;
  note: string;
  memoryIds: unknown;
}): Promise<SongActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const fields = normalizeSongFields(input);
  const memoryIds = normalizeLinkedMemoryIds(input.memoryIds);
  if (!fields.title) return { ok: false, reason: "invalid" };

  const context = await getActiveContext();
  const profileId = context.type === "CARE" ? context.profileId : null;
  if (profileId && !(await userCanWriteProfile(user.id, profileId))) {
    return { ok: false, reason: "forbidden" };
  }
  if (!(await linksAuthorized(memoryIds, user.id, profileId))) {
    return { ok: false, reason: "forbidden" };
  }

  const { data, error } = await supabaseAdmin
    .from("song_memories")
    .insert({
      user_id: user.id,
      memory_profile_id: profileId,
      ...fields,
      memory_ids: memoryIds,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, reason: isMissingRelation(error) ? "unavailable" : "invalid" };
  }

  revalidatePath("/activities/music");
  return { ok: true, songId: String(data.id) };
}

/** Edit song details and/or linked-memory order/removal. */
export async function updateSongMemory(input: {
  songId: string;
  title: string;
  artist: string;
  era: string;
  note: string;
  memoryIds: unknown;
}): Promise<SongActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const auth = await authorizeSong(input.songId, user.id, "write");
  if (!auth.ok) return auth;

  const fields = normalizeSongFields(input);
  const memoryIds = normalizeLinkedMemoryIds(input.memoryIds);
  if (!fields.title) return { ok: false, reason: "invalid" };
  if (
    !(await linksAuthorized(
      memoryIds,
      auth.song.user_id,
      auth.song.memory_profile_id,
    ))
  ) {
    return { ok: false, reason: "forbidden" };
  }

  const { error } = await supabaseAdmin
    .from("song_memories")
    .update({
      ...fields,
      memory_ids: memoryIds,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.songId);
  if (error) return { ok: false, reason: "invalid" };

  revalidatePath("/activities/music");
  revalidatePath(`/activities/music/${input.songId}`);
  return { ok: true, songId: input.songId };
}

/** Deletes ONLY the song-memory view — never linked memories or media. */
export async function deleteSongMemory(
  songId: string,
): Promise<SongActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const auth = await authorizeSong(songId, user.id, "write");
  if (!auth.ok) return auth;

  const { error } = await supabaseAdmin
    .from("song_memories")
    .delete()
    .eq("id", songId);
  if (error) return { ok: false, reason: "invalid" };
  revalidatePath("/activities/music");
  return { ok: true };
}
