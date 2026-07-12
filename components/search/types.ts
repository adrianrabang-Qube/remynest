/**
 * Shared Search V2 types. A SearchHit is a render-ready result row produced by
 * the global keyword search endpoint — the client never re-queries per result.
 */
export type SearchHitType =
  | "memory"
  | "collection"
  | "connection"
  | "chapter"
  | "person";

export interface SearchHit {
  id: string;
  type: SearchHitType;
  title: string;
  preview?: string;
  meta?: string;
  href: string;
  /**
   * LA5.1 (Apple 1.2): present ONLY for a memory shared into a care workspace that
   * the viewer can see but did NOT author — the id to report as objectionable
   * content. Absent for the viewer's own memories and all non-memory hits.
   */
  reportableMemoryId?: string;
}

export interface SearchResults {
  memories: SearchHit[];
  collections: SearchHit[];
  connections: SearchHit[];
  chapters: SearchHit[];
  people: SearchHit[];
}

export const EMPTY_RESULTS: SearchResults = {
  memories: [],
  collections: [],
  connections: [],
  chapters: [],
  people: [],
};

export function totalHits(r: SearchResults): number {
  return (
    r.memories.length +
    r.collections.length +
    r.connections.length +
    r.chapters.length +
    r.people.length
  );
}
