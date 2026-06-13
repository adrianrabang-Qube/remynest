import type { RemyTone } from "../types";
import type { LensId } from "../lens-id";

/**
 * Lens foundation types. A Lens is a deterministic *perspective* that reasons
 * over normalized subject signals (LensContext) and emits UnderstandingFacets.
 * The understanding engine (../understanding.ts) is the orchestrator that runs
 * the lens registry, merges, ranks and summarizes. No AI — pure rules.
 *
 * This file is the single source of truth for the lens/facet contract so both
 * the lenses and the orchestrator import from here (no cycles). LensId lives in
 * ../lens-id so the base Remy types can share it without a cycle.
 */

export type { LensId };

/** What role Remy is playing in a facet — the "what is Remy doing here?" answer. */
export type RemyRole =
  | "companion"
  | "guide"
  | "curator"
  | "storyteller"
  | "organizer"
  | "memory-keeper"
  | "connector";

/** Facet categories. Additive — new lenses extend this union. */
export type UnderstandingFacetKind =
  | "life-areas"
  | "strongest-period"
  | "chapter-span"
  | "story-ready"
  | "narrative-growth"
  | "coverage"
  | "recency"
  | "missing-knowledge"
  | "relationship";

export type CoverageLevel = "new" | "sparse" | "moderate" | "rich";

/** A deep-link bridge from a facet into its supporting evidence surface. */
export interface UnderstandingLens {
  label: string;
  href: string;
}

export interface DecadeBucket {
  decade: number;
  count: number;
}

/** One thing Remy understands — a single renderer-agnostic unit. */
export interface UnderstandingFacet {
  /** Which lens produced this facet (ownership; required). */
  lensId: LensId;
  kind: UnderstandingFacetKind;
  /** Higher leads first. */
  priority: number;
  tone: RemyTone;
  role: RemyRole;
  /** Short human phrase, documentation-grounded (never a personality claim). */
  label: string;
  /** Optional secondary evidence. */
  detail?: string;
  /** Optional deep-link bridge into the supporting evidence surface. */
  lens?: UnderstandingLens;
}

/**
 * Normalized, read-only evidence one lens reasons over (subject-scoped signals).
 * This is the seam that will later be fed by a subject-scoped extension of
 * RemySignals — for now the orchestrator builds it from existing loaders.
 */
export interface LensContext {
  subject: { id: string; name: string };
  memoryCount: number;
  datedCount: number;
  /** Life chapters (decades with enough dated memories) — drives narrative readiness. */
  chapterCount: number;
  /** Top themes (most documented first). */
  themes: { label: string; memoryCount: number }[];
  coveragePercentage: number;
  /** Per-decade dated-memory counts. */
  decades: DecadeBucket[];
  birthYear: number | null;
  relationshipLabel: string | null;
  /** Themes the wider family shares (≥2 profiles); optional. */
  sharedFamilyThemes?: { label: string }[];
  lastActivityAt: string | null;
  now: Date;
}

/** A deterministic perspective over a subject's signals. */
export interface Lens {
  id: LensId;
  deriveFacets(ctx: LensContext): UnderstandingFacet[];
}
