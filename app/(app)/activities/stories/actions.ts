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
  STORY_MIN_MOMENTS,
  normalizeMemoryIds,
  normalizeStoryTitle,
  type StoryRecord,
} from "@/lib/stories/types";

/**
 * Story Builder — server actions (mirrors the Memory Puzzles conventions):
 * STRUCTURED results, never throw for business rules; SESSION-derived actor;
 * service-role writes explicitly scoped by the story's OWN workspace context;
 * care writes require `userCanWriteProfile`. Save-time invariant: every
 * referenced memory must belong to the story's workspace. Probe-gated: before
 * the operator applies the migration, actions return `unavailable`.
 */

export type StoryActionResult =
  | { ok: true; storyId?: string }
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

/** Fetch a story and authorize the CURRENT user against ITS OWN context. */
async function authorizeStory(
  storyId: string,
  userId: string,
  mode: "read" | "write",
): Promise<
  | { ok: true; story: StoryRecord }
  | { ok: false; reason: "forbidden" | "invalid" | "unavailable" }
> {
  const { data, error } = await supabaseAdmin
    .from("stories")
    .select("*")
    .eq("id", storyId)
    .maybeSingle();
  if (error) {
    return { ok: false, reason: isMissingRelation(error) ? "unavailable" : "invalid" };
  }
  if (!data) return { ok: false, reason: "invalid" };
  const story = {
    ...(data as StoryRecord),
    memory_ids: normalizeMemoryIds((data as Record<string, unknown>).memory_ids),
  };

  const authorized =
    story.memory_profile_id == null
      ? story.user_id === userId
      : mode === "write"
        ? await userCanWriteProfile(userId, story.memory_profile_id)
        : await userCanAccessProfile(userId, story.memory_profile_id);
  if (!authorized) return { ok: false, reason: "forbidden" };
  return { ok: true, story };
}

/** Create a story in the ACTIVE workspace from that workspace's own memories. */
export async function createStory(input: {
  title: string;
  memoryIds: unknown;
}): Promise<StoryActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const title = normalizeStoryTitle(input.title);
  const memoryIds = normalizeMemoryIds(input.memoryIds);
  if (!title || memoryIds.length < STORY_MIN_MOMENTS) {
    return { ok: false, reason: "invalid" };
  }

  // Workspace = the VALIDATED active context (forged-cookie-safe); care
  // workspaces additionally require write access.
  const context = await getActiveContext();
  const profileId = context.type === "CARE" ? context.profileId : null;
  if (profileId && !(await userCanWriteProfile(user.id, profileId))) {
    return { ok: false, reason: "forbidden" };
  }

  // Every selected memory must belong to THIS workspace (exact-count check).
  if (!(await memoriesBelongToWorkspace(memoryIds, user.id, profileId))) {
    return { ok: false, reason: "forbidden" };
  }

  const { data, error } = await supabaseAdmin
    .from("stories")
    .insert({
      user_id: user.id,
      memory_profile_id: profileId,
      title,
      memory_ids: memoryIds,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, reason: isMissingRelation(error) ? "unavailable" : "invalid" };
  }

  revalidatePath("/activities/stories");
  return { ok: true, storyId: String(data.id) };
}

/** Edit title and/or order. New id sets are re-verified against the story's workspace. */
export async function updateStory(input: {
  storyId: string;
  title: string;
  memoryIds: unknown;
}): Promise<StoryActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const auth = await authorizeStory(input.storyId, user.id, "write");
  if (!auth.ok) return auth;

  const title = normalizeStoryTitle(input.title);
  const memoryIds = normalizeMemoryIds(input.memoryIds);
  if (!title || memoryIds.length < STORY_MIN_MOMENTS) {
    return { ok: false, reason: "invalid" };
  }
  if (
    !(await memoriesBelongToWorkspace(
      memoryIds,
      auth.story.user_id,
      auth.story.memory_profile_id,
    ))
  ) {
    return { ok: false, reason: "forbidden" };
  }

  const { error } = await supabaseAdmin
    .from("stories")
    .update({ title, memory_ids: memoryIds, updated_at: new Date().toISOString() })
    .eq("id", input.storyId);
  if (error) return { ok: false, reason: "invalid" };

  revalidatePath("/activities/stories");
  revalidatePath(`/activities/stories/${input.storyId}`);
  return { ok: true, storyId: input.storyId };
}

/** Deletes ONLY the story view — never its memories or media. */
export async function deleteStory(storyId: string): Promise<StoryActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const auth = await authorizeStory(storyId, user.id, "write");
  if (!auth.ok) return auth;

  const { error } = await supabaseAdmin.from("stories").delete().eq("id", storyId);
  if (error) return { ok: false, reason: "invalid" };

  revalidatePath("/activities/stories");
  return { ok: true };
}
