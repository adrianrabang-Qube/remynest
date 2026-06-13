"use client";

import Link from "next/link";
import RemyAvatar from "./RemyAvatar";
import { REMY } from "@/lib/remy/persona";
import type { RemyObservation } from "@/lib/remy/types";

/**
 * Remy Companion — the reusable presence layer.
 *
 * Renders ranked observations (from lib/remy) as a calm, supportive companion.
 * It is presentation-only: it knows nothing about how observations were
 * derived, so the same component serves the Dashboard, Memories, Reminders,
 * Insights, and Caregiver surfaces. A client component so it can host the
 * future interactive avatar and observation transitions.
 */
export default function RemyCompanion({
  observations,
  subjectName = null,
  maxObservations = 3,
}: {
  observations: RemyObservation[];
  subjectName?: string | null;
  maxObservations?: number;
}) {
  const items = observations.slice(0, Math.max(1, maxObservations));
  const primary = items[0] ?? null;
  const rest = items.slice(1);
  const mood = primary?.mood ?? REMY.defaultMood;

  return (
    <section className="rounded-3xl border border-sage/25 bg-gradient-to-br from-sage/[0.07] to-sand/40 p-6 shadow-soft max-md:p-4">
      <div className="flex items-start gap-4 max-md:gap-3">
        <RemyAvatar mood={mood} size="lg" className="max-md:!h-12 max-md:!w-12 max-md:!text-xl" />

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h2 className="text-lg font-semibold text-charcoal">{REMY.name}</h2>
            <span className="text-xs font-medium text-charcoal-muted">
              {REMY.role}
              {subjectName ? ` · ${subjectName}` : ""}
            </span>
          </div>

          {primary ? (
            <>
              <p className="mt-1 text-[15px] leading-relaxed text-charcoal">
                {primary.text}
              </p>
              {primary.cta && (
                <Link
                  href={primary.cta.href}
                  className="mt-2 inline-flex items-center text-sm font-semibold text-sage-deep underline-offset-2 hover:underline"
                >
                  {primary.cta.label} →
                </Link>
              )}
            </>
          ) : (
            <p className="mt-1 text-[15px] text-charcoal-soft">
              I&apos;m here whenever you need me.
            </p>
          )}

          {rest.length > 0 && (
            <ul className="mt-4 space-y-2 border-t border-sage/15 pt-3 max-md:mt-2 max-md:space-y-1 max-md:pt-2">
              {rest.map((o) => (
                <li
                  key={o.id}
                  className="flex items-start justify-between gap-3 text-sm max-md:gap-2 max-md:text-[13px]"
                >
                  <span className="text-charcoal-soft">{o.text}</span>
                  {o.cta && (
                    <Link
                      href={o.cta.href}
                      className="shrink-0 whitespace-nowrap text-xs font-semibold text-sage-deep underline-offset-2 hover:underline"
                    >
                      {o.cta.label} →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
