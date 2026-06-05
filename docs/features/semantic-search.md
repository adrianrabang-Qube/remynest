# Feature: Semantic Search

## Current implementation
Vector search over memory embeddings; **premium-gated** (free tier → HTTP 402).

## Architecture
- Embeddings written on memory create (`lib/embeddings.ts` → `memories.embedding`,
  pgvector).
- Query embeds the search text and matches against stored vectors _(matching SQL/
  RPC: verify)_.
- Premium enforcement via `lib/premium.ts` / `lib/billing/*` — free users receive
  402.

## Database dependencies
`memories.embedding` (pgvector). Requires the `vector` extension + an index
_(verify index exists for performance)_.

## API routes
`/api/search` (POST), `/api/memories/search` (POST). Both return **402** for
free-tier users.

## UI components
`app/search/page.tsx`.

## Limitations
- Two near-duplicate search endpoints (`/api/search`, `/api/memories/search`) —
  consolidation candidate.
- Index presence/perf unverified for large datasets.

## Future enhancements
Unify endpoints; hybrid keyword+vector; filters (date/profile/tag); relevance
tuning.
