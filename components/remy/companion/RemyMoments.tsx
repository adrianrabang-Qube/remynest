"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

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
import { tryBeginMoment, endMoment } from "@/lib/remy/companion/moment-gate";
import { dayKey, daysBetween } from "@/lib/remy/companion/day";
import RemyMomentChip from "./RemyMomentChip";

/**
 * Remy Platform (v2) — REMY MOMENTS (Companion Intelligence surface, mounted ONCE by the app shell).
 *
 * Proactive, NOT chat and NOT notifications: once per app-open it gathers a real workspace snapshot
 * (a single read-only fetch — never polled), runs the pure Insights + Priority engines to pick AT
 * MOST ONE observation, and — if one clears its cooldown AND no other moment is on screen (the
 * shared moment gate) — Remy briefly appears with a natural line, then fades. Behavioural memory
 * (last-visit day, acknowledged Nest stage, per-kind cooldowns) is persisted so greetings fire once
 * a day and observations never repeat/spam. Extends the ONE platform (single renderer + persistence
 * + core engines); best-effort ambient — any failure silently shows nothing.
 */
export default function RemyMoments() {
  const reduce = useReducedMotion();
  const [moment, setMoment] = useState<Observation | null>(null);
  const ran = useRef(false);
  const began = useRef(false);
  const reduceRef = useRef(reduce);
  useEffect(() => {
    reduceRef.current = reduce;
  }, [reduce]);

  const close = useCallback(() => {
    setMoment(null);
    if (began.current) {
      endMoment();
      began.current = false;
    }
  }, []);

  useEffect(() => {
    // Run the companion intelligence exactly ONCE per app-open (the shell persists across
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
        };

        const selected = selectMoment(deriveObservations(snapshot), {
          cooldowns: memory.cooldowns,
          now: now.getTime(),
        });

        // Record the visit + acknowledge the current stage regardless of what we show.
        writeCompanionMemory({ ...memory, lastVisitDate: today, acknowledgedStage: nestStage });

        if (!selected || cancelled) return;

        showTimer = setTimeout(() => {
          if (cancelled) return;
          // Only one proactive moment on screen at a time (shared across companion surfaces).
          if (!tryBeginMoment()) return;
          began.current = true;
          setMoment(selected);
          const fresh = readCompanionMemory();
          writeCompanionMemory({
            ...fresh,
            cooldowns: { ...fresh.cooldowns, [selected.kind]: Date.now() },
          });
          hideTimer = setTimeout(
            () => {
              if (!cancelled) close();
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
      if (began.current) {
        endMoment();
        began.current = false;
      }
    };
  }, [close]);

  const look = moment ? resolveBehaviorLook(moment.behavior) : null;

  return (
    <RemyMomentChip
      visible={Boolean(moment)}
      expression={look?.expression ?? "idle"}
      emotion={look?.emotion}
      reactionKey={moment?.kind ?? "none"}
      message={moment?.message ?? ""}
      onDismiss={close}
    />
  );
}
