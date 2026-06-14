"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { resolveRemyIntent, type RemyAsk as RemyAskModel } from "@/lib/remy/ask";

/**
 * RemyAsk — Remy's first interactive entry point. A simple client-side Ask
 * surface: type a request, Remy routes it to an existing destination via the
 * deterministic keyword resolver (lib/remy/ask.ts). No AI, no generated text, no
 * conversation history, no memory retrieval, no chat, no streaming, no backend.
 * Unknown requests show a fixed message. Suggestion chips route directly.
 */
export default function RemyAsk({ ask }: { ask: RemyAskModel }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [notFound, setNotFound] = useState(false);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const intent = resolveRemyIntent(query);
    if (intent) {
      setNotFound(false);
      router.push(intent.href);
      return;
    }
    setNotFound(true);
  }

  const suggestions = ask.intents.slice(0, 5);

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
          Ask Remy to take you somewhere
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
              if (notFound) setNotFound(false);
            }}
            placeholder="e.g. show my story"
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

      {notFound && (
        <p className="mt-2 text-sm text-charcoal-soft" role="status">
          Remy doesn&rsquo;t know how to help with that yet.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {suggestions.map((intent) => (
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
