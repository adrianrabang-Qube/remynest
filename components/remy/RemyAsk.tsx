"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";

import { resolveRemyIntent, type RemyAsk as RemyAskModel } from "@/lib/remy/ask";
import { classifyAskIntent, extractAskQuery } from "@/lib/remy/ask-intent";
import type { AskRetrievalResult } from "@/lib/remy/ask-retrieval";
import { askRemyRetrieval, answerAskRemy } from "@/app/(app)/remy/ask-action";

type AskStatus = "idle" | "loading" | "results" | "answer" | "unknown";

type AskAnswerState = { text: string | null; count: number; failed: boolean };

const MAX_SHOWN = 10;

function yearLabel(memoryDate?: string | null): string {
  if (!memoryDate) return "";
  const year = new Date(memoryDate).getFullYear();
  return Number.isNaN(year) ? "" : ` (${year})`;
}

/**
 * RemyAsk — Remy's interactive entry point.
 *   1. Memory query (extractAskQuery) →
 *        - RETRIEVE: list factual memory candidates (Retrieval Engine, no AI).
 *        - QUESTION / SUMMARY: a grounded answer from retrieved memories using the
 *          existing Remy AI infra (Ask Intelligence V1). The server retrieves
 *          first and only calls the AI when memories were found.
 *   2. Otherwise a navigation intent (resolveRemyIntent) → navigate.
 *   3. Otherwise the fixed "doesn't know" message.
 * Retrieval is always deterministic and workspace-scoped; the AI only ever sees
 * memories that retrieval returned (grounded, no fabrication, no bypass).
 */
export default function RemyAsk({ ask }: { ask: RemyAskModel }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<AskStatus>("idle");
  const [results, setResults] = useState<AskRetrievalResult[]>([]);
  const [answer, setAnswer] = useState<AskAnswerState | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = query.trim();
    if (!text) return;

    // 1. Memory query (checked first so "travel memories" / "what happened in
    // 2020" aren't caught by a navigation keyword).
    const memoryQuery = extractAskQuery(text);
    if (memoryQuery) {
      const intent = classifyAskIntent(text);
      setStatus("loading");
      setResults([]);
      setAnswer(null);

      if (intent === "RETRIEVE") {
        const res = await askRemyRetrieval(memoryQuery);
        setResults(res.results);
        setStatus("results");
      } else {
        const res = await answerAskRemy(text, memoryQuery, intent);
        setAnswer({ text: res.answer, count: res.count, failed: res.failed });
        setStatus("answer");
      }
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
    setAnswer(null);
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
            placeholder="e.g. what happened in 2020?"
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
          Looking through your memories…
        </p>
      )}

      {status === "unknown" && (
        <p className="mt-2 text-sm text-charcoal-soft" role="status">
          Remy doesn&rsquo;t know how to help with that yet.
        </p>
      )}

      {status === "answer" && answer?.text && (
        <div className="mt-3" role="status">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-charcoal">
            {answer.text}
          </p>
          {answer.count > 0 && (
            <p className="mt-2 text-xs text-charcoal-muted">
              Based on {answer.count}{" "}
              {answer.count === 1 ? "memory" : "memories"} Remy found.
            </p>
          )}
        </div>
      )}

      {status === "answer" && answer && !answer.text && (
        <p className="mt-2 text-sm text-charcoal-soft" role="status">
          {answer.failed
            ? "Remy had trouble answering just now. Please try again."
            : "I couldn’t find any memories about that."}
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
