import { supabaseAdmin } from "@/utils/supabase/admin";
import { toStoragePath } from "@/lib/memory-media-signing";
import {
  normalizeMatchPhotos,
  normalizeMatchedPairs,
  type MatchGameRecord,
} from "./types";

/**
 * Memory Match — server-only reads. Service-role client, so EVERY query is
 * explicitly scoped by workspace context (callers authorize first). Probe-gated:
 * a missing relation (migration not applied) degrades to empty, never throws.
 */

const SIGNED_TTL_SECONDS = 60 * 60;

export type MatchGameSummary = MatchGameRecord & {
  matchedCount: number;
  thumbUrl: string | null;
};

export interface MatchListing {
  inProgress: MatchGameSummary[];
  fresh: MatchGameSummary[];
  finished: MatchGameSummary[];
  /** False when the migration hasn't been applied yet (operator-gated). */
  available: boolean;
}

function normalizeGame(row: Record<string, unknown>): MatchGameRecord {
  return {
    ...(row as unknown as MatchGameRecord),
    photos: normalizeMatchPhotos(row.photos),
  };
}

function scopeGames(userId: string, activeProfileId: string | null) {
  const q = supabaseAdmin.from("match_games").select("*");
  return activeProfileId
    ? q.eq("memory_profile_id", activeProfileId)
    : q.eq("user_id", userId).is("memory_profile_id", null);
}

export async function listMatchGames(
  userId: string,
  activeProfileId: string | null,
): Promise<MatchListing> {
  const { data, error } = await scopeGames(userId, activeProfileId).order(
    "last_played_at",
    { ascending: false, nullsFirst: false },
  );
  if (error) return { inProgress: [], fresh: [], finished: [], available: false };

  const rows = (data ?? []).map((r) => normalizeGame(r as Record<string, unknown>));
  const ids = rows.map((r) => r.id);
  const matchedByGame = new Map<string, number>();
  const urlByPath = new Map<string, string>();

  if (ids.length > 0) {
    const thumbPaths = [
      ...new Set(
        rows
          .map((r) => toStoragePath(r.photos[0]?.path))
          .filter(Boolean) as string[],
      ),
    ];
    const [{ data: prog }, signed] = await Promise.all([
      supabaseAdmin
        .from("match_game_progress")
        .select("game_id, matched")
        .in("game_id", ids),
      thumbPaths.length > 0
        ? supabaseAdmin.storage
            .from("memory-media")
            .createSignedUrls(thumbPaths, SIGNED_TTL_SECONDS)
        : Promise.resolve({ data: null }),
    ]);
    for (const p of prog ?? []) {
      matchedByGame.set(
        String(p.game_id),
        normalizeMatchedPairs(p.matched, 8).length,
      );
    }
    (signed.data ?? []).forEach((s, i) => {
      if (s?.signedUrl) urlByPath.set(thumbPaths[i], s.signedUrl);
    });
  }

  const summaries: MatchGameSummary[] = rows.map((r) => ({
    ...r,
    matchedCount: matchedByGame.get(r.id) ?? 0,
    thumbUrl: urlByPath.get(toStoragePath(r.photos[0]?.path) ?? "") ?? null,
  }));

  return {
    inProgress: summaries.filter((r) => r.matchedCount > 0),
    fresh: summaries.filter(
      (r) => r.matchedCount === 0 && r.completed_count === 0,
    ),
    finished: summaries.filter(
      (r) => r.completed_count > 0 && r.matchedCount === 0,
    ),
    available: true,
  };
}

/** One playable card photo: signed url + a gentle label from its memory title. */
export interface MatchCardPhoto {
  pairIndex: number;
  imageUrl: string | null;
  label: string;
}

export async function getMatchGame(gameId: string): Promise<{
  game: MatchGameRecord;
  matched: number[];
  cardPhotos: MatchCardPhoto[];
} | null> {
  const { data, error } = await supabaseAdmin
    .from("match_games")
    .select("*")
    .eq("id", gameId)
    .maybeSingle();
  if (error || !data) return null;
  const game = normalizeGame(data as Record<string, unknown>);

  const paths = game.photos
    .map((p) => toStoragePath(p.path))
    .filter(Boolean) as string[];
  const memoryIds = [...new Set(game.photos.map((p) => p.memoryId))];

  // Titles are fetched scoped by the game's OWN workspace (defense in depth —
  // a foreign memory id could never have been saved, and can't resolve here).
  let titleQuery = supabaseAdmin
    .from("memories")
    .select("id, title")
    .in("id", memoryIds);
  titleQuery = game.memory_profile_id
    ? titleQuery.eq("memory_profile_id", game.memory_profile_id)
    : titleQuery.eq("user_id", game.user_id).is("memory_profile_id", null);

  const [{ data: prog }, signed, { data: titleRows }] = await Promise.all([
    supabaseAdmin
      .from("match_game_progress")
      .select("*")
      .eq("game_id", gameId)
      .maybeSingle(),
    paths.length > 0
      ? supabaseAdmin.storage
          .from("memory-media")
          .createSignedUrls(paths, SIGNED_TTL_SECONDS)
      : Promise.resolve({ data: null }),
    titleQuery,
  ]);

  const urlByPath = new Map<string, string>();
  (signed?.data ?? []).forEach((s, i) => {
    if (s?.signedUrl) urlByPath.set(paths[i], s.signedUrl);
  });
  const titleById = new Map(
    (titleRows ?? []).map((t) => [String(t.id), String(t.title ?? "")]),
  );

  const cardPhotos: MatchCardPhoto[] = game.photos.map((p, i) => ({
    pairIndex: i,
    imageUrl: urlByPath.get(toStoragePath(p.path) ?? "") ?? null,
    label: titleById.get(p.memoryId) || `Photo ${i + 1}`,
  }));

  return {
    game,
    matched: normalizeMatchedPairs(prog?.matched, game.pairs),
    cardPhotos,
  };
}
