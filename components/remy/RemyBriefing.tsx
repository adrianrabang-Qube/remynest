import Link from "next/link";
import { ArrowRight } from "lucide-react";

import RemyAvatar from "@/components/remy/RemyAvatar";
import { REMY } from "@/lib/remy/persona";
import type { RemyBriefing as RemyBriefingModel } from "@/lib/remy/briefing";

/**
 * RemyBriefing — renders the daily briefing (lib/remy/briefing.ts): a mood-aware
 * avatar, the lead headline, a few highlights, and the top next action. It
 * consumes the briefing directly and does no intelligence, selection or
 * derivation. Renders nothing when there's no headline (graceful empty state —
 * no placeholders, no fake content).
 */
export default function RemyBriefing({
  briefing,
}: {
  briefing: RemyBriefingModel;
}) {
  if (!briefing.headline) return null;

  return (
    /* COMPANION surface — Remy speaking, so it carries the remy.* palette (design-bible look);
       page chrome elsewhere stays sage/sand. */
    <section
      aria-label={`${REMY.name}'s briefing`}
      className="rounded-3xl border border-remy-lavender/25 bg-gradient-to-br from-remy-lavender/[0.08] to-white p-4 shadow-soft md:p-6"
    >
      <div className="flex items-start gap-4 max-md:gap-3">
        <RemyAvatar
          mood={briefing.mood}
          size="lg"
          className="max-md:!h-12 max-md:!w-12 max-md:!text-xl"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm font-semibold text-charcoal">{REMY.name}</h2>
            <span className="text-xs font-medium text-charcoal-muted">
              your briefing
            </span>
          </div>

          <p className="mt-1 text-[15px] leading-relaxed text-charcoal">
            {briefing.headline}
          </p>

          {briefing.highlights.length > 0 && (
            <ul className="mt-3 space-y-1.5 border-t border-remy-lavender/15 pt-3">
              {briefing.highlights.map((line) => (
                <li
                  key={line.id}
                  className="flex gap-2 text-sm leading-relaxed text-charcoal-soft"
                >
                  <span
                    aria-hidden
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-remy-lavender"
                  />
                  <span>{line.text}</span>
                </li>
              ))}
            </ul>
          )}

          {briefing.nextAction?.cta && (
            <Link
              href={briefing.nextAction.cta.href}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-remy-violet px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-remy-lavender"
            >
              {briefing.nextAction.cta.label}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
