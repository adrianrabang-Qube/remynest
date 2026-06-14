import Link from "next/link";
import { ArrowRight } from "lucide-react";

import RemyAvatar from "@/components/remy/RemyAvatar";
import { REMY } from "@/lib/remy/persona";
import type { RemyConversation as RemyConversationModel } from "@/lib/remy/conversation";

/**
 * RemyConversation — the dedicated companion surface. Renders the opening
 * message, the topics Remy understands, existing quick actions, and the featured
 * CTA over a mood-aware avatar. It consumes the conversation model directly and
 * does no intelligence, derivation or business logic. Empty sections simply
 * don't render (no placeholders, no fabricated suggestions).
 */
export default function RemyConversation({
  conversation,
}: {
  conversation: RemyConversationModel;
}) {
  const mood = conversation.featuredObservation?.mood ?? "calm";

  return (
    <div className="space-y-4">
      {/* Greeting + opening message */}
      <section
        aria-label={`Conversation with ${REMY.name}`}
        className="rounded-3xl border border-sage/25 bg-gradient-to-br from-sage/[0.08] to-sand/40 p-4 shadow-soft md:p-6"
      >
        <div className="flex items-start gap-4 max-md:gap-3">
          <RemyAvatar
            mood={mood}
            size="lg"
            className="max-md:!h-12 max-md:!w-12 max-md:!text-xl"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-charcoal">{REMY.name}</h2>
            {conversation.openingMessage && (
              <p className="mt-1 text-[15px] leading-relaxed text-charcoal">
                {conversation.openingMessage}
              </p>
            )}
          </div>
        </div>

        {conversation.featuredCTA && (
          <Link
            href={conversation.featuredCTA.href}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-sage px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-sage-deep"
          >
            {conversation.featuredCTA.label}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </section>

      {/* Suggested topics — what Remy can explore */}
      {conversation.suggestedTopics.length > 0 && (
        <section
          aria-label="Suggested topics"
          className="rounded-3xl border border-sand-deep/70 bg-white p-4 shadow-soft md:p-6"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-charcoal-muted">
            Explore with Remy
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {conversation.suggestedTopics.map((topic) => (
              <Link
                key={topic.href}
                href={topic.href}
                className="rounded-full border border-sand-deep/70 bg-sand/40 px-3.5 py-1.5 text-sm text-charcoal-soft transition hover:bg-sand/70"
              >
                {topic.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Quick actions — existing navigation destinations */}
      {conversation.quickActions.length > 0 && (
        <section
          aria-label="Quick actions"
          className="rounded-3xl border border-sand-deep/70 bg-white p-4 shadow-soft md:p-6"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-charcoal-muted">
            Quick actions
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
            {conversation.quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex min-h-[44px] items-center justify-center rounded-2xl border border-sand-deep/70 bg-white px-3 py-2 text-center text-sm font-medium text-charcoal transition hover:bg-sand/40"
              >
                {action.label}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
