"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { haptic } from "@/lib/haptics";
import { promptForMoment } from "@/lib/together-time/types";
import type { TogetherMoment } from "@/lib/together-time/queries";
import { markTogetherTimeOpened } from "@/app/(app)/activities/family/actions";

/**
 * The Together Time player — one moment at a time, advanced MANUALLY with
 * Previous/Next (suitable side-by-side or over an ordinary phone call; no live
 * sync of any kind). Each moment shows the signed photo when there is one, the
 * memory's own words, a Voice Memory recording via the established
 * user-initiated <audio controls> (never autoplay), and ONE fixed,
 * deterministic prompt (moment index → the approved four-line set).
 *
 * Accessibility: "Moment X of Y" is aria-live announced on navigation; focus
 * moves to the moment heading after Previous/Next so screen readers read the
 * new moment naturally; controls are ≥44px and in flow (safe-area clearance
 * comes from the app shell). No slide animations — nothing motion-dependent.
 * On mount it fires ONE best-effort `markTogetherTimeOpened` (hub ordering);
 * the result is deliberately ignored so read-only caregivers run sets freely.
 */
export default function MomentPlayer({
  togetherTimeId,
  moments,
}: {
  togetherTimeId: string;
  moments: TogetherMoment[];
}) {
  const [index, setIndex] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mountedRef = useRef(false);

  // Best-effort hub-ordering bump — result intentionally ignored (readers ok).
  useEffect(() => {
    void markTogetherTimeOpened(togetherTimeId).catch(() => {});
  }, [togetherTimeId]);

  const go = useCallback(
    (dir: -1 | 1) => {
      setIndex((i) => {
        const next = Math.min(Math.max(i + dir, 0), moments.length - 1);
        return next;
      });
      void haptic("light");
    },
    [moments.length],
  );

  // After navigation, move focus to the moment heading (skip the initial mount
  // so the page's own focus order is respected on load).
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    headingRef.current?.focus();
  }, [index]);

  if (moments.length === 0) return null;
  const moment = moments[index];
  const name = moment.title || `Moment ${index + 1}`;

  return (
    <div>
      <p role="status" aria-live="polite" className="sr-only">
        Moment {index + 1} of {moments.length}
        {moment.title ? ` — ${moment.title}` : ""}
      </p>

      <article className="mt-6 overflow-hidden rounded-3xl border border-sand-deep/70 bg-white shadow-soft">
        {moment.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URL
          <img
            src={moment.imageUrl}
            alt={moment.title ? `Photo: ${moment.title}` : `Photo for moment ${index + 1}`}
            className="max-h-96 w-full bg-sand object-cover"
          />
        )}
        <div className="p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-charcoal-muted">
            Moment {index + 1} of {moments.length}
            {moment.memoryDate && (
              <>
                {" · "}
                {new Date(moment.memoryDate).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </>
            )}
          </p>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="mt-1.5 font-serif text-xl font-semibold text-charcoal outline-none"
          >
            {name}
          </h2>
          {moment.content && (
            <p className="mt-2 whitespace-pre-wrap text-[17px] leading-relaxed text-charcoal-soft">
              {moment.content}
            </p>
          )}
          {moment.audioUrl && (
            /* Voice Memory playback — user-initiated only, never autoplay. */
            <audio
              src={moment.audioUrl}
              controls
              preload="metadata"
              aria-label={`Play voice recording: ${moment.audioName}`}
              className="mt-3 w-full"
            />
          )}
        </div>

        {/* The fixed prompt — deterministic per moment; conversation, never clinical. */}
        <div className="border-t border-sand-deep/50 bg-sand p-5">
          <p className="font-serif text-lg leading-relaxed text-charcoal">
            {promptForMoment(index)}
          </p>
        </div>
      </article>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={index === 0}
          className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-sand-deep/70 bg-white px-5 py-2.5 text-sm font-semibold text-charcoal transition hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Previous
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={index === moments.length - 1}
          className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-40"
        >
          Next
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {index === moments.length - 1 && (
        <p className="mt-4 text-center text-sm text-charcoal-muted">
          That&apos;s all of them — lovely. You can go back through, or come
          back another day.
        </p>
      )}
    </div>
  );
}
