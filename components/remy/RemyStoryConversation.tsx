"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";

import AIDisclaimer from "@/components/ai/AIDisclaimer";
import { useIsNativePlatform } from "@/lib/platform";
import {
  narrateStoryConversation,
  type StoryConversationResult,
} from "@/app/(app)/remy/story-action";

/**
 * Phase 25 — the opt-in surface that performs the FIRST user-facing `executeConversation` call. On an explicit
 * tap it asks the server action to run the deterministic pipeline + the production provider (OpenAI) and
 * renders the narrated `ConversationResponse.text`. Presentation only — all data/auth/scoping/generation live
 * server-side in `narrateStoryConversation`. This surface is isolated: it does not touch the Ask Remy chat.
 */
export default function RemyStoryConversation() {
  const [result, setResult] = useState<StoryConversationResult | null>(null);
  const [pending, startTransition] = useTransition();
  const isNative = useIsNativePlatform();

  const run = () => {
    setResult(null);
    startTransition(async () => {
      const res = await narrateStoryConversation();
      setResult(res);
    });
  };

  return (
    <section className="rounded-3xl border border-charcoal/10 bg-white/70 p-5 shadow-soft md:p-6">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sage/10 text-sage-deep"
        >
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-serif text-lg text-charcoal md:text-xl">Your story, told by Remy</h2>
          <p className="mt-1 text-sm text-charcoal-muted">
            Remy weaves the memories you&apos;ve saved into a warm, flowing reflection — grounded only in
            what you&apos;ve recorded.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-sage px-5 py-2.5 text-base font-medium text-white transition hover:bg-sage-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {pending ? "Remy is reflecting…" : result ? "Tell it again" : "Ask Remy to tell your story"}
      </button>

      <div aria-live="polite" className="mt-4">
        {pending && (
          <div className="space-y-2" aria-hidden>
            <div className="h-3 w-11/12 animate-pulse rounded bg-charcoal/10" />
            <div className="h-3 w-full animate-pulse rounded bg-charcoal/10" />
            <div className="h-3 w-10/12 animate-pulse rounded bg-charcoal/10" />
          </div>
        )}

        {!pending && result?.status === "generated" && result.text && (
          <div className="rounded-2xl bg-sand/60 p-4">
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-charcoal">{result.text}</p>
            <AIDisclaimer kind="memoryChat" variant="footnote" />
          </div>
        )}

        {!pending && result?.status === "quota_exceeded" && (
          <div className="rounded-2xl border border-gold/30 bg-gold/5 p-4">
            <p className="text-sm text-charcoal">
              You&apos;ve reached your free limit for Remy&apos;s storytelling
              {result.quota?.reason === "daily_limit" ? " today" : " this month"}.
            </p>
            {/* iOS anti-steering (Apple 3.1.1/3.1.3): show upgrade copy on web only, never a purchase link/CTA. */}
            {!isNative && result.quota?.upgradeMessage && (
              <p className="mt-1 text-sm text-charcoal-muted">{result.quota.upgradeMessage}</p>
            )}
          </div>
        )}

        {!pending && result?.status === "empty" && (
          <p className="text-sm text-charcoal-muted">
            There aren&apos;t any memories to narrate yet. Save a few moments and Remy will tell your story.
          </p>
        )}

        {!pending && result?.status === "unavailable" && (
          <p className="text-sm text-charcoal-muted">
            Remy couldn&apos;t put your story into words just now. Please try again in a moment.
          </p>
        )}
      </div>
    </section>
  );
}
