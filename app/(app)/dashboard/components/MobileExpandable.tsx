"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

interface MobileExpandableProps {
  children: ReactNode;
}

/**
 * Mobile-only progressive disclosure (< md). Clamps tall dashboard widgets to a
 * summary height with a "Show more"/"Show less" toggle so the mobile dashboard
 * isn't many screen-heights long — while preserving 100% of the content (it's
 * expanded, never removed).
 *
 * Desktop (md+) is a pure passthrough: no clamp, no fade, no button. The toggle
 * only appears when the content actually overflows the clamp, so short or
 * empty-rendering widgets (the Remy widgets `return null` when empty) are left
 * exactly as they were.
 */
export default function MobileExpandable({ children }: MobileExpandableProps) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // ResizeObserver fires on observe and on any content/viewport size change.
    // Setting state in its (async) callback avoids synchronous set-state-in-effect
    // and keeps the overflow check correct as the viewport crosses `md`.
    const observer = new ResizeObserver(() => {
      setOverflowing(el.scrollHeight > el.clientHeight + 4);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div>
      <div
        ref={ref}
        className={`relative overflow-hidden md:overflow-visible ${
          expanded ? "max-h-none" : "max-h-[18rem] md:max-h-none"
        }`}
      >
        {children}

        {!expanded && overflowing && (
          <div className="md:hidden pointer-events-none absolute inset-x-0 bottom-0 h-20 rounded-b-3xl bg-gradient-to-t from-white via-white/85 to-transparent" />
        )}
      </div>

      {overflowing && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="md:hidden mt-2 flex w-full items-center justify-center rounded-full border border-sand-deep/70 bg-white/70 px-4 py-2 text-sm font-medium text-primary transition hover:bg-white"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
