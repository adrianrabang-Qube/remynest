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
 *
 * THUMBNAILS (Phase 0): pass `{ variant }` to serve a resized/format-optimized
 * derivative instead of the full-resolution original. Images are transformed
 * on-the-fly by Supabase Storage (imgproxy) via the SINGULAR
 * `createSignedUrl(path, ttl, { transform })` call (the BATCH `createSignedUrls`
 * cannot transform). The original is stored once and never resized. Every
 * transform path has a hard fallback to the untransformed signed URL, and the
 * whole feature is gated behind an operator env flag so it is a no-op until
 * transforms are enabled on the Supabase project.
 */
const BUCKET = "memory-media";

// Short-lived; long enough for a browsing session, short enough to limit reuse.
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

const PUBLIC_MARKER = `/storage/v1/object/public/${BUCKET}/`;
const SIGN_MARKER = `/storage/v1/object/sign/${BUCKET}/`;
const RENDER_MARKER = `/storage/v1/render/image/sign/${BUCKET}/`;

// ---- Thumbnail / image-transform variants (Phase 0) -------------------------
// Per-context size ladder. Variants are derived from the single stored original
// (= one Supabase "origin image" regardless of how many sizes are requested).
export type SignVariant = "thumb" | "medium";

interface TransformSpec {
  width: number;
  height?: number;
  resize: "cover" | "contain" | "fill";
  quality: number;
}

export const IMAGE_VARIANTS: Record<SignVariant, TransformSpec> = {
  // Feed / list cells — square crop.
  thumb: { width: 400, height: 400, resize: "cover", quality: 70 },
  // Detail inline tiles + full-screen viewer — preserve aspect.
  medium: { width: 1080, resize: "contain", quality: 75 },
};

// Operator gate: transforms require Supabase Image Transformations (Pro plan).
// Default OFF -> signing is byte-identical to the untransformed baseline, so
// deploying this changes nothing until the operator enables transforms on the
// project AND sets MEMORY_IMAGE_TRANSFORMS_ENABLED=true. This is the hard
// "no broken images / no user-visible regression" guarantee.
const TRANSFORMS_ENABLED =
  process.env.MEMORY_IMAGE_TRANSFORMS_ENABLED === "true";

// Transforms can't use the batch API; bound concurrent singular sign calls.
const TRANSFORM_CONCURRENCY = 12;

export interface SignOptions {
  /** Serve a resized derivative for images (feed=thumb, detail=medium). */
  variant?: SignVariant;
  /** Cap transform signing to the first N images per memory (feed only renders a few). */
  maxImagesPerMemory?: number;
}

interface Attachment {
  url?: string;
  storagePath?: string;
  type?: string;
  /** Untransformed signed URL — client fallback when a transform render fails. */
  fallbackUrl?: string;
  [key: string]: unknown;
}

interface MemoryLike {
  attachments?: unknown;
  cover_image_url?: string | null;
  [key: string]: unknown;
}

/**
 * Resolve a `memory-media` object path from a stored value, which may be:
 * a bare storage path, a legacy public URL, a (stale) signed URL, or a
 * transform/render URL. Returns null for foreign/non-storage URLs (left untouched).
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

  // Transformed render URL — strip back to the underlying object path so a
  // round-tripped (edited) attachment never persists a transient render URL.
  const render = v.indexOf(RENDER_MARKER);
  if (render !== -1) {
    return decodeURIComponent(
      v.slice(render + RENDER_MARKER.length).split("?")[0]
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

/** Sign one path with an image transform; null on any failure (caller falls back). */
async function signTransformed(
  path: string,
  spec: TransformSpec
): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS, {
        transform: {
          width: spec.width,
          ...(spec.height ? { height: spec.height } : {}),
          resize: spec.resize,
          quality: spec.quality,
        },
      });
    if (error || !data?.signedUrl) return null;
    return absolute(data.signedUrl);
  } catch (e) {
    console.error("[memory-media-signing] transform sign failed", e);
    return null;
  }
}

/** Sign many transform paths with bounded concurrency. */
async function signTransforms(
  paths: string[],
  spec: TransformSpec
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < paths.length; i += TRANSFORM_CONCURRENCY) {
    const chunk = paths.slice(i, i + TRANSFORM_CONCURRENCY);
    const results = await Promise.all(
      chunk.map(
        async (p) => [p, await signTransformed(p, spec)] as const
      )
    );
    for (const [p, u] of results) if (u) out.set(p, u);
  }
  return out;
}

/**
 * Replace every media reference on the given memory rows with a fresh signed
 * URL. One batched `createSignedUrls` call provides the untransformed baseline
 * (always works — the fallback). When `{ variant }` is set AND transforms are
 * enabled, image paths additionally get a per-path transformed URL; on any
 * transform failure the untransformed URL is used. Returns new objects; inputs
 * are not mutated. `storagePath` is preserved so client round-trips (edit) never
 * persist a transient signed/render URL.
 */
export async function signMemories<T extends MemoryLike>(
  memories: T[] | null | undefined,
  options: SignOptions = {}
): Promise<T[]> {
  if (!memories || memories.length === 0) return memories ?? [];

  const { variant, maxImagesPerMemory = Number.POSITIVE_INFINITY } = options;
  const useTransforms = !!variant && TRANSFORMS_ENABLED;

  const paths = new Set<string>();
  const imagePaths = new Set<string>(); // subset to transform

  for (const m of memories) {
    const cover = toStoragePath(m.cover_image_url);
    if (cover) {
      paths.add(cover);
      imagePaths.add(cover);
    }
    if (Array.isArray(m.attachments)) {
      let imgCount = 0;
      for (const a of m.attachments as Attachment[]) {
        const p = attachmentPath(a);
        if (!p) continue;
        paths.add(p);
        if ((a.type ?? "") === "image" && imgCount < maxImagesPerMemory) {
          imagePaths.add(p);
          imgCount++;
        }
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

  // Per-path transform variants (graceful — missing entries fall back below).
  const transformed =
    useTransforms && imagePaths.size > 0
      ? await signTransforms([...imagePaths], IMAGE_VARIANTS[variant!])
      : new Map<string, string>();

  // For an image path: prefer the transform, else the untransformed signed URL,
  // else the original value. Expose the untransformed URL as `fallbackUrl` so the
  // client can recover if a transform render 404s (e.g. >25MB / >50MP input).
  const pickImage = (
    p: string | null,
    original?: string | null
  ): { url?: string; fallbackUrl?: string } => {
    if (!p) return { url: original ?? undefined };
    const base = signed.get(p);
    const t = transformed.get(p);
    if (t) return { url: t, fallbackUrl: base ?? original ?? undefined };
    return { url: base ?? original ?? undefined };
  };

  return memories.map((m) => {
    const coverPath = toStoragePath(m.cover_image_url);
    const cover_image_url = coverPath
      ? pickImage(coverPath, m.cover_image_url).url ?? m.cover_image_url
      : m.cover_image_url;

    let attachments = m.attachments;
    if (Array.isArray(m.attachments)) {
      attachments = (m.attachments as Attachment[]).map((a) => {
        const p = attachmentPath(a);
        if (!p) return a;

        if ((a.type ?? "") === "image") {
          const { url, fallbackUrl } = pickImage(p, a.url);
          if (!url) return a;
          return fallbackUrl
            ? { ...a, url, storagePath: p, fallbackUrl }
            : { ...a, url, storagePath: p };
        }

        const url = signed.get(p);
        return url ? { ...a, url, storagePath: p } : a;
      });
    }

    return { ...m, cover_image_url, attachments };
  });
}

export async function signMemory<T extends MemoryLike>(
  memory: T | null | undefined,
  options: SignOptions = {}
): Promise<T | null> {
  if (!memory) return null;
  const [signed] = await signMemories([memory], options);
  return signed ?? null;
}
