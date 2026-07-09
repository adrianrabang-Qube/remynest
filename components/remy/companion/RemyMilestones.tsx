"use client";

import { useEffect, useRef } from "react";

import { emitRemyEvent } from "@/lib/remy/core/dispatch";
import { crossedMilestones } from "@/lib/remy/core/achievements";
import {
  readLastMemoryCount,
  writeLastMemoryCount,
} from "@/lib/remy/companion/persistence";

/**
 * Remy Platform (v2) — MILESTONE DETECTOR (mounted once by the app shell).
 *
 * Receives the REAL workspace memory count (from the server layout) and, when it crosses a
 * milestone since the last persisted count, publishes `milestone.reached` — which the celebration
 * surface turns into a feather-burst celebration. First-ever load only BASELINES the count (no
 * retroactive celebration for an existing library); afterwards each crossing fires once. Renders
 * nothing. Real data only — no placeholder.
 */
export default function RemyMilestones({ memoryCount }: { memoryCount: number }) {
  const lastProcessed = useRef<number | null>(null);

  useEffect(() => {
    if (lastProcessed.current === memoryCount) return;
    lastProcessed.current = memoryCount;

    const stored = readLastMemoryCount();
    if (stored == null) {
      // First-ever load: baseline silently; never celebrate an already-built library.
      writeLastMemoryCount(memoryCount);
      return;
    }
    if (memoryCount > stored) {
      for (const milestone of crossedMilestones(stored, memoryCount)) {
        emitRemyEvent("milestone.reached", { id: milestone.id, label: milestone.label });
      }
    }
    if (memoryCount !== stored) writeLastMemoryCount(memoryCount);
  }, [memoryCount]);

  return null;
}
