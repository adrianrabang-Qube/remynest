"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus } from "lucide-react";

import {
  uploadAttachmentsDirect,
  UploadQuotaError,
} from "@/lib/memory-direct-upload";
import { haptic, hapticSuccess } from "@/lib/haptics";
import { DIFFICULTIES, type PuzzleCrop } from "@/lib/puzzles/types";
import { createPuzzle } from "@/app/(app)/activities/puzzles/actions";

/**
 * Create-a-puzzle wizard (Phase 1B): image → square crop → difficulty.
 *
 * REUSE, never duplicate: the memory picker reads the EXISTING paginated
 * /api/memories feed (server-scoped by the validated workspace cookie); the
 * "New photo" tab runs the EXISTING direct-to-storage pipeline and CREATES A
 * MEMORY first (quota/ledger/signing/GDPR all inherited), then puzzles it —
 * per the approved architecture, every puzzle image IS a memory photo.
 * Crop is metadata (source-pixel rect); the server re-validates everything.
 */

type PickerAttachment = {
  memoryId: string;
  memoryTitle: string;
  /** Small display url (thumb variant when transforms are on). */
  thumbUrl: string;
  /** Untransformed url — crop math needs the ORIGINAL dimensions. */
  fullUrl: string;
};

type Step = "image" | "crop" | "difficulty";

function extractImages(memory: {
  id?: unknown;
  title?: unknown;
  attachments?: unknown;
}): PickerAttachment[] {
  if (!memory?.id || !Array.isArray(memory.attachments)) return [];
  const out: PickerAttachment[] = [];
  for (const raw of memory.attachments as Array<Record<string, unknown>>) {
    const mime = String(raw?.mimeType ?? raw?.type ?? "");
    const url = typeof raw?.url === "string" ? raw.url : null;
    if (!url || (mime && !mime.startsWith("image"))) continue;
    out.push({
      memoryId: String(memory.id),
      memoryTitle: typeof memory.title === "string" ? memory.title : "",
      thumbUrl:
        typeof raw?.thumbnailUrl === "string" ? (raw.thumbnailUrl as string) : url,
      fullUrl:
        typeof raw?.fallbackUrl === "string" ? (raw.fallbackUrl as string) : url,
    });
  }
  return out;
}

export default function CreatePuzzleWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("image");
  const [tab, setTab] = useState<"memories" | "upload">("memories");
  const [error, setError] = useState("");

  // ---- Step 1: image ----
  const PICKER_PAGE = 50;
  const [images, setImages] = useState<PickerAttachment[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const [pickerOffset, setPickerOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [chosen, setChosen] = useState<PickerAttachment | null>(null);

  const [pickerFailed, setPickerFailed] = useState(false);

  // Paged (matches the feed API's server pagination): older memories stay
  // reachable via "Show more" instead of a hard first-page cap.
  const loadPage = useCallback(
    async (offset: number): Promise<boolean> => {
      setError(""); // a retried load must not keep a stale banner
      setPickerFailed(false);
      try {
        const res = await fetch(
          `/api/memories?limit=${PICKER_PAGE}&offset=${offset}`,
          // Bounded: a hung request must settle into the error state, never
          // leave the picker on permanent skeletons.
          { cache: "no-store", signal: AbortSignal.timeout(15_000) },
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        // The memories API responds { data: signedMemories, metadata } — `data.data`
        // is the list (reading `data.memories` here was the production "No photos in
        // your memories yet" defect). Bare-array kept as a defensive fallback only.
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : [];
        const found = (list as unknown[]).flatMap((m) =>
          extractImages(m as Parameters<typeof extractImages>[0]),
        );
        setImages((prev) => (offset === 0 ? found : [...prev, ...found]));
        setPickerOffset(offset + PICKER_PAGE);
        setHasMore((list as unknown[]).length === PICKER_PAGE);
        return true;
      } catch {
        setPickerFailed(true);
        setError("We couldn't load your photos right now.");
        return false;
      }
    },
    [],
  );

  const retryPicker = useCallback(async () => {
    setLoadingImages(true);
    await loadPage(0);
    setLoadingImages(false);
  }, [loadPage]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadPage(0);
      if (!cancelled) setLoadingImages(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadPage]);

  const onUpload = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      // Existing pipeline: direct-to-storage (quota-enforced, owner-scoped
      // paths) → create the MEMORY (metadata-only JSON; server re-verifies
      // real object sizes) → puzzle that memory's photo.
      const attachments = await uploadAttachmentsDirect([file]);
      const res = await fetch("/api/memories/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: file.name.replace(/\.[^.]+$/, "") || "Puzzle photo",
          // The create API requires non-empty content (kept intact — a global
          // validation this flow must satisfy, not weaken). An empty string
          // here was the production "Content required" defect.
          content: "A photo added for a memory puzzle.",
          attachments,
        }),
      });
      const memory = await res.json().catch(() => null);
      if (!res.ok || !memory?.id) {
        throw new Error(memory?.error || "We couldn't save that photo.");
      }
      const found = extractImages(memory);
      if (found.length === 0) throw new Error("That photo couldn't be used.");
      void hapticSuccess();
      setChosen(found[0]);
      setStep("crop");
    } catch (e) {
      setError(
        e instanceof UploadQuotaError
          ? "Your storage is full — free up space to add new photos."
          : e instanceof Error && e.message
            ? e.message
            : "Upload failed. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  }, []);

  // ---- Step 2: crop (pan a square window over the photo) ----
  const [crop, setCrop] = useState<PuzzleCrop | null>(null);

  // ---- Step 3: difficulty ----
  const [creating, setCreating] = useState(false);
  const onCreate = useCallback(
    async (difficulty: string) => {
      if (!chosen || !crop || creating) return;
      setCreating(true);
      setError("");
      void haptic("medium");
      const result = await createPuzzle({
        memoryId: chosen.memoryId,
        attachmentUrl: chosen.fullUrl,
        crop,
        difficulty,
      });
      if (result.ok && result.puzzleId) {
        router.push(`/activities/puzzles/${result.puzzleId}`);
        return;
      }
      setCreating(false);
      setError(
        result.ok === false && result.reason === "unavailable"
          ? "Puzzles aren't quite ready yet — please try again soon."
          : "We couldn't create that puzzle. Please try again.",
      );
    },
    [chosen, crop, creating, router],
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <button
        type="button"
        onClick={() =>
          step === "image"
            ? router.push("/activities/puzzles")
            : setStep(step === "crop" ? "image" : "crop")
        }
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-medium text-charcoal-soft transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {step === "image" ? "Memory Puzzles" : "Back"}
      </button>

      <header className="mt-4">
        <h1 className="font-serif text-2xl font-semibold text-charcoal md:text-3xl">
          {step === "image"
            ? "Choose a photo"
            : step === "crop"
              ? "Frame your puzzle"
              : "How gentle should it be?"}
        </h1>
        <p className="mt-1 text-charcoal-soft">
          {step === "image"
            ? "Pick a photo from your memories, or add a new one."
            : step === "crop"
              ? "Drag to choose the square that becomes the puzzle."
              : "Every option is relaxed — pick what feels right today."}
        </p>
      </header>

      {error && (
        <p role="alert" className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      )}

      {step === "image" && (
        <section className="mt-6">
          <div role="tablist" aria-label="Photo source" className="flex gap-2">
            {(
              [
                ["memories", "From your memories"],
                ["upload", "New photo"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`min-h-11 rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  tab === id
                    ? "bg-primary text-white"
                    : "bg-white text-charcoal-soft border border-sand-deep/70 hover:bg-sand"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "memories" ? (
            loadingImages ? (
              <div className="mt-4 grid grid-cols-3 gap-2" aria-hidden>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square animate-pulse rounded-2xl bg-sand-deep/40 motion-reduce:animate-none"
                  />
                ))}
              </div>
            ) : pickerFailed && images.length === 0 ? (
              /* A failed load is an ERROR, not an empty archive — never tell a
                 user with photos that they have none. */
              <div className="mt-4 rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
                <p className="text-charcoal-soft">
                  We couldn&apos;t load your photos right now.
                </p>
                <p className="mt-1 text-sm text-charcoal-muted">
                  Your memories are safe — check your connection and try again.
                </p>
                <button
                  type="button"
                  onClick={() => void retryPicker()}
                  className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Try again
                </button>
              </div>
            ) : images.length === 0 ? (
              <div className="mt-4 rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
                <p className="text-charcoal-soft">No photos in your memories yet.</p>
                <p className="mt-1 text-sm text-charcoal-muted">
                  Add a new photo instead — it becomes a memory too.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {images.map((img, i) => (
                    <button
                      key={`${img.memoryId}-${i}`}
                      type="button"
                      onClick={() => {
                        void haptic("light");
                        setChosen(img);
                        setStep("crop");
                      }}
                      aria-label={`Use photo from “${img.memoryTitle || "memory"}”`}
                      className="aspect-square overflow-hidden rounded-2xl border border-sand-deep/60 bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived
                          URLs; next/image optimization would re-proxy already-optimized variants */}
                      <img
                        src={img.thumbUrl}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
                {hasMore && (
                  <button
                    type="button"
                    onClick={() => void loadPage(pickerOffset)}
                    className="mx-auto mt-4 flex min-h-11 items-center justify-center rounded-full border border-sand-deep/70 bg-white px-6 py-2.5 text-sm font-semibold text-charcoal transition hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Show more photos
                  </button>
                )}
              </>
            )
          ) : (
            <label className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-3xl border border-dashed border-sand-deep bg-white p-10 text-center shadow-soft transition focus-within:ring-2 focus-within:ring-primary hover:border-primary/40">
              <ImagePlus className="h-8 w-8 text-primary" aria-hidden />
              <span className="font-medium text-charcoal">
                {uploading ? "Adding your photo…" : "Choose a photo"}
              </span>
              <span className="text-sm text-charcoal-muted">
                It will be saved to your memories first.
              </span>
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => onUpload(e.target.files?.[0])}
                className="sr-only"
              />
            </label>
          )}
        </section>
      )}

      {step === "crop" && chosen && (
        <CropStep
          imageUrl={chosen.fullUrl}
          onConfirm={(c) => {
            setCrop(c);
            setStep("difficulty");
          }}
        />
      )}

      {step === "difficulty" && (
        <section className="mt-6 space-y-3">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.id}
              type="button"
              disabled={creating}
              onClick={() => onCreate(d.id)}
              className="flex w-full items-center justify-between gap-4 rounded-3xl border border-sand-deep/70 bg-white p-4 text-left shadow-soft transition hover:border-primary/30 hover:shadow-soft-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
            >
              <span>
                <span className="block text-[17px] font-semibold text-charcoal">
                  {d.label}
                </span>
                <span className="mt-0.5 block text-sm text-charcoal-muted">
                  {d.pieces} pieces · {d.estimate}, no rush
                </span>
              </span>
              <span aria-hidden className="text-sm font-semibold text-primary">
                {creating ? "…" : "Create"}
              </span>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}

/**
 * Square crop: the viewport IS the crop window; the photo pans behind it
 * (cover-fit, so the crop side = the image's shorter dimension). Pointer-drag
 * pans; arrow keys nudge (keyboard/switch access). Crop is captured in SOURCE
 * pixels + natural dimensions so board math is exact.
 */
function CropStep({
  imageUrl,
  onConfirm,
}: {
  imageUrl: string;
  onConfirm: (crop: PuzzleCrop) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // source px, crop origin
  const [viewportPx, setViewportPx] = useState(320);
  const drag = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  // Measure the crop window (state, not a render-time ref read) + track resizes.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => setViewportPx(el.clientWidth || 320);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const side = dims ? Math.min(dims.w, dims.h) : 0;
  const maxX = dims ? dims.w - side : 0;
  const maxY = dims ? dims.h - side : 0;
  const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v));

  // Rendered scale: viewport px per source px.
  const scale = side > 0 ? viewportPx / side : 1;

  return (
    <section className="mt-6">
      <div
        ref={viewportRef}
        role="application"
        aria-label="Crop — drag the photo, or use the arrow keys, to choose the square"
        tabIndex={0}
        onKeyDown={(e) => {
          const nudge = side / 20;
          if (e.key === "ArrowLeft") setOffset((o) => ({ ...o, x: clamp(o.x - nudge, maxX) }));
          else if (e.key === "ArrowRight") setOffset((o) => ({ ...o, x: clamp(o.x + nudge, maxX) }));
          else if (e.key === "ArrowUp") setOffset((o) => ({ ...o, y: clamp(o.y - nudge, maxY) }));
          else if (e.key === "ArrowDown") setOffset((o) => ({ ...o, y: clamp(o.y + nudge, maxY) }));
          else return;
          e.preventDefault();
        }}
        onPointerDown={(e) => {
          drag.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setOffset({
            x: clamp(drag.current.ox - (e.clientX - drag.current.startX) / scale, maxX),
            y: clamp(drag.current.oy - (e.clientY - drag.current.startY) / scale, maxY),
          });
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        className="relative mx-auto aspect-square w-full max-w-sm touch-none select-none overflow-hidden rounded-3xl border border-sand-deep bg-sand shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- signed source; we need raw
            natural dimensions for exact crop math */}
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          onLoad={(e) => {
            const el = e.currentTarget;
            const w = el.naturalWidth, h = el.naturalHeight;
            setDims({ w, h });
            // Start centred.
            const s = Math.min(w, h);
            setOffset({ x: (w - s) / 2, y: (h - s) / 2 });
          }}
          style={
            dims
              ? {
                  width: dims.w * scale,
                  height: dims.h * scale,
                  transform: `translate(${-offset.x * scale}px, ${-offset.y * scale}px)`,
                  maxWidth: "none",
                }
              : { opacity: 0 }
          }
          className="absolute left-0 top-0"
        />
        {!dims && (
          <div
            aria-hidden
            className="absolute inset-0 animate-pulse bg-sand-deep/40 motion-reduce:animate-none"
          />
        )}
      </div>

      <button
        type="button"
        disabled={!dims}
        onClick={() => {
          if (!dims) return;
          void haptic("light");
          onConfirm({
            x: Math.round(offset.x),
            y: Math.round(offset.y),
            side: Math.round(side),
            naturalWidth: dims.w,
            naturalHeight: dims.h,
          });
        }}
        className="mx-auto mt-5 flex min-h-11 w-full max-w-sm items-center justify-center rounded-full bg-primary px-6 py-3 font-semibold text-white shadow-soft transition hover:bg-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
      >
        Use this framing
      </button>
    </section>
  );
}
