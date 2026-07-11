import { supabaseAdmin } from "@/utils/supabase/admin";

/**
 * GDPR account-deletion PLANNER — dry-run only.
 *
 * Read-only. Computes the exact cascade and what WOULD be deleted for a user,
 * plus ownership/validation checks (e.g. shared owned profiles that are blockers
 * pending product policy). It NEVER deletes anything and performs no writes.
 *
 * The destructive implementation is intentionally not built: it depends on
 * unresolved decisions (soft-vs-hard delete → schema; shared-profile policy).
 */

/**
 * Canonical deletion order: children → parents → auth user.
 *
 * RC3 erasure note: `people` / `memory_person_links` / `ai_usage` /
 * `memory_intelligence` / `storage_ledger` rows are removed via FK cascade on the
 * final auth-user delete (all reference auth.users on delete cascade). The one
 * open erasure item is `reminder_local_confirmations` (no cascade, not in the RPC)
 * — enroll it when the delete_user_account RPC is next revised.
 */
export const DELETION_ORDER = [
  "storage_media",
  "memory_clusters",
  "memories",
  "reminders",
  "profile_relationships",
  "caregiver_invites",
  "device_registrations",
  "memory_profiles",
  "profiles",
  "auth_user",
] as const;

export type DeletionStage =
  (typeof DELETION_ORDER)[number];

const STAGE_DESCRIPTION: Record<DeletionStage, string> = {
  storage_media:
    "Stored media files referenced by the user's memories",
  memory_clusters:
    "memory_clusters where user_id = account",
  memories: "memories where user_id = account",
  reminders: "reminders where user_id = account",
  profile_relationships:
    "profile_relationships granting the account access",
  caregiver_invites:
    "caregiver_invites sent or received by the account",
  device_registrations:
    "device_registrations where user_id = account",
  memory_profiles:
    "memory_profiles created_by_account_id = account",
  profiles: "profiles row for the account",
  auth_user: "Supabase auth user",
};

export interface DeletionStep {
  order: number;
  stage: DeletionStage;
  description: string;
  count: number;
}

export interface SharedOwnedProfile {
  profileId: string;
  profileName: string | null;
  externalCaregivers: number;
}

export interface UserDeletionPlan {
  generatedAt: string;
  mode: "dry-run";
  executable: false;
  account: { userId: string; email: string | null };
  steps: DeletionStep[];
  totals: { rows: number; mediaFiles: number };
  ownership: {
    sharedOwnedProfiles: SharedOwnedProfile[];
    crossAuthoredMemories: number;
  };
  blockers: string[];
  blocked: boolean;
  notes: string[];
}

type AttachmentLike = { url?: string };

export async function planUserDeletion(
  userId: string,
  userEmail: string | null
): Promise<UserDeletionPlan> {
  const db = supabaseAdmin;

  // --- row counts (head-only; no rows returned) ---
  const [
    clustersRes,
    memoriesCountRes,
    remindersRes,
    relationshipsRes,
    invitesSentRes,
    devicesRes,
    ownedProfilesRes,
  ] = await Promise.all([
    db.from("memory_clusters").select("*", { count: "exact", head: true }).eq("user_id", userId),
    db.from("memories").select("*", { count: "exact", head: true }).eq("user_id", userId),
    db.from("reminders").select("*", { count: "exact", head: true }).eq("user_id", userId),
    db.from("profile_relationships").select("*", { count: "exact", head: true }).eq("caregiver_account_id", userId),
    db.from("caregiver_invites").select("*", { count: "exact", head: true }).eq("invited_by_account_id", userId),
    db.from("device_registrations").select("*", { count: "exact", head: true }).eq("user_id", userId),
    db.from("memory_profiles").select("id, profile_name").eq("created_by_account_id", userId),
  ]);

  const invitesReceivedRes = userEmail
    ? await db
        .from("caregiver_invites")
        .select("*", { count: "exact", head: true })
        .eq("email", userEmail)
    : { count: 0 };

  // --- media + cross-ownership: needs memory rows ---
  const { data: memoryRows } = await db
    .from("memories")
    .select("id, memory_profile_id, cover_image_url, attachments")
    .eq("user_id", userId);

  const ownedProfiles = ownedProfilesRes.data ?? [];
  const ownedIds = new Set(
    ownedProfiles.map((p) => p.id)
  );

  let mediaFiles = 0;
  let crossAuthoredMemories = 0;

  for (const m of memoryRows ?? []) {
    if (
      typeof m.cover_image_url === "string" &&
      m.cover_image_url
    ) {
      mediaFiles += 1;
    }
    if (Array.isArray(m.attachments)) {
      for (const a of m.attachments as AttachmentLike[]) {
        if (a && typeof a.url === "string" && a.url) {
          mediaFiles += 1;
        }
      }
    }
    if (
      m.memory_profile_id &&
      !ownedIds.has(m.memory_profile_id)
    ) {
      crossAuthoredMemories += 1;
    }
  }

  // --- ownership check: owned profiles shared with OTHER caregivers ---
  const sharedOwnedProfiles: SharedOwnedProfile[] = [];
  for (const p of ownedProfiles) {
    const { count } = await db
      .from("profile_relationships")
      .select("*", { count: "exact", head: true })
      .eq("memory_profile_id", p.id)
      .eq("invite_status", "accepted")
      .neq("caregiver_account_id", userId);

    if ((count ?? 0) > 0) {
      sharedOwnedProfiles.push({
        profileId: p.id,
        profileName: p.profile_name ?? null,
        externalCaregivers: count ?? 0,
      });
    }
  }

  const counts: Record<DeletionStage, number> = {
    storage_media: mediaFiles,
    memory_clusters: clustersRes.count ?? 0,
    memories: memoriesCountRes.count ?? 0,
    reminders: remindersRes.count ?? 0,
    profile_relationships: relationshipsRes.count ?? 0,
    caregiver_invites:
      (invitesSentRes.count ?? 0) +
      (invitesReceivedRes.count ?? 0),
    device_registrations: devicesRes.count ?? 0,
    memory_profiles: ownedProfiles.length,
    profiles: 1,
    auth_user: 1,
  };

  const steps: DeletionStep[] = DELETION_ORDER.map(
    (stage, index) => ({
      order: index + 1,
      stage,
      description: STAGE_DESCRIPTION[stage],
      count: counts[stage],
    })
  );

  const rows = (Object.keys(counts) as DeletionStage[])
    .filter((s) => s !== "storage_media")
    .reduce((acc, s) => acc + counts[s], 0);

  // --- validation / blockers ---
  // Shared owned profiles are NOT blockers: ownership is transferred to an
  // accepted successor caregiver on deletion (or the profile is deleted if no
  // accepted successor exists).
  const blockers: string[] = [];

  const notes: string[] = [
    "Dry-run only: no data was modified.",
  ];
  if (sharedOwnedProfiles.length > 0) {
    notes.push(
      `${sharedOwnedProfiles.length} shared care profile(s) will be transferred to another accepted caregiver.`
    );
  }
  if (crossAuthoredMemories > 0) {
    notes.push(
      `${crossAuthoredMemories} memory(ies) contributed to other profiles will be retained with authorship anonymised (or deleted if you choose).`
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    mode: "dry-run",
    executable: false,
    account: { userId, email: userEmail },
    steps,
    totals: { rows, mediaFiles },
    ownership: {
      sharedOwnedProfiles,
      crossAuthoredMemories,
    },
    blockers,
    blocked: blockers.length > 0,
    notes,
  };
}
