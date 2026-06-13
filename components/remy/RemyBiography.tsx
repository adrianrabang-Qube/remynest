import Link from "next/link";
import type { RemyBiography } from "@/lib/remy/biography";

/**
 * Remy Biography — a personal life document assembled from existing memory
 * intelligence. Long-form, readable, document-style (not analytics). Mobile
 * responsive; no nested scroll / fixed heights; hidden when there's no story.
 */
export default function RemyBiography({
  biography,
}: {
  biography: RemyBiography | null;
}) {
  if (!biography) return null;

  return (
    <section className="rounded-3xl border border-sand-deep/70 bg-white p-6 shadow-soft sm:p-10 max-md:p-5">
      <header className="border-b border-sand-deep/60 pb-6 max-md:pb-4">
        <h2 className="text-3xl font-semibold tracking-tight text-charcoal sm:text-4xl max-md:text-2xl">
          {biography.title}
        </h2>
        {biography.subtitle && (
          <p className="mt-2 text-sm font-medium uppercase tracking-wide text-charcoal-muted">
            {biography.subtitle}
          </p>
        )}
      </header>

      <div className="mx-auto mt-8 max-md:mt-4 max-w-2xl space-y-10 max-md:space-y-5">
        {biography.sections.map((section) => (
          <article key={section.id}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-sage-deep">
              {section.title}
            </h3>
            <div className="mt-3 space-y-3">
              {section.paragraphs.map((paragraph, index) => (
                <p
                  key={index}
                  className="text-[17px] leading-relaxed text-charcoal-soft break-words max-md:text-[15px]"
                >
                  {paragraph}
                </p>
              ))}
            </div>
            {section.href && (
              <Link
                href={section.href}
                className="mt-3 inline-flex items-center text-sm font-semibold text-sage-deep underline-offset-2 hover:underline"
              >
                Explore →
              </Link>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
