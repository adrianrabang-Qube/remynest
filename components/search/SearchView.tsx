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
import { Remy, RemyStage } from "@/lib/remy";
import ReportDialog from "@/components/moderation/ReportDialog";
import { reportContent } from "@/app/(app)/settings/safety/actions";
import type { ReportReason } from "@/lib/moderation/config";

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
  // LA5.1: report a shared memory (Apple 1.2) — set from a result row's Report button.
  const [reportTarget, setReportTarget] = useState<{
    memoryId: string;
    title: string;
  } | null>(null);

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
      Remy.emit("search.started");
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
        Remy.emit("search.finished");
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
      <div className="sticky top-[calc(3.5rem_+_env(safe-area-inset-top))] z-20 -mx-4 bg-sand/90 px-4 pb-3 pt-2 backdrop-blur-md md:top-0 md:mx-0 md:rounded-b-2xl md:px-2">
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
          <div className="flex items-center gap-2 rounded-full border border-sand-deep/70 bg-white px-4 shadow-soft transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary">
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
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-charcoal-muted transition hover:bg-sand/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
            className="mt-2 flex gap-2 overflow-x-auto px-0.5 py-0.5"
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
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    active
                      ? "border-primary bg-primary text-white"
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
        <div className="mt-6 space-y-6">
          {/* Calm discovery hero — Remy + a plain-language invitation */}
          <div className="flex flex-col items-center rounded-3xl border border-sand-deep/70 bg-white px-6 py-8 text-center shadow-soft">
            <RemyStage context="welcome" size={112} className="mb-3" />
            <h2 className="font-serif text-xl font-semibold text-charcoal">
              What are you looking for?
            </h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-charcoal-soft">
              Search across your memories, people, and collections — try a name, a
              place, a year, or a feeling.
            </p>
          </div>

          {recent.length > 0 && (
            <section aria-label="Recent searches">
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal-muted">
                  Recent searches
                </h2>
                <button
                  type="button"
                  onClick={clearRecent}
                  className="rounded-full px-2 py-1 text-xs font-medium text-charcoal-muted transition hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                    className="rounded-full border border-sand-deep/70 bg-white px-4 py-2 text-sm text-charcoal-soft transition hover:bg-sand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                  className="rounded-full border border-dashed border-sand-deep/70 bg-white px-4 py-2 text-sm text-charcoal-soft transition hover:bg-sand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                  className="flex w-full items-center justify-between rounded-xl px-2 py-2 transition hover:bg-sand/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-charcoal-muted">
                    {group.title}{" "}
                    <span className="text-charcoal-muted/70">
                      ({group.hits.length})
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-charcoal-muted transition-transform motion-reduce:transition-none ${
                      isCollapsed ? "-rotate-90" : ""
                    }`}
                    aria-hidden
                  />
                </button>
                {!isCollapsed && (
                  <ul className="overflow-hidden rounded-2xl border border-sand-deep/60 bg-white shadow-soft">
                    {group.hits.map((hit) => (
                      <SearchResultRow
                        key={`${hit.type}-${hit.id}`}
                        hit={hit}
                        onReport={(memoryId, title) =>
                          setReportTarget({ memoryId, title })
                        }
                      />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {reportTarget && (
        <ReportDialog
          title="Report this memory"
          subject="this memory"
          onClose={() => setReportTarget(null)}
          onSubmit={(reason: ReportReason, description: string) =>
            reportContent({
              memoryId: reportTarget.memoryId,
              reason,
              description,
            })
          }
        />
      )}
    </div>
  );
}
