import { supabaseAdmin } from "@/utils/supabase/admin";
import { toStoragePath } from "@/lib/memory-media-signing";
import { normalizePlacements } from "./grid";
import type { PuzzleProgressRecord, PuzzleRecord } from "./types";

/**
 * Memory Puzzles — server-only reads (RSC + actions). Service-role client, so
 * EVERY query is explicitly scoped by workspace context (the caller authorizes
 * the context first — see actions.ts / the hub page). Probe-gated: a missing
 * relation (migration not applied) degrades to empty results, never throws.
 */

const SIGNED_TTL_SECONDS = 60 * 60; // play-session length; refreshed per visit

export type PuzzleSummary = PuzzleRecord & {
  placedCount: number;
  imageUrl: string | null;
};

export interface PuzzleListing {
  inProgress: PuzzleSummary[];
  favourites: PuzzleSummary[];
  finished: PuzzleSummary[];
  fresh: PuzzleSummary[];
  /** False when the migration hasn't been applied yet (operator-gated). */
  available: boolean;
}

function scopePuzzles(userId: string, activeProfileId: string | null) {
  const q = supabaseAdmin.from("puzzles").select("*");
  // Workspace scoping mirrors memories: care workspace = profile-scoped (all
  // caregivers with access), My Nest = the user's own null-profile puzzles.
  return activeProfileId
    ? q.eq("memory_profile_id", activeProfileId)
    : q.eq("user_id", userId).is("memory_profile_id", null);
}

export async function listPuzzles(
  userId: string,
  activeProfileId: string | null,
): Promise<PuzzleListing> {
  const { data, error } = await scopePuzzles(userId, activeProfileId).order(
    "last_played_at",
    { ascending: false, nullsFirst: false },
  );
  if (error) {
    // Missing relation (pre-migration) or degraded read → empty, never throw.
    return { inProgress: [], favourites: [], finished: [], fresh: [], available: false };
  }

  const rows = (data ?? []) as PuzzleRecord[];
  const ids = rows.map((r) => r.id);
  const progressByPuzzle = new Map<string, number>();
  const urlByPath = new Map<string, string>();

  if (ids.length > 0) {
    // One progress read + ONE batched sign for every card thumbnail.
    const paths = [
      ...new Set(
        rows
          .map((r) => toStoragePath(r.image_path))
          .filter(Boolean) as string[],
      ),
    ];
    const [{ data: prog }, signed] = await Promise.all([
      supabaseAdmin
        .from("puzzle_progress")
        .select("puzzle_id, placed_count")
        .in("puzzle_id", ids),
      paths.length > 0
        ? supabaseAdmin.storage
            .from("memory-media")
            .createSignedUrls(paths, SIGNED_TTL_SECONDS)
        : Promise.resolve({ data: null }),
    ]);
    for (const p of prog ?? []) {
      progressByPuzzle.set(String(p.puzzle_id), Number(p.placed_count ?? 0));
    }
    (signed.data ?? []).forEach((s, i) => {
      if (s?.signedUrl) urlByPath.set(paths[i], s.signedUrl);
    });
  }

  const summaries: PuzzleSummary[] = rows.map((r) => ({
    ...r,
    placedCount: progressByPuzzle.get(r.id) ?? 0,
    imageUrl: urlByPath.get(toStoragePath(r.image_path) ?? "") ?? null,
  }));

  const inProgress = summaries.filter((r) => r.placedCount > 0);
  const finished = summaries.filter(
    (r) => r.completed_count > 0 && r.placedCount === 0,
  );
  const favourites = summaries.filter((r) => r.favourite);
  const fresh = summaries.filter(
    (r) => r.completed_count === 0 && r.placedCount === 0,
  );
  return { inProgress, favourites, finished, fresh, available: true };
}

/** One puzzle + its progress + a signed play-session image URL. */
export async function getPuzzleWithProgress(puzzleId: string): Promise<{
  puzzle: PuzzleRecord;
  placements: number[];
  imageUrl: string | null;
} | null> {
  const { data, error } = await supabaseAdmin
    .from("puzzles")
    .select("*")
    .eq("id", puzzleId)
    .maybeSingle();
  if (error || !data) return null;
  const puzzle = data as PuzzleRecord;

  const [{ data: prog }, imageUrl] = await Promise.all([
    supabaseAdmin
      .from("puzzle_progress")
      .select("*")
      .eq("puzzle_id", puzzleId)
      .maybeSingle(),
    signPuzzleImage(puzzle.image_path),
  ]);

  const progress = (prog ?? null) as PuzzleProgressRecord | null;
  return {
    puzzle,
    placements: normalizePlacements(progress?.placements, puzzle.pieces),
    imageUrl,
  };
}

/** Sign the puzzle's private memory-media object for the play session. */
export async function signPuzzleImage(
  imagePath: string,
): Promise<string | null> {
  const path = toStoragePath(imagePath);
  if (!path) return null;
  const { data, error } = await supabaseAdmin.storage
    .from("memory-media")
    .createSignedUrl(path, SIGNED_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
