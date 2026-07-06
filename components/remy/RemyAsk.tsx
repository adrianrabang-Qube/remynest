"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";

import AIDisclaimer from "@/components/ai/AIDisclaimer";
import { resolveRemyIntent, type RemyAsk as RemyAskModel } from "@/lib/remy/ask";
import {
  resolveAskTurn,
  type AskAnchor,
  type RemyConversationTurn,
} from "@/lib/remy/ask-intent";
import type { AskRetrievalResult } from "@/lib/remy/ask-retrieval";
import type { AskFacts, AskRelatedMemory } from "@/lib/remy/ask-insights";
import { askRemyRetrieval, answerAskRemy } from "@/app/(app)/remy/ask-action";
import { haptic } from "@/lib/haptics";

const MAX_SHOWN = 10;

/** One rendered transcript entry. */
type ChatEntry =
  | { kind: "user"; text: string }
  | {
      kind: "answer";
      text: string | null;
      count: number;
      failed: boolean;
      facts?: AskFacts;
      related?: AskRelatedMemory[];
      followUps?: string[];
    }
  | { kind: "results"; results: AskRetrievalResult[] };

function yearLabel(memoryDate?: string | null): string {
  if (!memoryDate) return "";
  const year = new Date(memoryDate).getFullYear();
  return Number.isNaN(year) ? "" : ` (${year})`;
}

/** A compact factual summary of the memories behind an answer (all grounded, no inference). */
function FactsStrip({ facts }: { facts: AskFacts }) {
  const span =
    facts.fromYear == null
      ? null
      : facts.toYear == null || facts.fromYear === facts.toYear
        ? String(facts.fromYear)
        : `${facts.fromYear}–${facts.toYear}`;

  if (facts.people.length === 0 && facts.themes.length === 0 && !span) return null;

  return (
    <dl className="mt-2 space-y-0.5 text-xs text-charcoal-muted">
      {facts.people.length > 0 && (
        <div>
          <dt className="inline font-semibold">People: </dt>
          <dd className="inline">{facts.people.join(", ")}</dd>
        </div>
      )}
      {span && (
        <div>
          <dt className="inline font-semibold">When: </dt>
          <dd className="inline">{span}</dd>
        </div>
      )}
      {facts.themes.length > 0 && (
        <div>
          <dt className="inline font-semibold">Themes: </dt>
          <dd className="inline">{facts.themes.join(", ")}</dd>
        </div>
      )}
    </dl>
  );
}

/** The retrieved memories, openable directly. */
function RelatedMemories({ related }: { related: AskRelatedMemory[] }) {
  if (related.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-charcoal-muted">
        Related memories
      </p>
      <ul className="mt-1 divide-y divide-sand-deep/30">
        {related.map((memory) => (
          <li key={memory.id}>
            <Link
              href={`/memories/${memory.id}`}
              className="block py-1.5 text-sm text-sage-deep transition hover:text-sage"
            >
              {memory.title}
              {yearLabel(memory.date)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Bounded prior turns for the prompt; assistant text is truncated server-side. */
function deriveHistory(entries: ChatEntry[]): RemyConversationTurn[] {
  const turns: RemyConversationTurn[] = [];
  for (const entry of entries) {
    if (entry.kind === "user") {
      turns.push({ role: "user", text: entry.text });
    } else if (entry.kind === "answer") {
      turns.push({ role: "assistant", text: entry.text ?? "(no answer found)" });
    } else {
      turns.push({
        role: "assistant",
        text: `Found ${entry.results.length} matching memories.`,
      });
    }
  }
  return turns;
}

/**
 * RemyAsk — Remy's conversational entry point (Conversational Memory M1 + Phase 4.1 richer
 * responses). A memory turn RETRIEVES candidates or produces a grounded QUESTION/SUMMARY answer;
 * a follow-up ("tell me more") or a contextual follow-up ("what about last year?") reuses the
 * prior topic as the retrieval anchor; otherwise navigation or a fixed notice. Retrieval STILL
 * runs every turn; history is passed only to interpret intent, never as a source of facts.
 * The facts/related/follow-ups shown with an answer are derived from the retrieved memories
 * (no extra AI). Conversation state is client-side only (no persistence).
 */
export default function RemyAsk({ ask }: { ask: RemyAskModel }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [anchor, setAnchor] = useState<AskAnchor | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function runTurn(rawText: string) {
    if (loading) return; // guard double-submit (each answer is a paid LLM call)
    const text = rawText.trim();
    if (!text) return;
    void haptic("light"); // acknowledge the send
    setNotice(null);

    const resolved = resolveAskTurn(text, anchor);

    if (resolved.kind === "needs-anchor") {
      // Follow-up with no prior topic → nothing to continue (never call AI).
      setNotice("Ask Remy about a memory first — then you can say “tell me more.”");
      return;
    }
    if (resolved.kind === "none") {
      // Navigation intent, else a fixed notice.
      const intent = resolveRemyIntent(text);
      if (intent) {
        router.push(intent.href);
        return;
      }
      setNotice("Remy doesn’t know how to help with that yet.");
      return;
    }

    const { retrievalText, query: retrievalQuery, mode, isFollowUp: follow } = resolved;
    const history = deriveHistory(entries);
    setEntries((prev) => [...prev, { kind: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      if (mode === "RETRIEVE") {
        const res = await askRemyRetrieval(retrievalQuery);
        setEntries((prev) => [...prev, { kind: "results", results: res.results }]);
        if (res.results.length > 0) setAnchor({ text: retrievalText, query: retrievalQuery });
      } else {
        const res = await answerAskRemy(text, retrievalQuery, mode, {
          history,
          retrievalText,
        });
        setEntries((prev) => [
          ...prev,
          {
            kind: "answer",
            text: res.answer,
            count: res.count,
            failed: res.failed,
            facts: res.facts,
            related: res.related,
            followUps: res.followUps,
          },
        ]);
        // Update the anchor only on a NEW topic that found memories — so chained follow-ups keep
        // pointing at the original subject.
        if (!follow && res.count > 0) setAnchor({ text: retrievalText, query: retrievalQuery });
      }
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    void runTurn(input);
  }

  function newConversation() {
    setEntries([]);
    setAnchor(null);
    setNotice(null);
  }

  return (
    <section
      aria-label="Ask Remy"
      className="rounded-3xl border border-sand-deep/70 bg-white p-4 shadow-soft md:p-6"
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-charcoal-muted">
          Ask Remy
        </p>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={newConversation}
            className="text-xs font-medium text-sage-deep transition hover:text-sage"
          >
            New conversation
          </button>
        )}
      </div>

      {entries.length > 0 && (
        <div className="mt-3 space-y-3">
          {entries.map((entry, index) => {
            if (entry.kind === "user") {
              return (
                <p
                  key={index}
                  className="ml-auto w-fit max-w-[90%] rounded-2xl bg-sand/60 px-3 py-1.5 text-sm text-charcoal"
                >
                  {entry.text}
                </p>
              );
            }
            if (entry.kind === "answer") {
              const followUps = entry.followUps ?? [];
              if (entry.text) {
                return (
                  <div key={index} className="w-full max-w-[95%]">
                    <p
                      className="whitespace-pre-wrap rounded-2xl bg-sage/10 px-3 py-2 text-sm leading-relaxed text-charcoal"
                      aria-live="polite"
                    >
                      {entry.text}
                    </p>

                    {entry.facts && <FactsStrip facts={entry.facts} />}
                    {entry.related && <RelatedMemories related={entry.related} />}

                    {entry.count > 0 && (
                      <p className="mt-1 text-xs text-charcoal-muted">
                        Based on {entry.count} {entry.count === 1 ? "memory" : "memories"} Remy
                        found.
                      </p>
                    )}

                    {followUps.length > 0 && (
                      <div
                        className="mt-2 flex flex-wrap gap-2"
                        role="group"
                        aria-label="Suggested follow-up questions"
                      >
                        {followUps.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => void runTurn(suggestion)}
                            disabled={loading}
                            className="rounded-full border border-sand-deep/70 bg-sand/40 px-3 py-1.5 text-xs text-charcoal-soft transition hover:bg-sand/70 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}

                    <AIDisclaimer kind="memoryChat" variant="footnote" />
                  </div>
                );
              }
              // No answer text — a failure (with memories) or a genuine no-match. Still surface the
              // related memories when Remy found some but couldn't phrase a reply.
              return (
                <div key={index}>
                  <p className="text-sm text-charcoal-soft">
                    {entry.failed
                      ? "Remy had trouble answering just now. Please try again."
                      : "I couldn’t find any memories about that."}
                  </p>
                  {entry.related && <RelatedMemories related={entry.related} />}
                </div>
              );
            }
            // results
            if (entry.results.length === 0) {
              return (
                <p key={index} className="text-sm text-charcoal-soft">
                  No matching memories found.
                </p>
              );
            }
            const shown = entry.results.slice(0, MAX_SHOWN);
            const overflow = entry.results.length - shown.length;
            return (
              <div key={index}>
                <p className="text-sm font-medium text-charcoal">
                  I found {entry.results.length}{" "}
                  {entry.results.length === 1 ? "memory" : "memories"}
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
                  <p className="mt-1 text-xs text-charcoal-muted">and {overflow} more</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-3">
        <label htmlFor="remy-ask" className="sr-only">
          Ask Remy to find memories or take you somewhere
        </label>
        <div className="flex items-center gap-2 rounded-2xl border border-sand-deep/70 bg-white px-3 focus-within:border-sage">
          <Search className="h-5 w-5 shrink-0 text-charcoal-muted" aria-hidden />
          <input
            id="remy-ask"
            type="text"
            autoComplete="off"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (notice) setNotice(null);
            }}
            placeholder={
              entries.length > 0
                ? "Ask a follow-up, e.g. tell me more"
                : "e.g. what happened in 2020?"
            }
            className="h-11 w-full bg-transparent text-base text-charcoal outline-none placeholder:text-charcoal-muted"
          />
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 rounded-full bg-sage px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-sage-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            Ask
          </button>
        </div>
      </form>

      {loading && (
        <p className="mt-2 text-sm text-charcoal-soft" role="status">
          Looking through your memories…
        </p>
      )}

      {notice && (
        <p className="mt-2 text-sm text-charcoal-soft" role="status">
          {notice}
        </p>
      )}

      {entries.length === 0 && (
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
      )}
    </section>
  );
}
