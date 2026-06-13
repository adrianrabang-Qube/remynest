"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, Search, X } from "lucide-react";

import AskRemy from "./AskRemy";
import SearchResultRow from "./SearchResultRow";
import {
  EMPTY_RESULTS,
  totalHits,
  type SearchHit,
  type SearchResults,
} from "./types";

const RECENT_KEY = "remynest:recent-searches";
const RECENT_MAX = 6;
const MIN_QUERY = 2;
const DEBOUNCE_MS = 250;

type FilterKey = "all" | "memories" | "library" | "people";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "memories", label: "Memories" },
  { key: "library", label: "Library" },
  { key: "people", label: "People" },
];

const SUGGESTIONS = ["A name", "A place", "A year or decade", "A collection"];

interface Group {
  key: FilterKey;
  title: string;
  hits: SearchHit[];
}

function buildGroups(r: SearchResults): Group[] {
  return [
    { key: "memories", title: "Memories", hits: r.memories },
    {
      key: "library",
      title: "Library",
      hits: [...r.collections, ...r.connections, ...r.chapters],
    },
    { key: "people", title: "People", hits: r.people },
  ];
}

/**
 * SearchView — the single global retrieval surface (Search V2). Debounced
 * keyword search against /api/search/global (one request, server fan-out),
 * grouped collapsible results, sticky filter chips, recent searches and
 * suggestions. Mobile-first; the same layout scales up on desktop.
 */
export default function SearchView() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [recent, setRecent] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const abortRef = useRef<AbortController | null>(null);

  // Load recent searches once (client-only). Deferred so the initial render
  // matches SSR (no hydration mismatch) and state isn't set synchronously in
  // the effect body.
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(RECENT_KEY);
        if (raw) setRecent(JSON.parse(raw) as string[]);
      } catch {
        /* ignore malformed storage */
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const commitRecent = useCallback((term: string) => {
    const t = term.trim();
    if (t.length < MIN_QUERY) return;
    setRecent((prev) => {
      const next = [t, ...prev.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(
        0,
        RECENT_MAX,
      );
      try {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const clearRecent = useCallback(() => {
    setRecent([]);
    try {
      window.localStorage.removeItem(RECENT_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // Debounced live search. All state updates happen inside the deferred
  // callback (never synchronously in the effect body).
  useEffect(() => {
    const term = query.trim();
    const handle = window.setTimeout(async () => {
      abortRef.current?.abort();
      if (term.length < MIN_QUERY) {
        setResults(EMPTY_RESULTS);
        setLoading(false);
        return;
      }
      setLoading(true);
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch("/api/search/global", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: term }),
          signal: controller.signal,
        });
        if (!res.ok) {
          setResults(EMPTY_RESULTS);
          return;
        }
        const data = (await res.json()) as SearchResults;
        setResults(data);
      } catch {
        // Aborted or network error — keep the surface stable.
      } finally {
        if (abortRef.current === controller) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [query]);

  const groups = useMemo(() => buildGroups(results), [results]);
  const visibleGroups = groups.filter(
    (g) => (filter === "all" || filter === g.key) && g.hits.length > 0,
  );
  const total = totalHits(results);
  const hasQuery = query.trim().length >= MIN_QUERY;

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Search input + sticky filter chips */}
      <div className="sticky top-14 z-20 -mx-4 bg-sand/90 px-4 pb-3 pt-2 backdrop-blur-md md:top-0 md:mx-0 md:rounded-b-2xl md:px-2">
        <form
          role="search"
          aria-label="Search RemyNest"
          onSubmit={(e) => {
            e.preventDefault();
            commitRecent(query);
          }}
        >
          <label htmlFor="global-search" className="sr-only">
            Search memories, collections, people and more
          </label>
          <div className="flex items-center gap-2 rounded-2xl border border-sand-deep/70 bg-white px-3 shadow-soft focus-within:border-sage">
            <Search className="h-5 w-5 shrink-0 text-charcoal-muted" aria-hidden />
            <input
              id="global-search"
              type="search"
              inputMode="search"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search RemyNest"
              className="h-12 w-full bg-transparent text-base text-charcoal outline-none placeholder:text-charcoal-muted"
            />
            {loading ? (
              <Loader2
                className="h-4 w-4 shrink-0 animate-spin text-charcoal-muted"
                aria-label="Searching"
              />
            ) : (
              query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-charcoal-muted hover:bg-sand/60"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              )
            )}
          </div>
        </form>

        {hasQuery && (
          <div
            role="tablist"
            aria-label="Filter results"
            className="mt-2 flex gap-2 overflow-x-auto pb-0.5"
          >
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(f.key)}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                    active
                      ? "border-sage bg-sage text-white"
                      : "border-sand-deep/70 bg-white text-charcoal-soft hover:bg-sand/40"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Empty / discovery state */}
      {!hasQuery && (
        <div className="mt-4 space-y-6">
          {recent.length > 0 && (
            <section aria-label="Recent searches">
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal-muted">
                  Recent searches
                </h2>
                <button
                  type="button"
                  onClick={clearRecent}
                  className="text-xs font-medium text-charcoal-muted hover:text-charcoal"
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setQuery(r)}
                    className="rounded-full border border-sand-deep/70 bg-white px-3.5 py-1.5 text-sm text-charcoal-soft hover:bg-sand/40"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section aria-label="Search suggestions">
            <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-charcoal-muted">
              Try searching for
            </h2>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setQuery(s.replace(/^A\s+/, ""))}
                  className="rounded-full border border-dashed border-sand-deep/70 bg-white px-3.5 py-1.5 text-sm text-charcoal-soft hover:bg-sand/40"
                >
                  {s}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Results */}
      {hasQuery && (
        <div className="mt-3" aria-live="polite">
          <AskRemy
            query={query.trim()}
            loading={loading}
            memories={results.memories.length}
            library={
              results.collections.length +
              results.connections.length +
              results.chapters.length
            }
            people={results.people.length}
            total={total}
          />

          {visibleGroups.map((group) => {
            const isCollapsed = collapsed[group.key];
            return (
              <section key={group.key} className="mb-4" aria-label={group.title}>
                <button
                  type="button"
                  aria-expanded={!isCollapsed}
                  onClick={() =>
                    setCollapsed((p) => ({ ...p, [group.key]: !p[group.key] }))
                  }
                  className="flex w-full items-center justify-between px-1 py-2"
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-charcoal-muted">
                    {group.title}{" "}
                    <span className="text-charcoal-muted/70">
                      ({group.hits.length})
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-charcoal-muted transition-transform ${
                      isCollapsed ? "-rotate-90" : ""
                    }`}
                    aria-hidden
                  />
                </button>
                {!isCollapsed && (
                  <ul className="overflow-hidden rounded-2xl border border-sand-deep/60 bg-white shadow-soft">
                    {group.hits.map((hit) => (
                      <SearchResultRow key={`${hit.type}-${hit.id}`} hit={hit} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
