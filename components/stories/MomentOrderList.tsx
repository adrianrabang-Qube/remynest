"use client";

import { ArrowDown, ArrowUp, X } from "lucide-react";

/**
 * The ordered "moments" list — Story Builder's single reorder surface (shared
 * by the create wizard and the editor, so there is exactly one implementation).
 * Reordering is BUTTON-driven (Move earlier / Move later, ≥44px targets,
 * position-aware labels) — fully keyboard/screen-reader/motor accessible;
 * touch drag is deliberately not required. Parent owns state + announcements.
 */
export interface MomentListItem {
  id: string;
  title: string;
  imageUrl: string | null;
}

export default function MomentOrderList({
  items,
  onMove,
  onRemove,
}: {
  items: MomentListItem[];
  onMove: (index: number, direction: -1 | 1) => void;
  /** Omit to hide remove controls (e.g. when at the minimum). */
  onRemove?: (index: number) => void;
}) {
  return (
    <ol className="space-y-2">
      {items.map((item, i) => {
        const name = item.title || `Moment ${i + 1}`;
        return (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-3xl border border-sand-deep/70 bg-white p-3 shadow-soft"
          >
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sand text-sm font-semibold text-charcoal-soft"
            >
              {i + 1}
            </span>
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URL
              <img
                src={item.imageUrl}
                alt=""
                className="h-12 w-12 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sand font-serif text-lg text-charcoal-muted"
              >
                ”
              </span>
            )}
            <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-charcoal">
              {name}
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                disabled={i === 0}
                onClick={() => onMove(i, -1)}
                aria-label={`Move “${name}” earlier — currently ${i + 1} of ${items.length}`}
                className="flex h-11 w-11 items-center justify-center rounded-full text-charcoal-soft transition hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage disabled:opacity-30"
              >
                <ArrowUp className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                disabled={i === items.length - 1}
                onClick={() => onMove(i, 1)}
                aria-label={`Move “${name}” later — currently ${i + 1} of ${items.length}`}
                className="flex h-11 w-11 items-center justify-center rounded-full text-charcoal-soft transition hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage disabled:opacity-30"
              >
                <ArrowDown className="h-5 w-5" aria-hidden />
              </button>
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  aria-label={`Remove “${name}” from the story`}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-charcoal-muted transition hover:bg-rose-50 hover:text-rose-600/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
