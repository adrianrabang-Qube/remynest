# Feature: Memory Clusters

## Current implementation
AI grouping of related memories into clusters (used by insights/organisation).

## Architecture
- `lib/build-clusters.ts` builds clusters _(trigger/route: verify — likely run on
  demand or as part of enrichment)_.
- Consumes embeddings / AI fields from `memories`.

## Database dependencies
`memory_clusters(user_id, …)` _(full columns: verify)_. Owned by `user_id`.

## API routes
No dedicated cluster route confirmed in the API list — building may be invoked
internally or via `/api/build-relationships` / enrichment _(verify)_.

## UI components
Surfaced within insights/timeline _(verify exact components)_.

## Limitations
- Build trigger + schema under-documented (low confidence) — confirm before
  relying on it.
- Deleted by `user_id` (step 1 of account deletion).

## Future enhancements
Explicit cluster management UI; scheduled re-clustering; cluster-level summaries.
