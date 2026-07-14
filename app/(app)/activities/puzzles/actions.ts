"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import {
  userCanAccessProfile,
  userCanWriteProfile,
} from "@/lib/profile-ownership";
import { toStoragePath } from "@/lib/memory-media-signing";
import { normalizePlacements } from "@/lib/puzzles/grid";
import {
  difficultyConfig,
  isValidCrop,
  type PuzzleCrop,
  type PuzzleRecord,
} from "@/lib/puzzles/types";

/**
 * Memory Puzzles — server actions (Phase 1A).
 *
 * Conventions (CLAUDE.md): STRUCTURED results, never throw for business rules;
 * actor is SESSION-derived (never a client id); service-role reads/writes are
 * explicitly scoped by the puzzle's OWN context (not the client cookie);
 * care-workspace writes require `userCanWriteProfile`, reads
 * `userCanAccessProfile` (Production Sprint 2 standard). Probe-gated: before
 * the operator applies the migration, actions return `unavailable` instead of
 * crashing.
 */

export type PuzzleActionResult =
  | { ok: true; puzzleId?: string }
  | { ok: false; reason: "unauthenticated" | "forbidden" | "invalid" | "unavailable" };

type Attachment = {
  url?: string;
  storagePath?: string;
  mimeType?: string;
  name?: string;
};

const IMAGE_MIME = /^image\//i;

function isMissingRelation(error: { code?: string; message?: string } | null): boolean {
  // 42P01 = undefined_table (pre-migration probe-gate).
  return !!error && (error.code === "42P01" || /relation .* does not exist/i.test(error.message ?? ""));
}

async function sessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Fetch a puzzle and authorize the CURRENT user against ITS OWN context. */
async function authorizePuzzle(
  puzzleId: string,
  userId: string,
  mode: "read" | "write",
): Promise<
  | { ok: true; puzzle: PuzzleRecord }
  | { ok: false; reason: "forbidden" | "invalid" | "unavailable" }
> {
  const { data, error } = await supabaseAdmin
    .from("puzzles")
    .select("*")
    .eq("id", puzzleId)
    .maybeSingle();
  if (error) return { ok: false, reason: isMissingRelation(error) ? "unavailable" : "invalid" };
  if (!data) return { ok: false, reason: "invalid" };
  const puzzle = data as PuzzleRecord;

  const authorized =
    puzzle.memory_profile_id == null
      ? puzzle.user_id === userId
      : mode === "write"
        ? await userCanWriteProfile(userId, puzzle.memory_profile_id)
        : await userCanAccessProfile(userId, puzzle.memory_profile_id);
  if (!authorized) return { ok: false, reason: "forbidden" };
  return { ok: true, puzzle };
}

/**
 * Create a puzzle from an EXISTING memory's photo. The image is resolved
 * server-side from the memory's own attachments — the client picks WHICH
 * attachment (by its stored url/path), never supplies an arbitrary path.
 */
export async function createPuzzle(input: {
  memoryId: string;
  attachmentUrl: string;
  crop: PuzzleCrop;
  difficulty: string;
}): Promise<PuzzleActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const diff = difficultyConfig(input.difficulty);
  if (!diff || !isValidCrop(input.crop) || !input.memoryId) {
    return { ok: false, reason: "invalid" };
  }

  // Authoritative memory fetch (service-role, then app-layer authz on the
  // memory's OWN workspace — the puzzle inherits it).
  const { data: memory, error: memErr } = await supabaseAdmin
    .from("memories")
    .select("id, user_id, memory_profile_id, title, attachments, cover_image_url")
    .eq("id", input.memoryId)
    .maybeSingle();
  if (memErr || !memory) return { ok: false, reason: "invalid" };

  const profileId = (memory.memory_profile_id as string | null) ?? null;
  const authorized =
    profileId == null
      ? memory.user_id === user.id
      : await userCanWriteProfile(user.id, profileId);
  if (!authorized) return { ok: false, reason: "forbidden" };

  // The chosen image MUST be one of the memory's own image attachments (or its
  // cover). Compare via canonical storage paths so signed/public URL forms match.
  const wanted = toStoragePath(input.attachmentUrl);
  if (!wanted) return { ok: false, reason: "invalid" };
  const attachments = (Array.isArray(memory.attachments) ? memory.attachments : []) as Attachment[];
  const candidates = [
    ...attachments
      .filter((a) => !a.mimeType || IMAGE_MIME.test(a.mimeType))
      .map((a) => toStoragePath(a.storagePath ?? a.url)),
    toStoragePath(memory.cover_image_url as string | null),
  ].filter(Boolean) as string[];
  if (!candidates.includes(wanted)) return { ok: false, reason: "forbidden" };

  const { data: created, error } = await supabaseAdmin
    .from("puzzles")
    .insert({
      user_id: user.id,
      memory_profile_id: profileId,
      memory_id: memory.id,
      image_path: wanted,
      title: (memory.title as string | null) ?? "",
      crop: input.crop,
      pieces: diff.pieces,
      difficulty: diff.id,
      shuffle_seed: (Math.floor(Math.random() * 2 ** 31) || 1),
      last_played_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !created) {
    return { ok: false, reason: isMissingRelation(error) ? "unavailable" : "invalid" };
  }

  revalidatePath("/activities/puzzles");
  return { ok: true, puzzleId: String(created.id) };
}

/** Autosave: replace the placed-piece set (normalized server-side). */
export async function savePuzzleProgress(
  puzzleId: string,
  placements: unknown,
): Promise<PuzzleActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const auth = await authorizePuzzle(puzzleId, user.id, "write");
  if (!auth.ok) return auth;

  const placed = normalizePlacements(placements, auth.puzzle.pieces);
  const { error } = await supabaseAdmin.from("puzzle_progress").upsert({
    puzzle_id: puzzleId,
    placements: placed,
    placed_count: placed.length,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, reason: isMissingRelation(error) ? "unavailable" : "invalid" };

  await supabaseAdmin
    .from("puzzles")
    .update({ last_played_at: new Date().toISOString() })
    .eq("id", puzzleId);
  return { ok: true };
}

/** Completion: history row + counter; progress clears so the shelf moves it to Finished. */
export async function recordPuzzleCompletion(
  puzzleId: string,
): Promise<PuzzleActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const auth = await authorizePuzzle(puzzleId, user.id, "write");
  if (!auth.ok) return auth;

  const { error } = await supabaseAdmin
    .from("puzzle_completions")
    .insert({ puzzle_id: puzzleId, user_id: user.id });
  if (error) return { ok: false, reason: isMissingRelation(error) ? "unavailable" : "invalid" };

  await Promise.all([
    supabaseAdmin
      .from("puzzles")
      .update({
        completed_count: auth.puzzle.completed_count + 1,
        last_played_at: new Date().toISOString(),
      })
      .eq("id", puzzleId),
    supabaseAdmin.from("puzzle_progress").delete().eq("puzzle_id", puzzleId),
  ]);

  revalidatePath("/activities/puzzles");
  return { ok: true };
}

/** Replay: clear progress + reshuffle (new seed) for a fresh-feeling board. */
export async function replayPuzzle(puzzleId: string): Promise<PuzzleActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const auth = await authorizePuzzle(puzzleId, user.id, "write");
  if (!auth.ok) return auth;

  await Promise.all([
    supabaseAdmin.from("puzzle_progress").delete().eq("puzzle_id", puzzleId),
    supabaseAdmin
      .from("puzzles")
      .update({
        shuffle_seed: (Math.floor(Math.random() * 2 ** 31) || 1),
        last_played_at: new Date().toISOString(),
      })
      .eq("id", puzzleId),
  ]);
  revalidatePath("/activities/puzzles");
  return { ok: true };
}

export async function togglePuzzleFavourite(
  puzzleId: string,
): Promise<PuzzleActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const auth = await authorizePuzzle(puzzleId, user.id, "write");
  if (!auth.ok) return auth;

  const { error } = await supabaseAdmin
    .from("puzzles")
    .update({ favourite: !auth.puzzle.favourite })
    .eq("id", puzzleId);
  if (error) return { ok: false, reason: "invalid" };
  revalidatePath("/activities/puzzles");
  return { ok: true };
}

export async function deletePuzzle(puzzleId: string): Promise<PuzzleActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const auth = await authorizePuzzle(puzzleId, user.id, "write");
  if (!auth.ok) return auth;

  // Deletes only the puzzle VIEW — never the memory or its media (a puzzle is
  // metadata over an existing memory; cascade clears progress/completions).
  const { error } = await supabaseAdmin.from("puzzles").delete().eq("id", puzzleId);
  if (error) return { ok: false, reason: "invalid" };
  revalidatePath("/activities/puzzles");
  return { ok: true };
}
