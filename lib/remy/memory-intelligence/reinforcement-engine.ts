/**
 * Memory Intelligence V2 — REINFORCEMENT ENGINE (pure, deterministic).
 *
 * Every successful retrieval MAY reinforce a memory: repeated retrieval increases confidence; a memory later
 * flagged incorrect can be down-ranked (designed for FUTURE user feedback — no UI this phase). These are pure
 * state transitions + a pure confidence read; the data layer persists the resulting state and the caller
 * supplies the timestamp (`nowIso`) so this stays clock-free.
 */
import { REINFORCEMENT_CONFIG } from "./config";
import { clamp01, saturate } from "./math";
import type { MemoryIntelligenceState } from "./types";

/** A fresh default state for a memory that has no persisted intelligence yet. */
export function defaultState(memoryId: string): MemoryIntelligenceState {
  return {
    memoryId,
    retrievalCount: 0,
    lastRecalledAt: null,
    reinforcementEvents: 0,
    downRankEvents: 0,
    conversationCount: 0,
    pinned: false,
    favourite: false,
    classification: null,
    clusterType: null,
  };
}

/** 0..1 confidence from reinforcement history. Baseline rises with recall, falls with down-ranks. Pure. */
export function computeConfidence(state: MemoryIntelligenceState): number {
  const positive = state.retrievalCount + state.reinforcementEvents;
  const gain = (1 - REINFORCEMENT_CONFIG.baseline) * saturate(positive, REINFORCEMENT_CONFIG.retrievalSaturationK);
  const penalty = REINFORCEMENT_CONFIG.perDownRank * Math.max(0, state.downRankEvents);
  return clamp01(REINFORCEMENT_CONFIG.baseline + gain - penalty);
}

/**
 * Reinforce a memory after a SUCCESSFUL retrieval: +1 retrieval, +1 reinforcement, stamp last-recalled. Pure —
 * returns a new state; the caller persists it. `nowIso` is supplied (clock-free).
 */
export function reinforce(state: MemoryIntelligenceState, nowIso: string): MemoryIntelligenceState {
  return {
    ...state,
    retrievalCount: state.retrievalCount + 1,
    reinforcementEvents: state.reinforcementEvents + 1,
    lastRecalledAt: nowIso,
  };
}

/** Down-rank a memory (future "this was wrong" feedback): +1 down-rank event. Pure. */
export function downRank(state: MemoryIntelligenceState): MemoryIntelligenceState {
  return { ...state, downRankEvents: state.downRankEvents + 1 };
}
