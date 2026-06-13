import type { Lens } from "./types";
import { lifeJourneyLens } from "./life-journey";
import { themesLens } from "./themes";
import { relationshipsLens } from "./relationships";
import { storyLens } from "./story";
import { preservationLens } from "./preservation";

/**
 * The lens registry — the deterministic perspectives the understanding engine
 * runs over a subject. Order here is cosmetic; facets are ranked by priority by
 * the orchestrator. Add a lens by adding a module and listing it here.
 */
export const LENSES: Lens[] = [
  lifeJourneyLens,
  themesLens,
  relationshipsLens,
  storyLens,
  preservationLens,
];

export type {
  Lens,
  LensId,
  LensContext,
  UnderstandingFacet,
  UnderstandingFacetKind,
  UnderstandingLens,
  RemyRole,
  CoverageLevel,
  DecadeBucket,
} from "./types";
