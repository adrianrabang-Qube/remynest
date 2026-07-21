"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Slim top progress bar — gives an immediate "navigation in flight" cue so taps
 * feel acknowledged within ~100ms even while a (force-dynamic) route renders on
 * the server and travels over the WebView's network.
 *
 * Purely presentational and non-invasive: it attaches ONE passive, capture-phase
 * click listener that only reads the event and sets local state. It never calls
 * preventDefault/stopPropagation and never navigates, so it cannot change routing
 * or any existing behavior. Web + remote-URL WebView safe.
 */
export default function NavigationProgress() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const started = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = useCallback(() => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current = [];
  }, []);

  // Begin the bar the moment an internal-link navigation is initiated.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      // Only react when the NEAREST interactive element is the link itself.
      // Cards frequently wrap their body in a <Link> but place real <button>s
      // inside (e.g. MemoryCard Edit/Delete) that cancel the navigation in the
      // bubble phase — starting the bar for those would leave it stuck since the
      // route never changes. If the closest interactive ancestor is a button (or
      // any non-anchor control), this is NOT a link navigation: bail.
      const interactive = (event.target as HTMLElement | null)?.closest(
        'a, button, [role="button"], input, select, textarea, label, summary',
      );
      if (!interactive || interactive.tagName !== "A") return;

      const anchor = interactive as HTMLAnchorElement;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/") || anchor.target === "_blank") return;

      // Same-page click (ignoring query/hash) → no navigation, so no bar.
      const base = href.split("#")[0].split("?")[0];
      if (base === pathname || href === pathname) return;

      clear();
      started.current = true;
      setVisible(true);
      setWidth(12);
      timers.current.push(setTimeout(() => setWidth(58), 60));
      timers.current.push(setTimeout(() => setWidth(84), 350));
      // Failsafe: if the route never changes (cancelled/blocked navigation),
      // never leave the bar hanging — auto-reset after a generous window.
      timers.current.push(
        setTimeout(() => {
          if (!started.current) return;
          started.current = false;
          setVisible(false);
          setWidth(0);
        }, 8000),
      );
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname, clear]);

  // Complete the bar once the route actually changes.
  useEffect(() => {
    if (!started.current) return;
    started.current = false;
    clear();
    setWidth(100);
    timers.current.push(setTimeout(() => setVisible(false), 180));
    timers.current.push(setTimeout(() => setWidth(0), 360));
    return clear;
  }, [pathname, clear]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 z-[60] flex justify-start"
      style={{ top: "env(safe-area-inset-top)" }}
    >
      <div
        className="h-0.5 bg-primary shadow-[0_0_8px_rgba(79,107,91,0.5)] transition-[width,opacity] duration-200 ease-out"
        style={{ width: `${width}%`, opacity: visible ? 1 : 0 }}
      />
    </div>
  );
}
