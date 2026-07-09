"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

import {
  deriveRelationshipObservations,
  type RelationshipSnapshot,
} from "@/lib/remy/core/relationship-engine";
import { selectMoment } from "@/lib/remy/core/priority-engine";
import { rankFavouritePeople } from "@/lib/remy/core/favourite-engine";
import { buildChapters } from "@/lib/remy/core/story-engine";
import { findAnniversaries } from "@/lib/remy/core/anniversary-engine";
import { resolveBehaviorLook } from "@/lib/remy/core/behavior";
import { resolveNestStage, type NestStage } from "@/lib/remy/core/nest";
import type {
  DatedMemory,
  FamilyPerson,
  RelationshipObservation,
} from "@/lib/remy/core/family-types";
import {
  readCompanionMemory,
  readRelationshipMemory,
  writeRelationshipMemory,
} from "@/lib/remy/companion/persistence";
import { tryBeginMoment, endMoment } from "@/lib/remy/companion/moment-gate";
import { dayKey, daysBetween } from "@/lib/remy/companion/day";
import RemyMomentChip from "./RemyMomentChip";

/**
 * Remy Platform (v2) — REMY RELATIONSHIP (Living Relationship System surface, mounted ONCE).
 *
 * The long-term counterpart to RemyMoments: once per app-open it reads a real relationship snapshot
 * (a single fetch — never polled), runs the pure Story / Favourite / Anniversary engines to enrich
 * it, then the Relationship engine + Priority engine to pick AT MOST ONE warm, "we've built
 * something together" moment (anniversaries, a favourite person, the first-memory anniversary, the
 * Nest reaching Sanctuary, a revisit invitation…). It waits a beat longer than RemyMoments and
 * yields to it via the shared moment gate, so only ONE proactive moment ever shows at a time.
 * Behavioural relationship memory (cooldowns, acknowledged people/favourites) is persisted so a
 * moment never repeats. Extends the ONE platform (single renderer + persistence + core engines).
 */
export default function RemyRelationship() {
  const reduce = useReducedMotion();
  const [moment, setMoment] = useState<RelationshipObservation | null>(null);
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
    if (ran.current) return;
    ran.current = true;

    let cancelled = false;
    let showTimer: ReturnType<typeof setTimeout> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      try {
        const res = await fetch("/api/remy/relationship-snapshot", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          memoryCount?: number;
          firstMemoryDate?: string | null;
          peopleTotal?: number;
          people?: FamilyPerson[];
          datedMemories?: DatedMemory[];
        };

        const now = new Date();
        const today = dayKey(now);
        const relationship = readRelationshipMemory();
        const companion = readCompanionMemory();

        const memoryCount = data.memoryCount ?? 0;
        const nestStage = resolveNestStage(memoryCount);
        const people = Array.isArray(data.people) ? data.people : [];
        const datedMemories = Array.isArray(data.datedMemories) ? data.datedMemories : [];

        // Enrich the snapshot with the focused sub-engines.
        const favourites = rankFavouritePeople(people);
        const chapters = buildChapters(datedMemories);
        const anniversaries = findAnniversaries(datedMemories, now.toISOString());

        const snapshot: RelationshipSnapshot = {
          memoryCount,
          firstMemoryDate: data.firstMemoryDate ?? null,
          nestStage,
          acknowledgedStage: (companion.acknowledgedStage as NestStage | null) ?? null,
          daysSinceLastVisit:
            companion.lastVisitDate != null ? daysBetween(companion.lastVisitDate, today) : null,
          today,
          peopleTotal: data.peopleTotal ?? people.length,
          acknowledgedPeopleTotal: relationship.acknowledgedPeopleTotal,
          topFavourite: favourites[0] ?? null,
          acknowledgedFavourites: relationship.acknowledgedFavourites,
          todaysAnniversaries: anniversaries,
          topChapterTitle: chapters.length > 0 ? chapters[chapters.length - 1].title : null,
        };

        const selected = selectMoment(deriveRelationshipObservations(snapshot), {
          cooldowns: relationship.cooldowns,
          now: now.getTime(),
        });

        // Always record the current people total so a genuinely NEW person reads as new next time.
        writeRelationshipMemory({
          ...relationship,
          acknowledgedPeopleTotal: snapshot.peopleTotal,
          favouritePeople: favourites.slice(0, 8).map((f) => f.id),
        });

        if (!selected || cancelled) return;

        // A longer beat than RemyMoments (1.6s) so the daily nudge takes precedence; the gate then
        // guarantees only one chip is ever on screen.
        showTimer = setTimeout(() => {
          if (cancelled) return;
          if (!tryBeginMoment()) return;
          began.current = true;
          setMoment(selected);

          const fresh = readRelationshipMemory();
          const ackFavourites = selected.kind.startsWith("favourite:")
            ? Array.from(new Set([...fresh.acknowledgedFavourites, selected.kind.slice("favourite:".length)]))
            : fresh.acknowledgedFavourites;
          writeRelationshipMemory({
            ...fresh,
            cooldowns: { ...fresh.cooldowns, [selected.kind]: Date.now() },
            acknowledgedFavourites: ackFavourites,
          });

          hideTimer = setTimeout(
            () => {
              if (!cancelled) close();
            },
            reduceRef.current ? 4000 : 7000,
          );
        }, 3400);
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
