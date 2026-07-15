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
  TOGETHER_MIN_MOMENTS,
  normalizeTogetherMemoryIds,
  normalizeTogetherTitle,
  type TogetherTimeRecord,
} from "@/lib/together-time/types";

/**
 * Together Time — server actions (the proven activity conventions): STRUCTURED
 * results, never throw; SESSION-derived actor; authorize against the set's OWN
 * workspace context; service-role writes explicitly scoped; save/update
 * re-verify every memory id via the reused exact-count workspace check
 * (Story Builder's helper, imported — Story Builder itself untouched).
 * Probe-gated pre-migration. Sets only — no session history.
 */

export type TogetherActionResult =
  | { ok: true; togetherTimeId?: string }
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

async function authorizeSet(
  id: string,
  userId: string,
  mode: "read" | "write",
): Promise<
  | { ok: true; set: TogetherTimeRecord }
  | { ok: false; reason: "forbidden" | "invalid" | "unavailable" }
> {
  const { data, error } = await supabaseAdmin
    .from("together_times")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    return { ok: false, reason: isMissingRelation(error) ? "unavailable" : "invalid" };
  }
  if (!data) return { ok: false, reason: "invalid" };
  const set = {
    ...(data as TogetherTimeRecord),
    memory_ids: normalizeTogetherMemoryIds(
      (data as Record<string, unknown>).memory_ids,
    ),
  };
  const authorized =
    set.memory_profile_id == null
      ? set.user_id === userId
      : mode === "write"
        ? await userCanWriteProfile(userId, set.memory_profile_id)
        : await userCanAccessProfile(userId, set.memory_profile_id);
  if (!authorized) return { ok: false, reason: "forbidden" };
  return { ok: true, set };
}

/** Create a set in the ACTIVE validated workspace from its own memories. */
export async function createTogetherTime(input: {
  title: string;
  memoryIds: unknown;
}): Promise<TogetherActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const title = normalizeTogetherTitle(input.title);
  const memoryIds = normalizeTogetherMemoryIds(input.memoryIds);
  if (memoryIds.length < TOGETHER_MIN_MOMENTS) {
    return { ok: false, reason: "invalid" };
  }

  const context = await getActiveContext();
  const profileId = context.type === "CARE" ? context.profileId : null;
  if (profileId && !(await userCanWriteProfile(user.id, profileId))) {
    return { ok: false, reason: "forbidden" };
  }
  if (!(await memoriesBelongToWorkspace(memoryIds, user.id, profileId))) {
    return { ok: false, reason: "forbidden" };
  }

  const { data, error } = await supabaseAdmin
    .from("together_times")
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

  revalidatePath("/activities/family");
  return { ok: true, togetherTimeId: String(data.id) };
}

/** Edit title and/or order/removal (floor of 3 re-enforced; ids re-verified). */
export async function updateTogetherTime(input: {
  togetherTimeId: string;
  title: string;
  memoryIds: unknown;
}): Promise<TogetherActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const auth = await authorizeSet(input.togetherTimeId, user.id, "write");
  if (!auth.ok) return auth;

  const title = normalizeTogetherTitle(input.title);
  const memoryIds = normalizeTogetherMemoryIds(input.memoryIds);
  if (memoryIds.length < TOGETHER_MIN_MOMENTS) {
    return { ok: false, reason: "invalid" };
  }
  if (
    !(await memoriesBelongToWorkspace(
      memoryIds,
      auth.set.user_id,
      auth.set.memory_profile_id,
    ))
  ) {
    return { ok: false, reason: "forbidden" };
  }

  const { error } = await supabaseAdmin
    .from("together_times")
    .update({
      title,
      memory_ids: memoryIds,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.togetherTimeId);
  if (error) return { ok: false, reason: "invalid" };

  revalidatePath("/activities/family");
  revalidatePath(`/activities/family/${input.togetherTimeId}`);
  return { ok: true, togetherTimeId: input.togetherTimeId };
}

/**
 * BEST-EFFORT hub-ordering bump (locked decision): only write-permitted users
 * update `last_opened_at`; a read-only caregiver's open returns a structured
 * `forbidden` that the player deliberately IGNORES — running a set never
 * requires a write and never surfaces an error for readers.
 */
export async function markTogetherTimeOpened(
  togetherTimeId: string,
): Promise<TogetherActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const auth = await authorizeSet(togetherTimeId, user.id, "write");
  if (!auth.ok) return auth;

  await supabaseAdmin
    .from("together_times")
    .update({ last_opened_at: new Date().toISOString() })
    .eq("id", togetherTimeId);
  return { ok: true };
}

/** Deletes ONLY the set view — never memories, media, or voice recordings. */
export async function deleteTogetherTime(
  togetherTimeId: string,
): Promise<TogetherActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const auth = await authorizeSet(togetherTimeId, user.id, "write");
  if (!auth.ok) return auth;

  const { error } = await supabaseAdmin
    .from("together_times")
    .delete()
    .eq("id", togetherTimeId);
  if (error) return { ok: false, reason: "invalid" };
  revalidatePath("/activities/family");
  return { ok: true };
}
