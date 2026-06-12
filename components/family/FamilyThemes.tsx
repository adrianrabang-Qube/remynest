import type { FamilyTheme } from "@/lib/remy/family";

/**
 * Family Themes — the most common themes across the family's memories,
 * aggregated from the same category model as Collections / Life Chapters.
 */
export default function FamilyThemes({
  themes,
}: {
  themes: FamilyTheme[];
}) {
  if (themes.length === 0) return null;

  return (
    <section className="rounded-3xl border border-sand-deep/70 bg-white p-6 shadow-soft">
      <h2 className="text-lg font-semibold text-charcoal">Family Themes</h2>
      <p className="mt-1 text-sm text-charcoal-soft">
        The threads that run through your family&apos;s memories.
      </p>

      <ul className="mt-4 flex flex-wrap gap-2">
        {themes.map((t) => (
          <li
            key={t.label}
            className="rounded-2xl bg-sand/50 px-4 py-2 text-sm"
          >
            <span className="font-semibold text-charcoal">{t.label}</span>
            <span className="text-charcoal-muted">
              {" "}
              · {t.memoryCount}{" "}
              {t.memoryCount === 1 ? "memory" : "memories"}
              {t.profileCount >= 2
                ? ` · shared by ${t.profileCount}`
                : ""}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
