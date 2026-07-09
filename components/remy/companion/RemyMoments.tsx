"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

import RemyRenderer from "@/components/remy/Remy";
import {
  deriveObservations,
  type CompanionSnapshot,
  type Observation,
} from "@/lib/remy/core/insights-engine";
import { selectMoment } from "@/lib/remy/core/priority-engine";
import { resolveBehaviorLook } from "@/lib/remy/core/behavior";
import { resolveNestStage, type NestStage } from "@/lib/remy/core/nest";
import { resolveTimeOfDay } from "@/lib/remy/core/time-of-day";
import {
  readCompanionMemory,
  writeCompanionMemory,
} from "@/lib/remy/companion/persistence";

/**
 * Remy Platform (v2) — REMY MOMENTS (Companion Intelligence surface, mounted ONCE by the app shell).
 *
 * Proactive, NOT chat and NOT notifications: once per app-open it gathers a real workspace snapshot
 * (a single read-only fetch — never polled), runs the pure Insights + Priority engines to pick AT
 * MOST ONE observation, and — if one clears its cooldown — Remy briefly appears with a natural line,
 * then fades. Behavioural memory (last-visit day, acknowledged Nest stage, per-kind cooldowns) is
 * persisted so greetings fire once a day and observations never repeat/spam.
 *
 * Extends the ONE platform only: the single `<Remy>` renderer, the behaviour vocabulary, the
 * persistence layer, the core engines. No second provider/bus/brain. Portaled, `pointer-events`
 * limited to a tap-to-dismiss chip, aria-live polite, reduced-motion-safe. Best-effort ambient —
 * any failure silently shows nothing (never throws).
 */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function daysBetween(fromKey: string, toKey: string): number {
  const from = Date.parse(fromKey);
  const to = Date.parse(toKey);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}

export default function RemyMoments() {
  const reduce = useReducedMotion();
  const [moment, setMoment] = useState<Observation | null>(null);
  const ran = useRef(false);
  // Read the motion preference via a ref so the once-per-app-open effect can have empty deps and
  // never re-run (a mid-session preference flip can't cancel a pending moment).
  const reduceRef = useRef(reduce);
  useEffect(() => {
    reduceRef.current = reduce;
  }, [reduce]);

  useEffect(() => {
    // Run the companion intelligence exactly ONCE per app-open (the shell stays mounted across
    // navigations). Not a poll — a single read.
    if (ran.current) return;
    ran.current = true;

    let cancelled = false;
    let showTimer: ReturnType<typeof setTimeout> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      try {
        const res = await fetch("/api/remy/companion-snapshot", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          isMyNest?: boolean;
          memoryCount?: number;
          memoriesToday?: number;
          memoriesThisWeek?: number;
          remindersDueToday?: number;
          remindersCompletedToday?: number;
          todaysReminderTotal?: number;
        };

        const now = new Date();
        const today = dayKey(now);
        const memory = readCompanionMemory();
        const memoryCount = data.memoryCount ?? 0;
        const nestStage = resolveNestStage(memoryCount);

        const snapshot: CompanionSnapshot = {
          isMyNest: Boolean(data.isMyNest),
          memoryCount,
          memoriesToday: data.memoriesToday ?? 0,
          memoriesThisWeek: data.memoriesThisWeek ?? 0,
          remindersDueToday: data.remindersDueToday ?? 0,
          remindersCompletedToday: data.remindersCompletedToday ?? 0,
          todaysReminderTotal: data.todaysReminderTotal ?? 0,
          nestStage,
          timeOfDay: resolveTimeOfDay(now),
          firstVisitToday: memory.lastVisitDate !== today,
          daysSinceLastVisit:
            memory.lastVisitDate != null ? daysBetween(memory.lastVisitDate, today) : null,
          acknowledgedStage: (memory.acknowledgedStage as NestStage | null) ?? null,
          // upcomingDates: wired when a birthday source exists — empty is a no-op for that rule.
        };

        const selected = selectMoment(deriveObservations(snapshot), {
          cooldowns: memory.cooldowns,
          now: now.getTime(),
        });

        // Record the visit + acknowledge the current stage regardless of what we show, so
        // greetings fire once/day and a future evolution reads as fresh.
        writeCompanionMemory({
          ...memory,
          lastVisitDate: today,
          acknowledgedStage: nestStage,
        });

        if (!selected || cancelled) return;

        // A short delay so Remy doesn't jump the instant the app opens.
        showTimer = setTimeout(() => {
          if (cancelled) return;
          setMoment(selected);
          // Persist this kind's cooldown at show time.
          const fresh = readCompanionMemory();
          writeCompanionMemory({
            ...fresh,
            cooldowns: { ...fresh.cooldowns, [selected.kind]: Date.now() },
          });
          hideTimer = setTimeout(
            () => {
              if (!cancelled) setMoment(null);
            },
            reduceRef.current ? 3500 : 6000,
          );
        }, 1600);
      } catch {
        /* best-effort ambient — never throw */
      }
    })();

    return () => {
      cancelled = true;
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  if (typeof document === "undefined" || !moment) return null;

  const look = resolveBehaviorLook(moment.behavior);

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[54] flex justify-center px-4 lg:bottom-6"
      aria-live="polite"
    >
      <AnimatePresence>
        {moment && (
          <motion.button
            type="button"
            onClick={() => setMoment(null)}
            aria-label={`${moment.message} — dismiss`}
            className="pointer-events-auto flex max-w-[22rem] items-center gap-3 rounded-full bg-white/95 py-2 pl-2 pr-4 text-left shadow-soft-lg ring-1 ring-sand-deep/40 backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
            transition={
              reduce ? { duration: 0.2 } : { type: "spring", stiffness: 320, damping: 26 }
            }
          >
            <RemyRenderer
              state={look.expression}
              emotion={look.emotion}
              reactionKey={moment.kind}
              size={40}
              decorative
            />
            <span className="text-sm font-medium text-charcoal">{moment.message}</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
