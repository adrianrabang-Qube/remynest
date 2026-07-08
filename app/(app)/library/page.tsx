import LibraryView from "@/components/library/LibraryView";

/**
 * Library — the single, canonical discovery surface for Collections,
 * Connections, Chapters, Story, Biography and Memory Book. Mobile-first hub of
 * compact destination rows; replaces the fragmented dashboard-widget-only
 * discovery model.
 */
export default function LibraryPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:space-y-6 md:p-6">
      <header>
        <h1 className="font-serif text-2xl font-semibold text-charcoal md:text-3xl">
          Library
        </h1>
        <p className="mt-1 text-sm text-charcoal-soft">
          Your personal archive — collections, chapters, and your story.
        </p>
      </header>

      <LibraryView />
    </div>
  );
}
