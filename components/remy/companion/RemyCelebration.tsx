"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

import RemyRenderer from "@/components/remy/Remy";
import { remyEventBus } from "@/lib/remy/core/event-bus";
import { FeatherBurst, Sparkles, HeartPulse } from "@/components/remy/effects/RemyEffects";

/**
 * Remy Platform (v2) — CELEBRATION SURFACE (mounted once by the app shell).
 *
 * The platform's third render surface (alongside the floating presence + in-place stages): when a
 * big moment lands (`milestone.reached`, `success`), Remy steps to centre-stage, celebrates, and a
 * golden feather burst + sparkles + heart rise around it — then it fades. It SUBSCRIBES to the one
 * event bus (never chooses when to fire), draws only through the single `<Remy>` renderer, is
 * `pointer-events-none` (never blocks the UI), portaled to <body> (WebKit containing-block), and
 * announces the milestone politely for screen readers. Reduced-motion → a calm fade, no flourish.
 */
export default function RemyCelebration() {
  const reduce = useReducedMotion();
  const [celebration, setCelebration] = useState<{ id: number; label: string } | null>(null);
  const seq = useRef(0);

  // Subscribe for celebration-worthy events. `{ replay: false }` is REQUIRED: this is a secondary
  // listener whose (child) effect can run before the provider's Brain subscribes, so it must NOT
  // drain the bus's initial-mount replay buffer that the Brain relies on. Live events only.
  useEffect(() => {
    const unsubscribe = remyEventBus.subscribe(
      (event) => {
        if (event.name !== "milestone.reached" && event.name !== "success") return;
        const label =
          typeof event.payload?.label === "string" ? (event.payload.label as string) : "";
        setCelebration({ id: ++seq.current, label });
      },
      { replay: false },
    );
    return unsubscribe;
  }, []);

  // Auto-dismiss (token-guarded so a newer celebration is not cut short by an older timer).
  useEffect(() => {
    if (!celebration) return;
    const id = celebration.id;
    const timer = setTimeout(
      () => setCelebration((c) => (c?.id === id ? null : c)),
      reduce ? 1600 : 2800,
    );
    return () => clearTimeout(timer);
  }, [celebration, reduce]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-[55] flex items-center justify-center"
      aria-live="polite"
    >
      <AnimatePresence>
        {celebration && (
          <motion.div
            key={celebration.id}
            className="flex flex-col items-center"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: -12 }}
            transition={
              reduce ? { duration: 0.2 } : { type: "spring", stiffness: 260, damping: 22 }
            }
          >
            <div className="relative">
              <FeatherBurst />
              <Sparkles />
              <RemyRenderer
                state="celebrating"
                emotion="celebrating"
                reactionKey={celebration.id}
                size={112}
                decorative
              />
              <HeartPulse />
            </div>
            {celebration.label && (
              <p className="mt-3 rounded-full bg-white/95 px-4 py-1.5 text-sm font-semibold text-charcoal shadow-soft-lg ring-1 ring-sand-deep/40">
                {celebration.label}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
