import type { FamilyTheme } from "@/lib/remy/family";
import type { RemyObservation } from "@/lib/remy/types";

interface ProfilePersonIntelligenceProps {
  themes: FamilyTheme[];
  observations: RemyObservation[];
}

/**
 * ProfilePersonIntelligence — the profile-scoped intelligence layer for one
 * person: notable life areas (their top memory themes) and Remy's human
 * observations. Both come straight from getFamilyIntelligence — no new AI
 * generation. Renders nothing when there's no signal yet.
 */
export default function ProfilePersonIntelligence({
  themes,
  observations,
}: ProfilePersonIntelligenceProps) {
  if (themes.length === 0 && observations.length === 0) return null;

  const topObservations = [...observations]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);

  return (
    <section className="rounded-3xl border border-sand-deep/70 bg-white p-4 shadow-soft md:p-6">
      <h2 className="text-lg font-semibold text-charcoal">Family intelligence</h2>

      {themes.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-charcoal-muted">
            Notable life areas
          </p>
          <div className="flex flex-wrap gap-2">
            {themes.map((t) => (
              <span
                key={t.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-sand-deep/70 bg-sand/40 px-3 py-1.5 text-sm text-charcoal-soft"
              >
                {t.label}
                <span className="text-xs text-charcoal-muted">{t.memoryCount}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {topObservations.length > 0 && (
        <ul className="mt-4 space-y-2">
          {topObservations.map((o) => (
            <li
              key={o.id}
              className="flex gap-2 text-sm leading-relaxed text-charcoal-soft"
            >
              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sage" />
              <span>{o.text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
