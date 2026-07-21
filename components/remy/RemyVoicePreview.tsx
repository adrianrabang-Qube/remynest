import Link from "next/link";

import RemyAvatar from "@/components/remy/RemyAvatar";
import { REMY } from "@/lib/remy/persona";
import type { RemyVoiceLine } from "@/lib/remy/voice-engine";

/**
 * RemyVoicePreview — the Voice UI foundation. It renders the top voice line as
 * Remy "speaking" (mood-aware avatar + the line + optional CTA). It consumes
 * RemyVoiceLine[] directly and does NO intelligence, signal derivation or lens
 * logic — purely the presentation end of the pipeline. The future animated /
 * spoken Remy plugs in here, reading the same voice lines.
 */
export default function RemyVoicePreview({ lines }: { lines: RemyVoiceLine[] }) {
  const top = lines[0] ?? null;
  if (!top) return null;

  return (
    <section
      aria-label="Remy"
      className="flex items-start gap-3 rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/[0.07] to-sand/40 p-4 shadow-soft md:p-5"
    >
      <RemyAvatar
        mood={top.mood}
        size="lg"
        className="max-md:!h-12 max-md:!w-12 max-md:!text-xl"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold text-charcoal">{REMY.name}</h2>
          <span className="text-xs font-medium text-charcoal-muted">
            is saying
          </span>
        </div>

        <p className="mt-1 text-[15px] leading-relaxed text-charcoal">
          {top.text}
        </p>

        {top.cta && (
          <Link
            href={top.cta.href}
            className="mt-2 inline-flex items-center text-sm font-semibold text-primary-deep underline-offset-2 hover:underline"
          >
            {top.cta.label} →
          </Link>
        )}
      </div>
    </section>
  );
}
