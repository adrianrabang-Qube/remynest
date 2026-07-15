"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";

import { haptic, hapticSuccess } from "@/lib/haptics";
import {
  TOGETHER_MAX_MOMENTS,
  TOGETHER_MIN_MOMENTS,
  TOGETHER_TITLE_MAX,
} from "@/lib/together-time/types";
import { createTogetherTime } from "@/app/(app)/activities/family/actions";
import MomentOrderList, {
  type MomentListItem,
} from "@/components/stories/MomentOrderList";

/**
 * Together Time create wizard: SELECT 3–8 memories from the active workspace →
 * ARRANGE (optional title + order via the ONE shared button-driven list) →
 * save. Reuses the established settle-always picker over /api/memories
 * (`data.data` shape; signed thumbs / serif text tiles; retry; Show more).
 */

type PickerMemory = {
  id: string;
  title: string;
  excerpt: string;
  thumbUrl: string | null;
};

const PICKER_PAGE = 50;

function toPickerMemory(raw: unknown): PickerMemory | null {
  const m = raw as Record<string, unknown> | null;
  if (!m?.id) return null;
  const attachments = (Array.isArray(m.attachments) ? m.attachments : []) as Array<
    Record<string, unknown>
  >;
  const image = attachments.find((a) => {
    const mime = String(a?.mimeType ?? a?.type ?? "");
    return typeof a?.url === "string" && (!mime || mime.startsWith("image"));
  });
  const content = typeof m.content === "string" ? m.content : "";
  return {
    id: String(m.id),
    title: typeof m.title === "string" ? m.title : "",
    excerpt: content.slice(0, 80),
    thumbUrl:
      typeof image?.thumbnailUrl === "string"
        ? (image.thumbnailUrl as string)
        : typeof image?.url === "string"
          ? (image.url as string)
          : null,
  };
}

export default function TogetherTimeWizard() {
  const router = useRouter();
  const [step, setStep] = useState<"select" | "arrange">("select");
  const [error, setError] = useState("");
  const [announce, setAnnounce] = useState("");

  const [memories, setMemories] = useState<PickerMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

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
      const page = (list as unknown[])
        .map(toPickerMemory)
        .filter(Boolean) as PickerMemory[];
      setMemories((prev) => (pageOffset === 0 ? page : [...prev, ...page]));
      setOffset(pageOffset + PICKER_PAGE);
      setHasMore((list as unknown[]).length === PICKER_PAGE);
    } catch {
      setFailed(true);
      setError("We couldn't load your memories right now.");
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

  const byId = useMemo(() => new Map(memories.map((m) => [m.id, m])), [memories]);

  const toggle = useCallback((id: string) => {
    void haptic("light");
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= TOGETHER_MAX_MOMENTS) return prev;
      return [...prev, id];
    });
  }, []);

  const orderedItems: MomentListItem[] = selectedIds
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((m) => ({
      id: (m as PickerMemory).id,
      title:
        (m as PickerMemory).title || (m as PickerMemory).excerpt || "Untitled moment",
      imageUrl: (m as PickerMemory).thumbUrl,
    }));

  const move = useCallback((index: number, dir: -1 | 1) => {
    setSelectedIds((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
    setAnnounce(`Moved to position ${index + 1 + dir}.`);
    void haptic("light");
  }, []);

  const remove = useCallback((index: number) => {
    setSelectedIds((prev) => prev.filter((_, i) => i !== index));
    setAnnounce("Removed from this together time.");
    void haptic("light");
  }, []);

  const onSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    void haptic("medium");
    const result = await createTogetherTime({ title, memoryIds: selectedIds });
    if (result.ok && result.togetherTimeId) {
      void hapticSuccess();
      router.push(`/activities/family/${result.togetherTimeId}`);
      return;
    }
    setSaving(false);
    setError(
      !result.ok && result.reason === "unavailable"
        ? "Together Time isn't quite ready yet — please try again soon."
        : "We couldn't save this together time. Please try again.",
    );
  }, [saving, title, selectedIds, router]);

  const canContinue = selectedIds.length >= TOGETHER_MIN_MOMENTS;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>

      <button
        type="button"
        onClick={() =>
          step === "select" ? router.push("/activities/family") : setStep("select")
        }
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-medium text-charcoal-soft transition hover:text-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {step === "select" ? "Family Activities" : "Back to choosing"}
      </button>

      <header className="mt-4">
        <h1 className="font-serif text-2xl font-semibold text-charcoal md:text-3xl">
          {step === "select" ? "Choose your moments" : "Arrange your together time"}
        </h1>
        <p className="mt-1 text-charcoal-soft">
          {step === "select"
            ? `Pick ${TOGETHER_MIN_MOMENTS} to ${TOGETHER_MAX_MOMENTS} memories to look back through together.`
            : "An optional title, and the order that feels right."}
        </p>
      </header>

      {error && (
        <p role="alert" className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      )}

      {step === "select" && (
        <section className="mt-6">
          {loading ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-hidden>
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square animate-pulse rounded-2xl bg-sand-deep/40 motion-reduce:animate-none"
                />
              ))}
            </div>
          ) : failed && memories.length === 0 ? (
            <div className="rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
              <p className="text-charcoal-soft">
                We couldn&apos;t load your memories right now.
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
          ) : memories.length === 0 ? (
            <div className="rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
              <p className="text-charcoal-soft">No memories yet.</p>
              <p className="mt-1 text-sm text-charcoal-muted">
                Add a few memories first — then gather them here.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {memories.map((m) => {
                  const orderIndex = selectedIds.indexOf(m.id);
                  const isSelected = orderIndex !== -1;
                  const name = m.title || m.excerpt || "Untitled memory";
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggle(m.id)}
                      aria-pressed={isSelected}
                      aria-label={
                        isSelected ? `Remove “${name}”` : `Add “${name}”`
                      }
                      className={`relative aspect-square overflow-hidden rounded-2xl border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage ${
                        isSelected ? "border-sage ring-2 ring-sage" : "border-sand-deep/60"
                      }`}
                    >
                      {m.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URL
                        <img
                          src={m.thumbUrl}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full flex-col justify-between bg-sand p-3">
                          <span className="font-serif text-2xl leading-none text-gold-ink" aria-hidden>
                            ”
                          </span>
                          <span className="line-clamp-3 text-sm font-medium text-charcoal">
                            {name}
                          </span>
                        </span>
                      )}
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
                  Show more memories
                </button>
              )}
              <button
                type="button"
                disabled={!canContinue}
                onClick={() => setStep("arrange")}
                className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-sage px-6 py-3 font-semibold text-white shadow-soft transition hover:bg-sage-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 disabled:opacity-50"
              >
                <Check className="h-5 w-5" aria-hidden />
                {canContinue
                  ? `Continue with ${selectedIds.length} moment${selectedIds.length === 1 ? "" : "s"}`
                  : `Choose at least ${TOGETHER_MIN_MOMENTS} moments`}
              </button>
            </>
          )}
        </section>
      )}

      {step === "arrange" && (
        <section className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="together-title"
              className="block text-sm font-medium text-charcoal-soft"
            >
              Title <span className="text-charcoal-muted">(optional)</span>
            </label>
            <input
              id="together-title"
              type="text"
              value={title}
              maxLength={TOGETHER_TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sunday afternoon with Mum"
              className="mt-1 w-full rounded-xl border border-sand-deep px-4 py-3 text-base text-charcoal outline-none transition placeholder:text-charcoal-muted focus:border-sage focus:ring-2 focus:ring-sage/40"
            />
          </div>

          <MomentOrderList
            items={orderedItems}
            onMove={move}
            onRemove={
              selectedIds.length > TOGETHER_MIN_MOMENTS ? remove : undefined
            }
          />

          <button
            type="button"
            disabled={saving || !canContinue}
            onClick={() => void onSave()}
            aria-busy={saving || undefined}
            className="flex min-h-11 w-full items-center justify-center rounded-full bg-sage px-6 py-3 font-semibold text-white shadow-soft transition hover:bg-sage-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save together time"}
          </button>
        </section>
      )}
    </div>
  );
}
