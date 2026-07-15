"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { getActiveContext } from "@/lib/active-profile";
import { userCanWriteProfile } from "@/lib/profile-ownership";
import { toStoragePath } from "@/lib/memory-media-signing";
import {
  matchSizeConfig,
  normalizeMatchPhotos,
  normalizeMatchedPairs,
  type MatchGameRecord,
} from "@/lib/memory-match/types";

/**
 * Memory Match — server actions (Memory Puzzles conventions): STRUCTURED
 * results, never throw; SESSION-derived actor; authorize every action against
 * the game's OWN workspace context; service-role writes explicitly scoped.
 * Create verifies EVERY photo: the memory belongs to the active workspace AND
 * the path is one of that memory's own image attachments (canonical
 * toStoragePath comparison — the puzzle pattern). Probe-gated pre-migration.
 */

export type MatchActionResult =
  | { ok: true; gameId?: string }
  | {
      ok: false;
      reason: "unauthenticated" | "forbidden" | "invalid" | "unavailable";
    };

type Attachment = {
  url?: string;
  storagePath?: string;
  mimeType?: string;
  type?: string;
};

const IMAGE_MIME = /^image\//i;

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

async function authorizeGame(
  gameId: string,
  userId: string,
): Promise<
  | { ok: true; game: MatchGameRecord }
  | { ok: false; reason: "forbidden" | "invalid" | "unavailable" }
> {
  const { data, error } = await supabaseAdmin
    .from("match_games")
    .select("*")
    .eq("id", gameId)
    .maybeSingle();
  if (error) {
    return { ok: false, reason: isMissingRelation(error) ? "unavailable" : "invalid" };
  }
  if (!data) return { ok: false, reason: "invalid" };
  const game = {
    ...(data as MatchGameRecord),
    photos: normalizeMatchPhotos((data as Record<string, unknown>).photos),
  };

  const authorized =
    game.memory_profile_id == null
      ? game.user_id === userId
      : await userCanWriteProfile(userId, game.memory_profile_id);
  if (!authorized) return { ok: false, reason: "forbidden" };
  return { ok: true, game };
}

/** Create a game in the ACTIVE workspace from that workspace's own photos. */
export async function createMatchGame(input: {
  photos: unknown; // [{ memoryId, path }] — path may be any signed/raw url form
}): Promise<MatchActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const requested = normalizeMatchPhotos(input.photos);
  const size = matchSizeConfig(requested.length);
  if (!size) return { ok: false, reason: "invalid" };

  const context = await getActiveContext();
  const profileId = context.type === "CARE" ? context.profileId : null;
  if (profileId && !(await userCanWriteProfile(user.id, profileId))) {
    return { ok: false, reason: "forbidden" };
  }

  // Canonicalize the chosen paths; distinct photos only (a pair per photo).
  const chosen = requested.map((p) => ({
    memoryId: p.memoryId,
    path: toStoragePath(p.path),
  }));
  if (
    chosen.some((p) => !p.path) ||
    new Set(chosen.map((p) => p.path)).size !== chosen.length
  ) {
    return { ok: false, reason: "invalid" };
  }

  // Authoritative verification: fetch the referenced memories SCOPED BY THIS
  // WORKSPACE; every photo's path must be one of its memory's own image
  // attachments (or cover). A foreign/planted reference cannot save.
  const memoryIds = [...new Set(chosen.map((p) => p.memoryId))];
  let q = supabaseAdmin
    .from("memories")
    .select("id, attachments, cover_image_url")
    .in("id", memoryIds);
  q = profileId
    ? q.eq("memory_profile_id", profileId)
    : q.eq("user_id", user.id).is("memory_profile_id", null);
  const { data: memories, error: memErr } = await q;
  if (memErr || !memories || memories.length !== memoryIds.length) {
    return { ok: false, reason: "forbidden" };
  }

  const pathsByMemory = new Map<string, Set<string>>();
  for (const m of memories) {
    const set = new Set<string>();
    const attachments = (Array.isArray(m.attachments) ? m.attachments : []) as Attachment[];
    for (const a of attachments) {
      const mime = String(a?.mimeType ?? a?.type ?? "");
      if (mime && !IMAGE_MIME.test(mime)) continue;
      const p = toStoragePath(a?.storagePath ?? a?.url);
      if (p) set.add(p);
    }
    const cover = toStoragePath(m.cover_image_url as string | null);
    if (cover) set.add(cover);
    pathsByMemory.set(String(m.id), set);
  }
  for (const p of chosen) {
    if (!pathsByMemory.get(p.memoryId)?.has(p.path as string)) {
      return { ok: false, reason: "forbidden" };
    }
  }

  const { data, error } = await supabaseAdmin
    .from("match_games")
    .insert({
      user_id: user.id,
      memory_profile_id: profileId,
      photos: chosen,
      pairs: size.pairs,
      shuffle_seed: (Math.floor(Math.random() * 2 ** 31) || 1),
      last_played_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, reason: isMissingRelation(error) ? "unavailable" : "invalid" };
  }

  revalidatePath("/activities/match");
  return { ok: true, gameId: String(data.id) };
}

/** Autosave: replace the matched-pair set (normalized server-side). */
export async function saveMatchProgress(
  gameId: string,
  matched: unknown,
): Promise<MatchActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const auth = await authorizeGame(gameId, user.id);
  if (!auth.ok) return auth;

  const pairs = normalizeMatchedPairs(matched, auth.game.pairs);
  const { error } = await supabaseAdmin.from("match_game_progress").upsert({
    game_id: gameId,
    matched: pairs,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    return { ok: false, reason: isMissingRelation(error) ? "unavailable" : "invalid" };
  }
  await supabaseAdmin
    .from("match_games")
    .update({ last_played_at: new Date().toISOString() })
    .eq("id", gameId);
  return { ok: true };
}

/** Completion: history + counter; progress clears so the hub shelf moves it. */
export async function recordMatchCompletion(
  gameId: string,
): Promise<MatchActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const auth = await authorizeGame(gameId, user.id);
  if (!auth.ok) return auth;

  const { error } = await supabaseAdmin
    .from("match_game_completions")
    .insert({ game_id: gameId, user_id: user.id });
  if (error) {
    return { ok: false, reason: isMissingRelation(error) ? "unavailable" : "invalid" };
  }
  await Promise.all([
    supabaseAdmin
      .from("match_games")
      .update({
        completed_count: auth.game.completed_count + 1,
        last_played_at: new Date().toISOString(),
      })
      .eq("id", gameId),
    supabaseAdmin.from("match_game_progress").delete().eq("game_id", gameId),
  ]);

  revalidatePath("/activities/match");
  return { ok: true };
}

/** Replay: clear progress + reshuffle (new seed). */
export async function replayMatchGame(gameId: string): Promise<MatchActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const auth = await authorizeGame(gameId, user.id);
  if (!auth.ok) return auth;

  await Promise.all([
    supabaseAdmin.from("match_game_progress").delete().eq("game_id", gameId),
    supabaseAdmin
      .from("match_games")
      .update({
        shuffle_seed: (Math.floor(Math.random() * 2 ** 31) || 1),
        last_played_at: new Date().toISOString(),
      })
      .eq("id", gameId),
  ]);
  revalidatePath("/activities/match");
  return { ok: true };
}

/** Deletes ONLY the game view — never memories or media. */
export async function deleteMatchGame(gameId: string): Promise<MatchActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const auth = await authorizeGame(gameId, user.id);
  if (!auth.ok) return auth;

  const { error } = await supabaseAdmin
    .from("match_games")
    .delete()
    .eq("id", gameId);
  if (error) return { ok: false, reason: "invalid" };
  revalidatePath("/activities/match");
  return { ok: true };
}
