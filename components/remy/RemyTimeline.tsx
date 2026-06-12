import Link from "next/link";
import {
  groupTimelineByYear,
  type RemyTimelineEvent,
} from "@/lib/remy/timeline";

/**
 * Remy Timeline — the visual narrative layer. A vertical, chronological story
 * built from existing intelligence. Mobile responsive; no nested scroll, no
 * fixed heights. Hidden when there's nothing to show.
 */
export default function RemyTimeline({
  events,
}: {
  events: RemyTimelineEvent[];
}) {
  if (events.length === 0) return null;

  const groups = groupTimelineByYear(events);

  return (
    <section className="rounded-3xl border border-sand-deep/70 bg-white p-4 md:p-6 shadow-soft">
      <h2 className="text-lg font-semibold text-charcoal">Your Story</h2>
      <p className="mt-1 text-sm text-charcoal-soft">
        A look back through the moments that shaped your story.
      </p>

      <ol className="mt-5 space-y-6 border-l border-sand-deep/70 pl-6">
        {groups.map((group) => (
          <li key={group.year} className="relative">
            <span
              aria-hidden="true"
              className="absolute -left-[1.95rem] top-1 h-3 w-3 rounded-full border-2 border-white bg-sage"
            />
            <p className="text-sm font-semibold text-sage-deep">
              {group.year}
            </p>
            <ul className="mt-2 space-y-2">
              {group.events.map((event) => (
                <li key={event.id}>
                  <Link
                    href={event.href}
                    className="block rounded-2xl px-3 py-2 transition hover:bg-sand/40"
                  >
                    <p className="font-medium text-charcoal break-words">
                      {event.title}
                    </p>
                    {event.description && (
                      <p className="text-sm text-charcoal-soft break-words">
                        {event.description}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
