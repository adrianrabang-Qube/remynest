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

  const [
    profileRes,
    memoryProfilesRes,
    memoriesRes,
    remindersRes,
    relationshipsRes,
    invitesSentRes,
    clustersRes,
    devicesRes,
  ] = await Promise.all([
    db.from("profiles").select("*").eq("id", userId).maybeSingle(),
    db.from("memory_profiles").select("*").eq("created_by_account_id", userId),
    db.from("memories").select("*").eq("user_id", userId),
    db.from("reminders").select("*").eq("user_id", userId),
    db.from("profile_relationships").select("*").eq("caregiver_account_id", userId),
    db.from("caregiver_invites").select("*").eq("invited_by_account_id", userId),
    db.from("memory_clusters").select("*").eq("user_id", userId),
    db.from("device_registrations").select("*").eq("user_id", userId),
  ]);

  const invitesReceivedRes = userEmail
    ? await db.from("caregiver_invites").select("*").eq("email", userEmail)
    : { data: [] as unknown[] };

  const memories = (memoriesRes.data ?? []) as Array<
    Record<string, unknown>
  >;

  const payload: GdprExportPayload = {
    exportedAt: new Date().toISOString(),
    schemaVersion: "1.0",
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
    mediaReferences: payload.mediaReferences.length,
  };

  return payload;
}
