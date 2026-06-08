import { supabaseAdmin } from "@/utils/supabase/admin";

/**
 * Private media delivery for `memory-media`.
 *
 * The bucket is private — memory media is served via short-lived SIGNED URLs
 * generated server-side. Authorization is already enforced upstream (callers
 * only pass memory rows the authenticated user is entitled to via RLS), so we
 * mint signed URLs with the service-role client (which can sign any path the
 * authorized rows reference). The service key NEVER reaches the browser.
 *
 * Backward compatible: a path is resolved from `attachment.storagePath` when
 * present, otherwise parsed out of a legacy stored public URL — so existing rows
 * keep working with no data migration.
 */
const BUCKET = "memory-media";

// Short-lived; long enough for a browsing session, short enough to limit reuse.
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

const PUBLIC_MARKER = `/storage/v1/object/public/${BUCKET}/`;
const SIGN_MARKER = `/storage/v1/object/sign/${BUCKET}/`;

interface Attachment {
  url?: string;
  storagePath?: string;
  type?: string;
  [key: string]: unknown;
}

interface MemoryLike {
  attachments?: unknown;
  cover_image_url?: string | null;
  [key: string]: unknown;
}

/**
 * Resolve a `memory-media` object path from a stored value, which may be:
 * a bare storage path, a legacy public URL, or a (stale) signed URL.
 * Returns null for foreign/non-storage URLs (left untouched).
 */
export function toStoragePath(
  value?: string | null
): string | null {
  if (!value || typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;

  const pub = v.indexOf(PUBLIC_MARKER);
  if (pub !== -1) {
    return decodeURIComponent(
      v.slice(pub + PUBLIC_MARKER.length).split("?")[0]
    );
  }

  const sign = v.indexOf(SIGN_MARKER);
  if (sign !== -1) {
    return decodeURIComponent(
      v.slice(sign + SIGN_MARKER.length).split("?")[0]
    );
  }

  // Foreign absolute URL (not our storage) — don't touch it.
  if (/^https?:\/\//i.test(v)) return null;

  // Already a bare path.
  return v.replace(/^\/+/, "");
}

function attachmentPath(a: Attachment | null | undefined): string | null {
  if (!a) return null;
  if (typeof a.storagePath === "string" && a.storagePath.trim()) {
    return a.storagePath.replace(/^\/+/, "");
  }
  return toStoragePath(a.url);
}

function absolute(signedUrl: string): string {
  return /^https?:\/\//i.test(signedUrl)
    ? signedUrl
    : `${SUPABASE_URL}${signedUrl}`;
}

/**
 * Replace every media reference on the given memory rows with a fresh signed
 * URL. One batched `createSignedUrls` call per invocation. Returns new objects;
 * inputs are not mutated. `storagePath` is preserved so client round-trips
 * (edit) never persist a transient signed URL.
 */
export async function signMemories<T extends MemoryLike>(
  memories: T[] | null | undefined
): Promise<T[]> {
  if (!memories || memories.length === 0) return memories ?? [];

  const paths = new Set<string>();
  for (const m of memories) {
    const cover = toStoragePath(m.cover_image_url);
    if (cover) paths.add(cover);
    if (Array.isArray(m.attachments)) {
      for (const a of m.attachments as Attachment[]) {
        const p = attachmentPath(a);
        if (p) paths.add(p);
      }
    }
  }

  const pathList = [...paths];
  const signed = new Map<string, string>();

  if (pathList.length > 0) {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrls(pathList, SIGNED_URL_TTL_SECONDS);

    if (error) {
      console.error("[memory-media-signing] createSignedUrls failed", error);
    } else {
      for (const item of data ?? []) {
        if (item?.path && item.signedUrl) {
          signed.set(item.path, absolute(item.signedUrl));
        }
      }
    }
  }

  return memories.map((m) => {
    const coverPath = toStoragePath(m.cover_image_url);
    const cover_image_url = coverPath
      ? signed.get(coverPath) ?? m.cover_image_url
      : m.cover_image_url;

    let attachments = m.attachments;
    if (Array.isArray(m.attachments)) {
      attachments = (m.attachments as Attachment[]).map((a) => {
        const p = attachmentPath(a);
        const url = p ? signed.get(p) : undefined;
        return url ? { ...a, url, storagePath: p } : a;
      });
    }

    return { ...m, cover_image_url, attachments };
  });
}

export async function signMemory<T extends MemoryLike>(
  memory: T | null | undefined
): Promise<T | null> {
  if (!memory) return null;
  const [signed] = await signMemories([memory]);
  return signed ?? null;
}
