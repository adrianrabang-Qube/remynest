"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";

import { resolveRemyIntent, type RemyAsk as RemyAskModel } from "@/lib/remy/ask";
import {
  parseRetrievalQuery,
  type AskRetrievalResult,
} from "@/lib/remy/ask-retrieval";
import { askRemyRetrieval } from "@/app/(app)/remy/ask-action";

type AskStatus = "idle" | "loading" | "results" | "unknown";

const MAX_SHOWN = 10;

function yearLabel(memoryDate?: string | null): string {
  if (!memoryDate) return "";
  const year = new Date(memoryDate).getFullYear();
  return Number.isNaN(year) ? "" : ` (${year})`;
}

/**
 * RemyAsk — Remy's interactive entry point. Deterministic only.
 *   1. Retrieval query (parseRetrievalQuery) → retrieve & list factual memory
 *      candidates via the server action (Retrieval Engine V1).
 *   2. Otherwise a navigation intent (resolveRemyIntent) → navigate.
 *   3. Otherwise the fixed "doesn't know" message.
 * No AI, generation, summaries, chat history, streaming or client-side retrieval.
 */
export default function RemyAsk({ ask }: { ask: RemyAskModel }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<AskStatus>("idle");
  const [results, setResults] = useState<AskRetrievalResult[]>([]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = query.trim();
    if (!text) return;

    // 1. Retrieval (checked first so "travel memories" isn't caught by the
    // "memories" navigation keyword).
    const retrievalQuery = parseRetrievalQuery(text);
    if (retrievalQuery) {
      setStatus("loading");
      setResults([]);
      const res = await askRemyRetrieval(retrievalQuery);
      setResults(res.results);
      setStatus("results");
      return;
    }

    // 2. Navigation intent.
    const intent = resolveRemyIntent(text);
    if (intent) {
      router.push(intent.href);
      return;
    }

    // 3. Unknown.
    setResults([]);
    setStatus("unknown");
  }

  const shown = results.slice(0, MAX_SHOWN);
  const overflow = results.length - shown.length;

  return (
    <section
      aria-label="Ask Remy"
      className="rounded-3xl border border-sand-deep/70 bg-white p-4 shadow-soft md:p-6"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-charcoal-muted">
        Ask Remy
      </p>

      <form onSubmit={onSubmit} className="mt-2">
        <label htmlFor="remy-ask" className="sr-only">
          Ask Remy to find memories or take you somewhere
        </label>
        <div className="flex items-center gap-2 rounded-2xl border border-sand-deep/70 bg-white px-3 focus-within:border-sage">
          <Search className="h-5 w-5 shrink-0 text-charcoal-muted" aria-hidden />
          <input
            id="remy-ask"
            type="text"
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (status !== "idle") setStatus("idle");
            }}
            placeholder="e.g. show travel memories"
            className="h-11 w-full bg-transparent text-base text-charcoal outline-none placeholder:text-charcoal-muted"
          />
          <button
            type="submit"
            className="shrink-0 rounded-full bg-sage px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-sage-deep"
          >
            Ask
          </button>
        </div>
      </form>

      {status === "loading" && (
        <p className="mt-2 text-sm text-charcoal-soft" role="status">
          Searching your memories…
        </p>
      )}

      {status === "unknown" && (
        <p className="mt-2 text-sm text-charcoal-soft" role="status">
          Remy doesn&rsquo;t know how to help with that yet.
        </p>
      )}

      {status === "results" && results.length === 0 && (
        <p className="mt-2 text-sm text-charcoal-soft" role="status">
          No matching memories found.
        </p>
      )}

      {status === "results" && results.length > 0 && (
        <div className="mt-3" role="status">
          <p className="text-sm font-medium text-charcoal">
            I found {results.length}{" "}
            {results.length === 1 ? "memory" : "memories"}
          </p>
          <ul className="mt-1 divide-y divide-sand-deep/30">
            {shown.map((memory) => (
              <li key={memory.memoryId}>
                <Link
                  href={`/memories/${memory.memoryId}`}
                  className="block py-2 text-sm text-sage-deep transition hover:text-sage"
                >
                  {memory.title}
                  {yearLabel(memory.memoryDate)}
                </Link>
              </li>
            ))}
          </ul>
          {overflow > 0 && (
            <p className="mt-1 text-xs text-charcoal-muted">
              and {overflow} more
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {ask.intents.slice(0, 5).map((intent) => (
          <button
            key={intent.id}
            type="button"
            onClick={() => router.push(intent.href)}
            className="rounded-full border border-sand-deep/70 bg-sand/40 px-3 py-1.5 text-sm text-charcoal-soft transition hover:bg-sand/70"
          >
            {intent.label}
          </button>
        ))}
      </div>
    </section>
  );
}
