import Link from "next/link";
import { notFound } from "next/navigation";
import RemyAvatar from "@/components/remy/avatar/RemyAvatar";
import type { RemyMood } from "@/components/remy/avatar/remy-moods";

// TEMP — development-only avatar QA page. Remove before launch.
export const dynamic = "force-dynamic";

const MOODS: RemyMood[] = [
  "welcoming",
  "listening",
  "thinking",
  "analyzing",
  "sharing",
  "celebrating",
  "reflecting",
  "resting",
  "neutral",
];

export default function RemyAvatarTestPage() {
  // Development only — never exposed in production.
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-charcoal">
          Remy Avatar — mood test
        </h1>
        <p className="mt-2 text-charcoal-soft">
          All nine moods rendered with the real <code>RemyAvatar</code> at 200px.
          Development only — remove before launch.
        </p>
        <Link
          href="/dashboard"
          className="mt-3 inline-flex text-sm text-sage-deep hover:underline"
        >
          ← Back to dashboard
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3">
        {MOODS.map((mood) => (
          <div key={mood} className="flex flex-col items-center gap-3">
            <RemyAvatar
              mood={mood}
              size="xl"
              className="!h-[200px] !w-[200px]"
            />
            <p className="text-sm font-medium text-charcoal">{mood}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
