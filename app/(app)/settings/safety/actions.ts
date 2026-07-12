"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { getCurrentUser } from "@/lib/auth/current-user";
import { logger, errorMessage } from "@/lib/logger";
import { isRateLimited } from "@/lib/security/rate-limit";
import { userCanAccessProfile } from "@/lib/profile-ownership";
import {
  isValidReportReason,
  MAX_REPORT_DESCRIPTION,
  type ReportReason,
} from "@/lib/moderation/config";

/**
 * LA5.1 — Moderation server actions (Apple Guideline 1.2). Report an abusive user,
 * report shared content, block/unblock a user, and leave a care workspace.
 *
 * INVARIANTS (match the repo's authorization + safety model):
 *  - Every action derives the actor from the SESSION (getCurrentUser) — a
 *    client-supplied id is NEVER trusted for authorization.
 *  - Structured results, NEVER throw (Server Action errors are redacted in prod).
 *  - Cross-user reads use the service-role client, ALWAYS scoped by ids derived
 *    from the session user's own access (a reporter can only target someone they
 *    actually share care with).
 *  - PROBE-GATED: if the moderation tables aren't applied yet, actions degrade to a
 *    structured "unavailable"/empty result instead of crashing.
 *  - Reporter identity is never surfaced to the reported user (RLS + these reads).
 */

const SAFETY_PATH = "/settings/safety";

export type ModerationResult =
  | { ok: true; already?: boolean }
  | { ok: false; error: string };

export interface SafetyPerson {
  accountId: string;
  name: string;
  email: string;
  blocked: boolean;
}

export interface LeavableWorkspace {
  memoryProfileId: string;
  profileName: string;
}

/** A missing relation means the migration hasn't been applied yet → degrade gracefully. */
function isMissingRelation(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  return (
    e?.code === "42P01" ||
    (typeof e?.message === "string" && /relation .* does not exist/i.test(e.message))
  );
}

/** Pick a human-friendly display name from a profiles row (mirrors listProfileCaregivers). */
function pickName(acc: Record<string, unknown> | undefined, email: string): string {
  const pick = (key: string) =>
    typeof acc?.[key] === "string" && (acc[key] as string).trim()
      ? (acc[key] as string).trim()
      : "";
  return (
    pick("preferred_name") ||
    pick("full_name") ||
    pick("first_name") ||
    pick("name") ||
    pick("profile_name") ||
    (email ? email.split("@")[0] : "Someone")
  );
}

/**
 * The set of OTHER account ids the viewer shares care with: for every profile the
 * viewer can access (owned or accepted-caregiver), the profile owner plus every
 * accepted caregiver — minus the viewer. This is the authorization boundary for
 * reporting/blocking a user (you can only report/block someone you're connected to,
 * which also prevents probing arbitrary account ids).
 */
async function getSharedCarePeopleIds(viewerId: string): Promise<Set<string>> {
  const people = new Set<string>();

  // The viewer's accessible profiles (owned + accepted shared), via the SESSION client
  // (RLS-scoped to the viewer). Each row carries created_by_account_id (the owner).
  const supabase = await createClient();
  const { data: owned } = await supabase
    .from("memory_profiles")
    .select("id, created_by_account_id")
    .eq("created_by_account_id", viewerId);

  const { data: sharedRels } = await supabase
    .from("profile_relationships")
    .select("memory_profile_id")
    .eq("caregiver_account_id", viewerId)
    .eq("invite_status", "accepted");

  const ownedIds = (owned ?? [])
    .map((r) => (r as { id?: string }).id)
    .filter((id): id is string => typeof id === "string");
  const sharedIds = (sharedRels ?? [])
    .map((r) => (r as { memory_profile_id?: string }).memory_profile_id)
    .filter((id): id is string => typeof id === "string");

  const accessibleProfileIds = Array.from(new Set([...ownedIds, ...sharedIds]));
  if (accessibleProfileIds.length === 0) return people;

  // Owners of the shared (non-owned) profiles + every accepted caregiver on ANY
  // accessible profile. Service-role, scoped strictly to the viewer's accessible ids.
  const { data: profiles } = await supabaseAdmin
    .from("memory_profiles")
    .select("id, created_by_account_id")
    .in("id", accessibleProfileIds);
  for (const p of profiles ?? []) {
    const owner = (p as { created_by_account_id?: string }).created_by_account_id;
    if (typeof owner === "string" && owner && owner !== viewerId) people.add(owner);
  }

  const { data: rels } = await supabaseAdmin
    .from("profile_relationships")
    .select("caregiver_account_id")
    .in("memory_profile_id", accessibleProfileIds)
    .eq("invite_status", "accepted");
  for (const r of rels ?? []) {
    const id = (r as { caregiver_account_id?: string }).caregiver_account_id;
    if (typeof id === "string" && id && id !== viewerId) people.add(id);
  }

  return people;
}

/** The viewer's current block set (blocked account ids). Degrades to empty. */
async function getBlockedIds(viewerId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_blocks")
    .select("blocked_account_id")
    .eq("blocker_account_id", viewerId);
  if (error) {
    if (!isMissingRelation(error)) {
      logger.error("[moderation] getBlockedIds failed", errorMessage(error));
    }
    return new Set();
  }
  return new Set(
    (data ?? [])
      .map((r) => (r as { blocked_account_id?: string }).blocked_account_id)
      .filter((id): id is string => typeof id === "string"),
  );
}

/**
 * Data minimisation (GDPR Art 5(1)(c)): the Safety Center is visible to any caregiver
 * (not just the profile owner), so it must not disclose co-caregivers' full email
 * addresses. Show a masked address that's enough to disambiguate two people without
 * exposing the full identifier ("jo•••@example.com").
 */
function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const shown = local.slice(0, Math.min(2, local.length));
  return `${shown}•••@${domain}`;
}

function cleanDescription(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim().slice(0, MAX_REPORT_DESCRIPTION);
  return trimmed.length > 0 ? trimmed : null;
}

// =====================================================================
// REPORT A USER
// =====================================================================
export async function reportUser(input: {
  reportedAccountId: string;
  reason: ReportReason | string;
  description?: string;
}): Promise<ModerationResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const reportedAccountId = (input.reportedAccountId ?? "").trim();
  if (!reportedAccountId || reportedAccountId === user.id) {
    return { ok: false, error: "Invalid person to report." };
  }
  if (!isValidReportReason(input.reason)) {
    return { ok: false, error: "Please choose a reason." };
  }
  if (isRateLimited("report", user.id)) {
    return { ok: false, error: "You've sent several reports recently. Please try again shortly." };
  }

  // Authorization: you can only report someone you actually share care with.
  const people = await getSharedCarePeopleIds(user.id);
  if (!people.has(reportedAccountId)) {
    return { ok: false, error: "You can only report someone you share care with." };
  }

  const supabase = await createClient();

  // Duplicate-report guard: one open report per reporter per user.
  const { data: existing, error: existingError } = await supabase
    .from("moderation_reports")
    .select("id")
    .eq("reporter_account_id", user.id)
    .eq("target_type", "user")
    .eq("reported_account_id", reportedAccountId)
    .in("status", ["pending", "reviewing"])
    .limit(1);
  if (existingError && isMissingRelation(existingError)) {
    return { ok: false, error: "Reporting isn't available yet. Please try again later." };
  }
  if (existing && existing.length > 0) return { ok: true, already: true };

  const { error } = await supabase.from("moderation_reports").insert({
    reporter_account_id: user.id,
    target_type: "user",
    reported_account_id: reportedAccountId,
    reason: input.reason,
    description: cleanDescription(input.description),
  });

  if (error) {
    if (isMissingRelation(error)) {
      return { ok: false, error: "Reporting isn't available yet. Please try again later." };
    }
    logger.error("[moderation] reportUser insert failed", errorMessage(error));
    return { ok: false, error: "We couldn't submit your report. Please try again." };
  }

  logger.info("[moderation] user_report_created", { reporterId: user.id });
  revalidatePath(SAFETY_PATH);
  return { ok: true };
}

// =====================================================================
// REPORT SHARED CONTENT (a memory in a care workspace you can access)
// =====================================================================
export async function reportContent(input: {
  memoryId: string;
  reason: ReportReason | string;
  description?: string;
}): Promise<ModerationResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const memoryId = (input.memoryId ?? "").trim();
  if (!memoryId) return { ok: false, error: "Invalid content to report." };
  if (!isValidReportReason(input.reason)) {
    return { ok: false, error: "Please choose a reason." };
  }
  if (isRateLimited("report", user.id)) {
    return { ok: false, error: "You've sent several reports recently. Please try again shortly." };
  }

  // Resolve the memory's owning workspace + author (service-role; validated next).
  const { data: memory, error: memoryError } = await supabaseAdmin
    .from("memories")
    .select("id, user_id, memory_profile_id")
    .eq("id", memoryId)
    .maybeSingle();
  if (memoryError) {
    logger.error("[moderation] reportContent memory lookup failed", errorMessage(memoryError));
    return { ok: false, error: "We couldn't submit your report. Please try again." };
  }
  const profileId = (memory as { memory_profile_id?: string | null } | null)?.memory_profile_id ?? null;
  const authorId = (memory as { user_id?: string } | null)?.user_id ?? null;

  // Content reporting only applies to SHARED care content you can access but did not
  // author (My Nest memories are single-user — nothing to report).
  if (!memory || !profileId) {
    return { ok: false, error: "This content can't be reported." };
  }
  if (authorId === user.id) {
    return { ok: false, error: "You can't report your own content." };
  }
  if (!(await userCanAccessProfile(user.id, profileId))) {
    return { ok: false, error: "You don't have access to this content." };
  }

  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("moderation_reports")
    .select("id")
    .eq("reporter_account_id", user.id)
    .eq("target_type", "content")
    .eq("memory_id", memoryId)
    .in("status", ["pending", "reviewing"])
    .limit(1);
  if (existingError && isMissingRelation(existingError)) {
    return { ok: false, error: "Reporting isn't available yet. Please try again later." };
  }
  if (existing && existing.length > 0) return { ok: true, already: true };

  const { error } = await supabase.from("moderation_reports").insert({
    reporter_account_id: user.id,
    target_type: "content",
    reported_account_id: authorId,
    memory_id: memoryId,
    memory_profile_id: profileId,
    reason: input.reason,
    description: cleanDescription(input.description),
  });

  if (error) {
    if (isMissingRelation(error)) {
      return { ok: false, error: "Reporting isn't available yet. Please try again later." };
    }
    logger.error("[moderation] reportContent insert failed", errorMessage(error));
    return { ok: false, error: "We couldn't submit your report. Please try again." };
  }

  logger.info("[moderation] content_report_created", { reporterId: user.id });
  revalidatePath(SAFETY_PATH);
  return { ok: true };
}

// =====================================================================
// BLOCK / UNBLOCK
// =====================================================================
export async function blockUser(input: {
  blockedAccountId: string;
}): Promise<ModerationResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const blockedAccountId = (input.blockedAccountId ?? "").trim();
  if (!blockedAccountId || blockedAccountId === user.id) {
    return { ok: false, error: "Invalid person to block." };
  }

  // You can only block someone you share care with (prevents blocking arbitrary ids).
  const people = await getSharedCarePeopleIds(user.id);
  if (!people.has(blockedAccountId)) {
    return { ok: false, error: "You can only block someone you share care with." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("user_blocks").insert({
    blocker_account_id: user.id,
    blocked_account_id: blockedAccountId,
  });

  if (error) {
    // Unique-violation = already blocked → treat as success (idempotent).
    if ((error as { code?: string }).code === "23505") {
      return { ok: true, already: true };
    }
    if (isMissingRelation(error)) {
      return { ok: false, error: "Blocking isn't available yet. Please try again later." };
    }
    logger.error("[moderation] blockUser failed", errorMessage(error));
    return { ok: false, error: "We couldn't block this person. Please try again." };
  }

  logger.info("[moderation] user_blocked", { blockerId: user.id });
  revalidatePath(SAFETY_PATH);
  return { ok: true };
}

export async function unblockUser(input: {
  blockedAccountId: string;
}): Promise<ModerationResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const blockedAccountId = (input.blockedAccountId ?? "").trim();
  if (!blockedAccountId) return { ok: false, error: "Invalid person." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_account_id", user.id)
    .eq("blocked_account_id", blockedAccountId);

  if (error && !isMissingRelation(error)) {
    logger.error("[moderation] unblockUser failed", errorMessage(error));
    return { ok: false, error: "We couldn't update this. Please try again." };
  }

  revalidatePath(SAFETY_PATH);
  return { ok: true };
}

// =====================================================================
// LEAVE A CARE WORKSPACE (a caregiver removes their OWN access)
// =====================================================================
export async function leaveWorkspace(input: {
  memoryProfileId: string;
}): Promise<ModerationResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const profileId = (input.memoryProfileId ?? "").trim();
  if (!profileId) return { ok: false, error: "Missing workspace." };

  // Only an ACCEPTED, NON-owner caregiver can leave (owners can't leave their own
  // profile — deleting it belongs to account/profile management). Scoped self-delete.
  const { data: rel, error: relError } = await supabaseAdmin
    .from("profile_relationships")
    .select("relationship_type, invite_status")
    .eq("memory_profile_id", profileId)
    .eq("caregiver_account_id", user.id)
    .maybeSingle();
  if (relError) {
    logger.error("[moderation] leaveWorkspace lookup failed", errorMessage(relError));
    return { ok: false, error: "We couldn't update this. Please try again." };
  }
  if (!rel || (rel as { invite_status?: string }).invite_status !== "accepted") {
    return { ok: false, error: "You're not a member of this workspace." };
  }
  if ((rel as { relationship_type?: string }).relationship_type === "owner") {
    return { ok: false, error: "You own this workspace and can't leave it." };
  }

  const { error: deleteError } = await supabaseAdmin
    .from("profile_relationships")
    .delete()
    .eq("memory_profile_id", profileId)
    .eq("caregiver_account_id", user.id)
    .neq("relationship_type", "owner");

  if (deleteError) {
    logger.error("[moderation] leaveWorkspace delete failed", errorMessage(deleteError));
    return { ok: false, error: "We couldn't leave this workspace. Please try again." };
  }

  logger.info("[moderation] workspace_left", { userId: user.id });
  revalidatePath(SAFETY_PATH);
  return { ok: true };
}

// =====================================================================
// READ MODELS (for the Safety Center UI)
// =====================================================================
export type ListSafetyResult =
  | { ok: true; people: SafetyPerson[]; leavable: LeavableWorkspace[] }
  | { ok: false; error: string };

/**
 * The Safety Center model: the people the viewer shares care with (with block
 * status) + the care workspaces the viewer can leave. Read-only; degrades to empty
 * on any error so the page always renders.
 */
export async function listSafetyOverview(): Promise<ListSafetyResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const [peopleIds, blocked] = await Promise.all([
    getSharedCarePeopleIds(user.id),
    getBlockedIds(user.id),
  ]);

  // Also surface anyone the viewer has blocked but no longer shares care with, so
  // they can still be unblocked from here.
  const allIds = Array.from(new Set([...peopleIds, ...blocked]));

  let people: SafetyPerson[] = [];
  if (allIds.length > 0) {
    const { data: accounts } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .in("id", allIds);
    const byId = new Map(
      (accounts ?? []).map((a: Record<string, unknown>) => [a.id as string, a]),
    );
    people = allIds
      .map((id) => {
        const acc = byId.get(id);
        const email = typeof acc?.email === "string" ? (acc.email as string) : "";
        return {
          accountId: id,
          name: pickName(acc, email),
          // Minimised: never expose a co-caregiver's full email in the Safety Center.
          email: maskEmail(email),
          blocked: blocked.has(id),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Workspaces the viewer can leave = accepted, non-owner caregiver memberships.
  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("profile_relationships")
    .select("memory_profile_id, relationship_type")
    .eq("caregiver_account_id", user.id)
    .eq("invite_status", "accepted")
    .neq("relationship_type", "owner");
  const membershipIds = (memberships ?? [])
    .map((r) => (r as { memory_profile_id?: string }).memory_profile_id)
    .filter((id): id is string => typeof id === "string");

  let leavable: LeavableWorkspace[] = [];
  if (membershipIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from("memory_profiles")
      .select("id, profile_name, preferred_name, created_by_account_id")
      .in("id", membershipIds);
    leavable = (profiles ?? [])
      // Never list a profile the viewer actually owns (defense in depth).
      .filter((p) => (p as { created_by_account_id?: string }).created_by_account_id !== user.id)
      .map((p) => {
        const row = p as Record<string, unknown>;
        const name =
          (typeof row.preferred_name === "string" && row.preferred_name.trim()) ||
          (typeof row.profile_name === "string" && row.profile_name.trim()) ||
          "Care profile";
        return { memoryProfileId: row.id as string, profileName: name as string };
      });
  }

  return { ok: true, people, leavable };
}
