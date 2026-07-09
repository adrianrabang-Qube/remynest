"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { emitRemyEvent } from "@/lib/remy/core/dispatch";
import { screenEventForPath } from "@/lib/remy/core/screen-behavior";

/**
 * Remy Platform (v2) — SCREEN AWARENESS (mounted once by the app shell).
 *
 * Makes Remy notice WHERE the user is: on each client navigation it publishes the screen's
 * arrival event (`screen.timeline`, `screen.people`, …) so the platform gives a brief, fitting
 * floating reaction that then settles. It fires ONCE per screen entry (pathname-guarded) and
 * publishes only semantic events through the platform — it chooses no expression and renders
 * nothing. Screens that publish their own richer events are omitted from the map (no double-react).
 */
export default function RemyScreenAwareness() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === last.current) return;
    last.current = pathname;
    const event = screenEventForPath(pathname);
    if (event) emitRemyEvent(event);
  }, [pathname]);

  return null;
}
