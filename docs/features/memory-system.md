# Feature: Memory System

## Current implementation
Create, view, edit, delete memories (notes + media) within a memory profile, with
AI enrichment and embeddings on create.

## Architecture
- Create flow enriches via `lib/ai-memory.ts` (summary/tags/title/category/mood)
  and writes `embedding` via `lib/embeddings.ts`.
- Media via the upload pipeline (see media-system).
- Listing/timeline via `/api/memories`, `/api/timeline`.

## Database dependencies
`memories` (see database-overview for full columns). Belongs to `memory_profiles`
via `memory_profile_id`; authored by `user_id`. **No declared FK** on these
columns (integrity enforced in app, not DB).

## API routes
`/api/memories` (GET), `/api/memories/create` (POST),
`/api/memories/[id]` (PUT/DELETE), `/api/timeline` (GET).

## UI components
`app/(app)/memories/page.tsx`, `memories/new/page.tsx`, `memories/[id]/page.tsx`,
`app/(app)/timeline/*`, `components/MemoryCard.tsx`,
`app/(app)/timeline/components/TimelineCard.tsx`.

## Limitations
- No DB-level referential integrity on `memories` FKs (cleanup is app-ordered).
- AI enrichment depends on OpenAI availability; failures handling _(verify)_.

## Future enhancements
Versioning/history; richer media; collaborative editing; offline capture (mobile).
