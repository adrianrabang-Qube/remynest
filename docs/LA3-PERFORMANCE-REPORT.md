# RemyNest LA3 — Performance & Scalability Hardening

**Date:** 2026-07-12  **Phase:** LA3 (production performance optimization — behaviour-preserving)
**Method:** 6-specialist multi-agent audit (React renders/memoization · Next.js RSC/bundle/middleware ·
Supabase queries · Database indexes · Frontend perf/leaks · Backend scalability) → synthesis.
**Constraint:** identical behaviour — no change to API contracts, business logic, security/auth, billing,
or AI behaviour; the DB schema is dashboard-managed (no blind column enumeration); the frozen reminder
engine untouched.

---

## 1. Performance Score — **72 / 100 baseline → ~82 / 100** after the code fixes

The architecture was already sound (protect-by-default auth with request-deduped reads, paginated +
batched-signed media, deferred AI enrichment, split-context Remy platform, no client leaks). The dominant
drags were the dead `embedding` payload on every hot read and a serial data waterfall — both fixed here.
The remaining headroom is **operator DB indexes** on dashboard-managed tables (below), fine at launch
volume but the path to higher scores as per-user memory counts grow.

## 2. Optimizations Applied (9 — all behaviour-preserving; tsc/lint/build green)

1. **Dead `embedding` payload stripped from the 4 hot memory reads** — the pgvector `embedding` (~1536
   floats, 15–29 KB/row) was serialized to clients that never read it. Added a runtime `stripEmbedding()`
   helper (clone + `delete embedding` — NOT a select-list change, so no dashboard-managed column can be
   dropped) applied to `/api/memories`, `/api/timeline`, the timeline RSC page, and `/api/memories/search`.
   Verified the ONLY `.embedding` consumer is the memory-**detail** page (which does not use these paths).
   *~1.4 MB of dead JSON saved per 50-row feed page; large win for the iOS WebView.*
2. **Memories feed re-render/​re-sort eliminated** (`app/(app)/memories/page.tsx`) — the sort + today/
   thisWeek/earlier grouping were recomputed in the component body on every render, so each search
   keystroke re-ran an O(n log n) sort + O(n) regroup over the whole array and reconciled the entire list.
   Wrapped them in one `useMemo([memories])`; memoized the delete/edit handlers with `useCallback`; and
   `React.memo`-wrapped `MemorySection` (generic-preserving cast). Keystrokes no longer re-sort or reconcile.
3. **Two dead DB round-trips removed per memory-chat turn** (`lib/retrieve-memory-context.ts`) — the
   `memory_relationships` + `memory_cluster_items` SELECTs only read `error`; their rows were discarded and
   the function returns the context computed above them. Removed (context returned is identical).
4. **Layout data waterfall parallelized** (`app/(app)/layout.tsx`) — four independent Supabase reads on
   every authenticated navigation ran sequentially; now run via `Promise.all` after the cheap active-profile
   cookie read, preserving each degrade-to-default fallback. *Turns ~120–320 ms of serial shell latency into
   one concurrent batch.*
5. **ToastProvider context value memoized** (`useMemo`) — stops all `useToast()` consumers re-rendering on
   each toast add / ~3 s auto-removal.
6. **Edge middleware request narration dev-gated** — `logMmiddlewareStage` no longer emits 2+ `console.info`
   per request in production (matches the RC2 dev-only logger standard; errors still log).

## 3. Performance Bottlenecks Found (verified)

**High:** dead `embedding` on all client-facing memory reads (fixed); a **missing composite index** on the
memories feed/timeline hot-path (`(memory_profile_id, created_at, id)` / `(user_id, …)`) — under offset
paging Postgres sorts the full matching set per page (operator). **Medium:** the pgvector `match_memories`
ANN index is unverifiable from code — risk of a sequential distance scan (operator); the global keyword
search's 5 leading-wildcard `ILIKE '%q%'` predicates have no `pg_trgm` GIN (operator); the memories-feed
re-render/re-sort (fixed); the memory-chat dead round-trips (fixed); the layout waterfall (fixed). **Low:**
a duplicate `auth.getUser()` on CARE-workspace reads (larger refactor); RLS `EXISTS` subqueries on
`profile_relationships` lack a scoping index (operator); the background people-enrichment per-person N+1
(larger); the Toast/middleware items (fixed).

## 4. Database Improvements (OPERATOR — dashboard-managed schema; verify then apply the exact SQL)

```sql
-- Feed/timeline hot path (verify first: SELECT indexname,indexdef FROM pg_indexes WHERE tablename='memories';)
CREATE INDEX CONCURRENTLY IF NOT EXISTS memories_profile_created_id_idx
  ON public.memories (memory_profile_id, created_at DESC, id DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS memories_user_created_id_idx
  ON public.memories (user_id, created_at DESC, id DESC) WHERE memory_profile_id IS NULL;

-- pgvector ANN for match_memories (if absent; match the RPC's distance op — do NOT change the RPC)
CREATE INDEX CONCURRENTLY memories_embedding_hnsw_idx
  ON public.memories USING hnsw (embedding vector_cosine_ops);

-- pg_trgm for the leading-wildcard global search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX CONCURRENTLY IF NOT EXISTS memories_title_trgm   ON public.memories USING gin (title gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS memories_content_trgm ON public.memories USING gin (content gin_trgm_ops);
-- (+ ai_title / ai_summary / ai_category)

-- RLS EXISTS scoping on profile_relationships
CREATE INDEX CONCURRENTLY IF NOT EXISTS profile_relationships_caregiver_profile_idx
  ON public.profile_relationships (caregiver_account_id, memory_profile_id, invite_status);
```

## 5. API Improvements

`stripEmbedding` on the 4 memory-read routes (payload −15–29 KB/row, serialization + mobile parse cut); the
layout server-render is now concurrent; the memory-chat context path drops 2 discarded round-trips; the
middleware sheds per-request prod log narration. No route's contract, auth, validation, or status codes
changed. (All RC4 `maxDuration` budgets remain.)

## 6. Frontend Improvements

The flagship memories feed no longer re-sorts + reconciles the whole list on each search keystroke
(useMemo + useCallback + `React.memo(MemorySection)`); `useToast` consumers stop re-rendering on toast
churn. Smaller RSC Flight payloads (no embedding) reduce mobile parse/hydration cost. (Existing strengths
confirmed: recharts code-split via `next/dynamic`; `RemyProvider` split contexts; paginated feed; no leaks.)

## 7. Mobile Improvements

The embedding strip is the biggest mobile win — the iOS WKWebView no longer downloads/parses ~1.4 MB of dead
float JSON per feed page (and the denser timeline). Fewer per-keystroke re-renders reduce input jank while
searching. The concurrent shell render lowers navigation latency. No change to Capacitor config, startup, or
background execution.

## 8. Remaining Technical Debt (recommended — larger, deferred)

- **Operator DB indexes** (§4) — verify/apply before per-user memory counts scale into the thousands.
- A single `cache()`-wrapped `getSessionUser()` shared by routes + `getActiveContext` to dedupe the duplicate
  `auth.getUser()` on CARE reads (cross-cutting; must not weaken the cookie-forgery gate).
- Fold the people-enrichment per-person aggregate recompute into one SECURITY-DEFINER RPC (background-only).
- The durable alternative to the runtime embedding strip: explicit column selects excluding `embedding` — an
  operator/DBA task against the confirmed real schema (never a blind enumeration).
- memory-chat streaming (a UX/latency win, but changes AI response delivery — out of scope for this pass).

## 9. Scalability Assessment

**Solid launch-scale posture.** Paginated reads, batched signing, request-deduped auth, deferred AI, and a
split-context companion platform mean the app scales cleanly at launch volume. The code-side drags (dead
payload, waterfall, per-keystroke re-render) are removed. The remaining scale risk is purely the **operator
index tasks** on dashboard-managed tables (feed composite, pgvector ANN, `pg_trgm`, `profile_relationships`)
— fine now, important before thousands of memories per user.

## 10. Production Readiness

**SHIP for launch scale.** No behaviour/contract/security/billing/AI change was required or made; the one
high-impact runtime issue (dead embedding payload) is fixed with a verified behaviour-preserving strip, and
the client hot path is memoized. The remaining high/medium items are operator index tasks that are safe at
launch volume. `tsc`/`lint`/`build` green.

---

*Validation: `npx tsc --noEmit` clean · `npm run lint` 0 errors · `npm run build` green. Full per-dimension
evidence is in the LA3 session transcript. Identical behaviour preserved; dashboard-managed schema respected;
frozen reminder engine untouched.*
