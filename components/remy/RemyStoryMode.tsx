import Link from "next/link";
import {
  formatChapterRange,
} from "@/lib/remy/life-chapters";
import type { RemyStory } from "@/lib/remy/story-mode";

/**
 * Remy Story Mode — a guided, card-based journey through the most meaningful
 * chapters of a life. Reads like "take me through my story", not analytics.
 * Mobile responsive; no nested scroll / fixed heights; hidden when empty.
 */
export default function RemyStoryMode({
  stories,
}: {
  stories: RemyStory[];
}) {
  if (stories.length === 0) return null;

  return (
    <section className="rounded-3xl border border-sage/25 bg-gradient-to-br from-sage/[0.06] to-sand/40 p-6 shadow-soft">
      <h2 className="text-lg font-semibold text-charcoal">Story Mode</h2>
      <p className="mt-1 text-sm text-charcoal-soft">
        Take a guided walk through the chapters of your story.
      </p>

      <div className="mt-5 space-y-5">
        {stories.map((story) => (
          <article
            key={story.id}
            className="rounded-3xl border border-sand-deep/70 bg-white p-4 md:p-6 shadow-soft"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-xl font-semibold text-charcoal break-words">
                {story.title}
              </h3>
              {formatChapterRange(story) && (
                <span className="shrink-0 text-sm font-medium text-sage-deep">
                  {formatChapterRange(story)}
                </span>
              )}
            </div>

            <p className="mt-2 text-[15px] leading-relaxed text-charcoal-soft break-words">
              {story.summary}
            </p>

            {story.sections.length > 0 && (
              <ol className="mt-4 space-y-3 border-l border-sand-deep/70 pl-5">
                {story.sections.map((section) => (
                  <li key={section.id} className="relative">
                    <span
                      aria-hidden="true"
                      className="absolute -left-[1.65rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-sage"
                    />
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <span className="font-medium text-charcoal break-words">
                        {section.title}
                      </span>
                      {section.href && (
                        <Link
                          href={section.href}
                          className="text-xs font-semibold text-sage-deep underline-offset-2 hover:underline"
                        >
                          Explore →
                        </Link>
                      )}
                    </div>
                    {section.description && (
                      <p className="text-sm text-charcoal-soft break-words">
                        {section.description}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}

            <Link
              href={story.href}
              className="mt-5 inline-flex items-center rounded-full bg-sage px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-sage-deep"
            >
              Walk through {story.title}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
