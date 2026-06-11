"use client";

import Link from "next/link";
import RemyCompanion from "@/components/remy/RemyCompanion";
import RemyAvatar from "@/components/remy/RemyAvatar";
import type {
  RemyInsightsModel,
  InsightSection,
} from "@/lib/remy/insights";

/**
 * Remy Insights Center — the companion-led insights experience.
 *
 * Leads with human observations (Summary, Memory/Routine/Family/Trends,
 * Achievements, Gentle Recommendations) built from existing telemetry. The full
 * statistical telemetry is preserved below this component, unchanged.
 */
export default function RemyInsightsCenter({
  model,
  subjectName = null,
}: {
  model: RemyInsightsModel;
  subjectName?: string | null;
}) {
  return (
    <div className="space-y-6">
      {/* REMY SUMMARY — reuses the shared companion presence */}
      <div>
        <p className="mb-3 text-sm text-charcoal-muted">{model.headline}</p>
        <RemyCompanion
          observations={model.summary}
          subjectName={subjectName}
          maxObservations={3}
        />
      </div>

      {/* SECTION CARDS */}
      <div className="grid gap-4 md:grid-cols-2">
        {model.sections.map((s) => (
          <SectionCard key={s.id} section={s} />
        ))}
      </div>

      {/* ACHIEVEMENTS */}
      <section className="rounded-3xl border border-sand-deep/70 bg-white p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-charcoal">Achievements</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {model.achievements.map((a) => (
            <div
              key={a.id}
              className={`flex items-start gap-3 rounded-2xl border p-3 ${
                a.unlocked
                  ? "border-sage/30 bg-sage/[0.06]"
                  : "border-sand-deep/60 bg-sand/30 opacity-70"
              }`}
            >
              <span
                className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${
                  a.unlocked
                    ? "bg-sage/20 text-sage-deep"
                    : "bg-sand-deep/40 text-charcoal-muted"
                }`}
              >
                {a.unlocked ? "★" : "☆"}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-charcoal">
                  {a.title}
                </p>
                <p className="text-xs text-charcoal-soft">{a.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* GENTLE RECOMMENDATIONS */}
      {model.recommendations.length > 0 && (
        <section className="rounded-3xl border border-sage/25 bg-gradient-to-br from-sage/[0.06] to-sand/40 p-6 shadow-soft">
          <div className="flex items-center gap-2">
            <RemyAvatar mood="thoughtful" size="sm" />
            <h2 className="text-lg font-semibold text-charcoal">
              Gentle Recommendations
            </h2>
          </div>
          <ul className="mt-4 space-y-2">
            {model.recommendations.map((r) => (
              <li
                key={r.id}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <span className="text-charcoal-soft">{r.text}</span>
                {r.cta && (
                  <Link
                    href={r.cta.href}
                    className="shrink-0 whitespace-nowrap text-xs font-semibold text-sage-deep underline-offset-2 hover:underline"
                  >
                    {r.cta.label} →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function SectionCard({ section }: { section: InsightSection }) {
  return (
    <div className="rounded-3xl border border-sand-deep/70 bg-white p-6 shadow-soft">
      <div className="flex items-center gap-2">
        <RemyAvatar mood={section.mood} size="sm" />
        <h3 className="text-base font-semibold text-charcoal">
          {section.title}
        </h3>
      </div>

      <p className="mt-3 text-[15px] leading-relaxed text-charcoal">
        {section.headline}
      </p>
      {section.detail && (
        <p className="mt-1 text-sm text-charcoal-soft">{section.detail}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {section.metrics.map((m) => (
          <span
            key={m.label}
            className="inline-flex items-center gap-1.5 rounded-full bg-sand/50 px-3 py-1 text-xs"
          >
            <span className="text-charcoal-muted">{m.label}</span>
            <span className="font-semibold text-charcoal">{m.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
