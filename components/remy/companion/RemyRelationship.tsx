"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

import {
  deriveRelationshipObservations,
  type RelationshipSnapshot,
} from "@/lib/remy/core/relationship-engine";
import { selectMoment } from "@/lib/remy/core/priority-engine";
import { buildMemoryUnderstanding } from "@/lib/remy/core/memory-understanding-engine";
import { buildMemoryGraph } from "@/lib/remy/core/memory-graph-engine";
import { buildJourneys } from "@/lib/remy/core/journey-engine";
import { buildLifeStory } from "@/lib/remy/core/life-story-engine";
import { buildReasoning } from "@/lib/remy/core/reasoning-engine";
import { buildBiography } from "@/lib/remy/core/biography-engine";
import { rankFavouritePeople } from "@/lib/remy/core/favourite-engine";
import { buildChapters } from "@/lib/remy/core/story-engine";
import { findAnniversaries } from "@/lib/remy/core/anniversary-engine";
import { rankSignificantMemories } from "@/lib/remy/core/significance-engine";
import { buildEmotionalProfile } from "@/lib/remy/core/emotional-engine";
import { derivePersonalityTraits } from "@/lib/remy/core/personality-engine";
import { buildLifeSummary } from "@/lib/remy/core/legacy-engine";
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
          isMyNest?: boolean;
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
        const peopleTotal = data.peopleTotal ?? people.length;
        const daysSinceLastVisit =
          companion.lastVisitDate != null ? daysBetween(companion.lastVisitDate, today) : null;

        // Pipeline: memory understanding → story → favourite → anniversary → significance →
        // emotional → personality. The understanding layer is INTERNAL (not shown) — it turns each
        // real memory into structured semantics that feed the downstream richness ratios today and
        // are available for future engines.
        const understandings = buildMemoryUnderstanding(datedMemories, {
          personImportance: new Map(people.map((p) => [p.id, p.memoryCount] as const)),
        });

        // Memory Graph — deterministic semantic links between memories (internal). Its per-memory
        // connection count feeds the significance engine (more connected = more significant).
        const memoryGraph = buildMemoryGraph(understandings);
        const connectionCountByMemoryId = new Map<string, number>();
        for (const edge of memoryGraph.edges) {
          connectionCountByMemoryId.set(
            edge.source,
            (connectionCountByMemoryId.get(edge.source) ?? 0) + 1,
          );
          connectionCountByMemoryId.set(
            edge.target,
            (connectionCountByMemoryId.get(edge.target) ?? 0) + 1,
          );
        }

        // Journey Engine — complete life journeys from the understanding + graph layers (internal,
        // never shown). A memory that belongs to a meaningful journey feeds the significance engine.
        const journeyAnalysis = buildJourneys({ understandings, graph: memoryGraph });
        const journeyImportanceByMemoryId = new Map<string, number>();
        for (const journey of journeyAnalysis.journeys) {
          for (const id of journey.memoryIds) {
            journeyImportanceByMemoryId.set(
              id,
              Math.max(journeyImportanceByMemoryId.get(id) ?? 0, journey.significance),
            );
          }
        }

        // Life Story Engine — the canonical chronological life story assembled from the journeys
        // (internal, never shown). A memory in a central story chapter feeds the significance engine.
        const lifeStory = buildLifeStory({
          journeyAnalysis,
          graph: memoryGraph,
          understandings,
        });
        const lifeStoryCentralityByMemoryId = new Map<string, number>();
        for (const chapter of lifeStory.chapters) {
          for (const id of chapter.memoryIds) {
            lifeStoryCentralityByMemoryId.set(
              id,
              Math.max(lifeStoryCentralityByMemoryId.get(id) ?? 0, chapter.centrality),
            );
          }
        }

        // Reasoning Engine — Remy's structural understanding of the life (anchors / themes /
        // influences / relationship strengths / factual gaps), reasoned from the journey + life-story
        // + graph + understanding layers (internal, never shown). A memory anchoring a strong life
        // pillar feeds the significance engine.
        const reasoningAnalysis = buildReasoning({
          journeyAnalysis,
          lifeStory,
          graph: memoryGraph,
          understandings,
        });
        const reasoningStrengthByMemoryId = new Map<string, number>();
        for (const anchor of reasoningAnalysis.anchors) {
          for (const id of anchor.memoryIds) {
            reasoningStrengthByMemoryId.set(
              id,
              Math.max(reasoningStrengthByMemoryId.get(id) ?? 0, anchor.strength),
            );
          }
        }

        // Biography Engine — a structured representation of the life assembled from the journey +
        // life-story + reasoning + graph + understanding layers (internal, never shown). A memory in a
        // well-covered biography section feeds the significance engine.
        const biographyAnalysis = buildBiography({
          journeyAnalysis,
          lifeStory,
          reasoning: reasoningAnalysis,
          graph: memoryGraph,
          understandings,
        });
        const biographyCoverageByMemoryId = new Map<string, number>();
        for (const section of biographyAnalysis.sections) {
          for (const id of section.memoryIds) {
            biographyCoverageByMemoryId.set(
              id,
              Math.max(biographyCoverageByMemoryId.get(id) ?? 0, section.coverage),
            );
          }
        }

        const favourites = rankFavouritePeople(people);
        const chapters = buildChapters(datedMemories);
        const anniversaries = findAnniversaries(datedMemories, now.toISOString());

        const chapterSizeByMemoryId = new Map<string, number>();
        for (const c of chapters) {
          for (const id of c.memoryIds) chapterSizeByMemoryId.set(id, c.count);
        }
        const revisitedMemoryIds = new Set(relationship.visitedMemories);
        const significant = rankSignificantMemories(datedMemories, {
          favouritePersonIds: new Set(favourites.map((f) => f.id)),
          anniversaryMemoryIds: new Set(anniversaries.map((a) => a.memoryId)),
          revisitedMemoryIds,
          chapterSizeByMemoryId,
          connectionCountByMemoryId,
          journeyImportanceByMemoryId,
          lifeStoryCentralityByMemoryId,
          reasoningStrengthByMemoryId,
          biographyCoverageByMemoryId,
        });
        const revisited = significant.filter((m) => revisitedMemoryIds.has(m.id));

        // Richness ratios derived from the understanding layer (single source of truth), feeding the
        // emotional + personality engines.
        const understandingCount = understandings.length;
        const attachmentRatio =
          understandingCount > 0
            ? understandings.filter((u) => u.attachmentRichness > 0).length / understandingCount
            : 0;
        const datedRatio =
          understandingCount > 0
            ? understandings.filter((u) => u.historical).length / understandingCount
            : 0;

        const summary = buildLifeSummary({ memories: datedMemories, people, memoryCount });
        const emotionalProfile = buildEmotionalProfile({
          memoryCount,
          peopleTotal,
          daysSinceLastVisit,
          summary,
          favourites,
          chapters,
          significant,
          revisited,
          memories: datedMemories,
          attachmentRatio,
        });
        const personalityTraits = derivePersonalityTraits({
          memoryCount,
          chapterCount: chapters.length,
          peopleCount: peopleTotal,
          attachmentRatio,
          datedRatio,
          daysSinceLastVisit,
          isCareWorkspace: !data.isMyNest,
          memoryPreservation: emotionalProfile.memoryPreservation,
          lifeContinuity: emotionalProfile.lifeContinuity,
        });

        const snapshot: RelationshipSnapshot = {
          memoryCount,
          firstMemoryDate: data.firstMemoryDate ?? null,
          nestStage,
          acknowledgedStage: (companion.acknowledgedStage as NestStage | null) ?? null,
          daysSinceLastVisit,
          today,
          peopleTotal,
          acknowledgedPeopleTotal: relationship.acknowledgedPeopleTotal,
          topFavourite: favourites[0] ?? null,
          acknowledgedFavourites: relationship.acknowledgedFavourites,
          todaysAnniversaries: anniversaries,
          topChapterTitle: chapters.length > 0 ? chapters[chapters.length - 1].title : null,
          emotionalProfile,
          personalityTraits,
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
