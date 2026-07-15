import { supabaseAdmin } from "@/utils/supabase/admin";

/**
 * GDPR data-export collector (read-only).
 *
 * Gathers every record owned by a single user, scoped strictly by the
 * authenticated user's id / email. Uses the service-role client only to READ
 * (so RLS cannot hide rows the user is entitled to under data-portability) —
 * it never writes. The calling route is responsible for authenticating the user
 * before passing their id here.
 */

export interface MediaReference {
  memoryId: string;
  url: string;
  kind: "cover" | "attachment";
  name?: string;
  mimeType?: string;
}

export interface GdprExportPayload {
  exportedAt: string;
  schemaVersion: string;
  account: {
    userId: string;
    email: string | null;
  };
  profile: unknown | null;
  memoryProfiles: unknown[];
  memories: unknown[];
  reminders: unknown[];
  caregiverRelationships: unknown[];
  caregiverInvitesSent: unknown[];
  caregiverInvitesReceived: unknown[];
  memoryClusters: unknown[];
  deviceRegistrations: unknown[];
  people: unknown[];
  aiUsage: unknown[];
  memoryIntelligence: unknown[];
  storageLedger: unknown[];
  moderationReports: unknown[];
  userBlocks: unknown[];
  puzzles: unknown[];
  puzzleCompletions: unknown[];
  stories: unknown[];
  matchGames: unknown[];
  matchGameCompletions: unknown[];
  songMemories: unknown[];
  togetherTimes: unknown[];
  mediaReferences: MediaReference[];
  counts: Record<string, number>;
}

type AttachmentLike = {
  url?: string;
  name?: string;
  filename?: string;
  mimeType?: string;
};

function extractMediaReferences(
  memories: Array<Record<string, unknown>>
): MediaReference[] {
  const refs: MediaReference[] = [];

  for (const memory of memories) {
    const memoryId = String(memory.id ?? "");

    const cover = memory.cover_image_url;
    if (typeof cover === "string" && cover) {
      refs.push({ memoryId, url: cover, kind: "cover" });
    }

    const attachments = memory.attachments;
    if (Array.isArray(attachments)) {
      for (const raw of attachments as AttachmentLike[]) {
        if (raw && typeof raw.url === "string" && raw.url) {
          refs.push({
            memoryId,
            url: raw.url,
            kind: "attachment",
            name: raw.name ?? raw.filename,
            mimeType: raw.mimeType,
          });
        }
      }
    }
  }

  return refs;
}

export async function collectUserData(
  userId: string,
  userEmail: string | null
): Promise<GdprExportPayload> {
  const db = supabaseAdmin;

  // RC3 — COVERED USER-OWNED TABLES (keep this list in sync when a new table
  // holding a data subject's personal data ships, so the Art 15/20 export never
  // silently drops a category):
  //   profiles                (id)                       memories               (user_id)
  //   memory_profiles         (created_by_account_id)    reminders              (user_id)
  //   profile_relationships   (caregiver_account_id)     caregiver_invites      (invited_by_account_id / email)
  //   memory_clusters         (user_id)                  device_registrations   (user_id)
  //   people                  (created_by_account_id)    ai_usage               (user_id)
  //   memory_intelligence     (user_id)                  storage_ledger         (user_id)
  //   moderation_reports      (reporter_account_id)      user_blocks            (blocker_account_id)
  // LA5.1: only the reports the user FILED + the blocks they SET are their personal
  // data (reporter/blocker-own). Reports ABOUT the user are deliberately NOT exported
  // (that would leak the reporter's identity and defeat the safety design).
  // memory_person_links is intentionally omitted: it is pure join metadata
  // reconstructable from the exported `people` + `memories`. Media is exported
  // as references only (the private bucket needs signed URLs — see the route).
  // ai_usage/memory_intelligence/storage_ledger are operator-gated tables; a
  // missing relation resolves to `{ data: null }` (never throws), so the export
  // degrades to an empty array rather than failing.
  const [
    profileRes,
    memoryProfilesRes,
    memoriesRes,
    remindersRes,
    relationshipsRes,
    invitesSentRes,
    clustersRes,
    devicesRes,
    peopleRes,
    aiUsageRes,
    memoryIntelligenceRes,
    storageLedgerRes,
    moderationReportsRes,
    userBlocksRes,
    puzzlesRes,
    puzzleCompletionsRes,
    storiesRes,
    matchGamesRes,
    matchGameCompletionsRes,
    songMemoriesRes,
    togetherTimesRes,
  ] = await Promise.all([
    db.from("profiles").select("*").eq("id", userId).maybeSingle(),
    db.from("memory_profiles").select("*").eq("created_by_account_id", userId),
    db.from("memories").select("*").eq("user_id", userId),
    db.from("reminders").select("*").eq("user_id", userId),
    db.from("profile_relationships").select("*").eq("caregiver_account_id", userId),
    db.from("caregiver_invites").select("*").eq("invited_by_account_id", userId),
    db.from("memory_clusters").select("*").eq("user_id", userId),
    db.from("device_registrations").select("*").eq("user_id", userId),
    db.from("people").select("*").eq("created_by_account_id", userId),
    db.from("ai_usage").select("*").eq("user_id", userId),
    db.from("memory_intelligence").select("*").eq("user_id", userId),
    db.from("storage_ledger").select("*").eq("user_id", userId),
    // LA5.1 — operator-gated (probe-safe): a missing relation resolves to { data: null }.
    db.from("moderation_reports").select("*").eq("reporter_account_id", userId),
    db.from("user_blocks").select("*").eq("blocker_account_id", userId),
    // Memory Puzzles (2026-07-14) — operator-gated (probe-safe): missing relation → { data: null }.
    db.from("puzzles").select("*").eq("user_id", userId),
    db.from("puzzle_completions").select("*").eq("user_id", userId),
    // Story Builder (2026-07-15) — operator-gated (probe-safe): missing relation → { data: null }.
    db.from("stories").select("*").eq("user_id", userId),
    // Memory Match (2026-07-15) — operator-gated (probe-safe): missing relation → { data: null }.
    db.from("match_games").select("*").eq("user_id", userId),
    db.from("match_game_completions").select("*").eq("user_id", userId),
    // Music Memories (2026-07-15) — operator-gated (probe-safe): missing relation → { data: null }.
    db.from("song_memories").select("*").eq("user_id", userId),
    // Together Time (2026-07-15) — operator-gated (probe-safe): missing relation → { data: null }.
    db.from("together_times").select("*").eq("user_id", userId),
  ]);

  const invitesReceivedRes = userEmail
    ? await db.from("caregiver_invites").select("*").eq("email", userEmail)
    : { data: [] as unknown[] };

  const memories = (memoriesRes.data ?? []) as Array<
    Record<string, unknown>
  >;

  const payload: GdprExportPayload = {
    exportedAt: new Date().toISOString(),
    schemaVersion: "1.8",
    account: { userId, email: userEmail },
    profile: profileRes.data ?? null,
    memoryProfiles: memoryProfilesRes.data ?? [],
    memories,
    reminders: remindersRes.data ?? [],
    caregiverRelationships: relationshipsRes.data ?? [],
    caregiverInvitesSent: invitesSentRes.data ?? [],
    caregiverInvitesReceived: invitesReceivedRes.data ?? [],
    memoryClusters: clustersRes.data ?? [],
    deviceRegistrations: devicesRes.data ?? [],
    people: peopleRes.data ?? [],
    aiUsage: aiUsageRes.data ?? [],
    memoryIntelligence: memoryIntelligenceRes.data ?? [],
    storageLedger: storageLedgerRes.data ?? [],
    moderationReports: moderationReportsRes.data ?? [],
    userBlocks: userBlocksRes.data ?? [],
    puzzles: puzzlesRes.data ?? [],
    puzzleCompletions: puzzleCompletionsRes.data ?? [],
    stories: storiesRes.data ?? [],
    matchGames: matchGamesRes.data ?? [],
    matchGameCompletions: matchGameCompletionsRes.data ?? [],
    songMemories: songMemoriesRes.data ?? [],
    togetherTimes: togetherTimesRes.data ?? [],
    mediaReferences: extractMediaReferences(memories),
    counts: {},
  };

  payload.counts = {
    memoryProfiles: payload.memoryProfiles.length,
    memories: payload.memories.length,
    reminders: payload.reminders.length,
    caregiverRelationships: payload.caregiverRelationships.length,
    caregiverInvitesSent: payload.caregiverInvitesSent.length,
    caregiverInvitesReceived: payload.caregiverInvitesReceived.length,
    memoryClusters: payload.memoryClusters.length,
    deviceRegistrations: payload.deviceRegistrations.length,
    people: payload.people.length,
    aiUsage: payload.aiUsage.length,
    memoryIntelligence: payload.memoryIntelligence.length,
    storageLedger: payload.storageLedger.length,
    moderationReports: payload.moderationReports.length,
    userBlocks: payload.userBlocks.length,
    puzzles: payload.puzzles.length,
    puzzleCompletions: payload.puzzleCompletions.length,
    stories: payload.stories.length,
    matchGames: payload.matchGames.length,
    matchGameCompletions: payload.matchGameCompletions.length,
    songMemories: payload.songMemories.length,
    togetherTimes: payload.togetherTimes.length,
    mediaReferences: payload.mediaReferences.length,
  };

  return payload;
}
