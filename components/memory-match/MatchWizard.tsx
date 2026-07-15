"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { haptic, hapticSuccess } from "@/lib/haptics";
import { MATCH_SIZES } from "@/lib/memory-match/types";
import { createMatchGame } from "@/app/(app)/activities/match/actions";

/**
 * Memory Match create wizard: choose a calm SIZE (3/4/6/8 pairs) → select
 * EXACTLY that many photos → create. Photo-level picker over the existing
 * paginated /api/memories feed (`data.data` shape; settle-always with retry;
 * signed thumbs for display, untransformed fallback url passed to the server
 * for canonical ownership verification). Tap-only; no timers, no scores.
 */

type PickerPhoto = {
  memoryId: string;
  memoryTitle: string;
  thumbUrl: string;
  fullUrl: string;
};

const PICKER_PAGE = 50;

function extractPhotos(raw: unknown): PickerPhoto[] {
  const m = raw as Record<string, unknown> | null;
  if (!m?.id || !Array.isArray(m.attachments)) return [];
  const out: PickerPhoto[] = [];
  for (const a of m.attachments as Array<Record<string, unknown>>) {
    const mime = String(a?.mimeType ?? a?.type ?? "");
    const url = typeof a?.url === "string" ? a.url : null;
    if (!url || (mime && !mime.startsWith("image"))) continue;
    out.push({
      memoryId: String(m.id),
      memoryTitle: typeof m.title === "string" ? m.title : "",
      thumbUrl:
        typeof a?.thumbnailUrl === "string" ? (a.thumbnailUrl as string) : url,
      fullUrl:
        typeof a?.fallbackUrl === "string" ? (a.fallbackUrl as string) : url,
    });
  }
  return out;
}

export default function MatchWizard() {
  const router = useRouter();
  const [step, setStep] = useState<"size" | "photos">("size");
  const [pairs, setPairs] = useState<number | null>(null);
  const [error, setError] = useState("");

  const [photos, setPhotos] = useState<PickerPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState<string[]>([]); // fullUrl keys
  const [creating, setCreating] = useState(false);

  const loadPage = useCallback(async (pageOffset: number): Promise<void> => {
    setError("");
    setFailed(false);
    try {
      const res = await fetch(
        `/api/memories?limit=${PICKER_PAGE}&offset=${pageOffset}`,
        { cache: "no-store", signal: AbortSignal.timeout(15_000) },
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];
      const page = (list as unknown[]).flatMap(extractPhotos);
      setPhotos((prev) => (pageOffset === 0 ? page : [...prev, ...page]));
      setOffset(pageOffset + PICKER_PAGE);
      setHasMore((list as unknown[]).length === PICKER_PAGE);
    } catch {
      setFailed(true);
      setError("We couldn't load your photos right now.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadPage(0);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadPage]);

  const retry = useCallback(async () => {
    setLoading(true);
    await loadPage(0);
    setLoading(false);
  }, [loadPage]);

  const toggle = useCallback(
    (photo: PickerPhoto) => {
      if (pairs == null) return;
      void haptic("light");
      setSelected((prev) => {
        if (prev.includes(photo.fullUrl)) {
          return prev.filter((x) => x !== photo.fullUrl);
        }
        if (prev.length >= pairs) return prev;
        return [...prev, photo.fullUrl];
      });
    },
    [pairs],
  );

  const onCreate = useCallback(async () => {
    if (creating || pairs == null || selected.length !== pairs) return;
    setCreating(true);
    setError("");
    void haptic("medium");
    const byUrl = new Map(photos.map((p) => [p.fullUrl, p]));
    const chosen = selected
      .map((url) => byUrl.get(url))
      .filter(Boolean)
      .map((p) => ({ memoryId: (p as PickerPhoto).memoryId, path: (p as PickerPhoto).fullUrl }));
    const result = await createMatchGame({ photos: chosen });
    if (result.ok && result.gameId) {
      void hapticSuccess();
      router.push(`/activities/match/${result.gameId}`);
      return;
    }
    setCreating(false);
    setError(
      !result.ok && result.reason === "unavailable"
        ? "Memory Match isn't quite ready yet — please try again soon."
        : "We couldn't create that game. Please try again.",
    );
  }, [creating, pairs, selected, photos, router]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <button
        type="button"
        onClick={() =>
          step === "size" ? router.push("/activities/match") : setStep("size")
        }
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-medium text-charcoal-soft transition hover:text-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {step === "size" ? "Memory Match" : "Back to sizes"}
      </button>

      <header className="mt-4">
        <h1 className="font-serif text-2xl font-semibold text-charcoal md:text-3xl">
          {step === "size" ? "How big a game?" : "Choose your photos"}
        </h1>
        <p className="mt-1 text-charcoal-soft">
          {step === "size"
            ? "Every size is relaxed — pick what feels right today."
            : pairs != null
              ? `Pick ${pairs} photos — each one becomes a matching pair.`
              : ""}
        </p>
      </header>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600"
        >
          {error}
        </p>
      )}

      {step === "size" && (
        <section className="mt-6 space-y-3">
          {MATCH_SIZES.map((s) => (
            <button
              key={s.pairs}
              type="button"
              onClick={() => {
                void haptic("light");
                setPairs(s.pairs);
                setSelected([]);
                setStep("photos");
              }}
              className="flex w-full items-center justify-between gap-4 rounded-3xl border border-sand-deep/70 bg-white p-4 text-left shadow-soft transition hover:border-sage/30 hover:shadow-soft-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
            >
              <span>
                <span className="block text-[17px] font-semibold text-charcoal">
                  {s.label}
                </span>
                <span className="mt-0.5 block text-sm text-charcoal-muted">
                  {s.pairs} pairs · {s.description}
                </span>
              </span>
              <span aria-hidden className="text-sm font-semibold text-sage">
                Choose
              </span>
            </button>
          ))}
        </section>
      )}

      {step === "photos" && pairs != null && (
        <section className="mt-6">
          {loading ? (
            <div className="grid grid-cols-3 gap-2" aria-hidden>
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square animate-pulse rounded-2xl bg-sand-deep/40 motion-reduce:animate-none"
                />
              ))}
            </div>
          ) : failed && photos.length === 0 ? (
            <div className="rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
              <p className="text-charcoal-soft">
                We couldn&apos;t load your photos right now.
              </p>
              <p className="mt-1 text-sm text-charcoal-muted">
                They&apos;re safe — check your connection and try again.
              </p>
              <button
                type="button"
                onClick={() => void retry()}
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-sage px-6 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-sage-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
              >
                Try again
              </button>
            </div>
          ) : photos.length === 0 ? (
            <div className="rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
              <p className="text-charcoal-soft">No photos in your memories yet.</p>
              <p className="mt-1 text-sm text-charcoal-muted">
                Add some photo memories first — then match them here.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo, i) => {
                  const orderIndex = selected.indexOf(photo.fullUrl);
                  const isSelected = orderIndex !== -1;
                  const name = photo.memoryTitle || "memory";
                  return (
                    <button
                      key={`${photo.memoryId}-${i}`}
                      type="button"
                      onClick={() => toggle(photo)}
                      aria-pressed={isSelected}
                      aria-label={
                        isSelected
                          ? `Remove photo from “${name}”`
                          : `Use photo from “${name}”`
                      }
                      className={`relative aspect-square overflow-hidden rounded-2xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage ${
                        isSelected ? "border-sage ring-2 ring-sage" : "border-sand-deep/60"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URL */}
                      <img
                        src={photo.thumbUrl}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                      {isSelected && (
                        <span
                          aria-hidden
                          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-sage text-xs font-bold text-white shadow-soft"
                        >
                          {orderIndex + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {hasMore && (
                <button
                  type="button"
                  onClick={() => void loadPage(offset)}
                  className="mx-auto mt-4 flex min-h-11 items-center justify-center rounded-full border border-sand-deep/70 bg-white px-6 py-2.5 text-sm font-semibold text-charcoal transition hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
                >
                  Show more photos
                </button>
              )}
              <button
                type="button"
                disabled={selected.length !== pairs || creating}
                onClick={() => void onCreate()}
                aria-busy={creating || undefined}
                className="mt-6 flex min-h-11 w-full items-center justify-center rounded-full bg-sage px-6 py-3 font-semibold text-white shadow-soft transition hover:bg-sage-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 disabled:opacity-50"
              >
                {creating
                  ? "Setting the table…"
                  : `Start matching (${selected.length} of ${pairs} chosen)`}
              </button>
            </>
          )}
        </section>
      )}
    </div>
  );
}
