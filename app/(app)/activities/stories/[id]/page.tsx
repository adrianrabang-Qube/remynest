import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { userCanAccessProfile } from "@/lib/profile-ownership";
import { getStory, getStoryMoments } from "@/lib/stories/queries";
import StoryActions from "@/components/stories/StoryActions";

export const metadata: Metadata = { title: "Story" };
export const dynamic = "force-dynamic";

/**
 * The story reader — a clean "memory book" sequence. Authoritative fetch +
 * READ authorization against the story's OWN context; moments are fetched
 * scoped by that same workspace and signed (private bucket, MEDIUM variant).
 */
export default async function StoryReaderPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const story = await getStory(params.id);
  const authorized =
    !!story &&
    (story.memory_profile_id == null
      ? story.user_id === user.id
      : await userCanAccessProfile(user.id, story.memory_profile_id));

  if (!story || !authorized) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <Link
          href="/activities/stories"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-medium text-charcoal-soft transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Story Builder
        </Link>
        <div className="mt-6 rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
          <p className="text-charcoal-soft">This story isn&apos;t available.</p>
          <p className="mt-1 text-sm text-charcoal-muted">
            It may have been removed, or it belongs to a different workspace.
          </p>
        </div>
      </div>
    );
  }

  const moments = await getStoryMoments(story);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link
        href="/activities/stories"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-medium text-charcoal-soft transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Story Builder
      </Link>

      <header className="mt-4">
        <h1 className="font-serif text-2xl font-semibold text-charcoal md:text-3xl">
          {story.title || "Untitled story"}
        </h1>
        <p className="mt-1 text-sm text-charcoal-muted">
          {moments.length} moment{moments.length === 1 ? "" : "s"}
        </p>
      </header>

      <div className="mt-4">
        <StoryActions storyId={story.id} />
      </div>

      <ol className="mt-6 space-y-6">
        {moments.map((moment, i) => (
          <li
            key={moment.id}
            className="overflow-hidden rounded-3xl border border-sand-deep/70 bg-white shadow-soft"
          >
            {moment.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URL
              <img
                src={moment.imageUrl}
                alt={moment.title || `Photo for moment ${i + 1}`}
                className="max-h-96 w-full bg-sand object-cover"
              />
            )}
            <div className="p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-charcoal-muted">
                Moment {i + 1} of {moments.length}
                {moment.memoryDate && (
                  <>
                    {" · "}
                    {new Date(moment.memoryDate).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </>
                )}
              </p>
              {moment.title && (
                <h2 className="mt-1.5 font-serif text-xl font-semibold text-charcoal">
                  {moment.title}
                </h2>
              )}
              {moment.content && (
                <p className="mt-2 whitespace-pre-wrap text-[17px] leading-relaxed text-charcoal-soft">
                  {moment.content}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>

      {moments.length === 0 && (
        <div className="mt-6 rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
          <p className="text-charcoal-soft">
            The memories in this story are no longer available.
          </p>
          <p className="mt-1 text-sm text-charcoal-muted">
            They may have been deleted from the workspace.
          </p>
        </div>
      )}
    </div>
  );
}
