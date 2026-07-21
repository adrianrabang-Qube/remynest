type TimelineSearchProps = {
  searchQuery: string;
  selectedCategory: string;
};

function buildClearTimelineHref(
  selectedCategory: string
) {
  if (!selectedCategory) {
    return "/timeline";
  }

  return `/timeline?category=${encodeURIComponent(
    selectedCategory
  )}`;
}

export default function TimelineSearch({
  searchQuery,
  selectedCategory,
}: TimelineSearchProps) {
  const hasActiveSearch =
    Boolean(searchQuery);

  return (
    <div className="rounded-3xl border border-sand-deep/70 bg-white p-2.5 shadow-soft max-md:rounded-2xl max-md:p-2">
      <form
        action="/timeline"
        method="GET"
        role="search"
        className="flex items-center gap-2"
      >
        <label htmlFor="timeline-search" className="sr-only">
          Search memories
        </label>
        <input
          id="timeline-search"
          type="text"
          name="search"
          inputMode="search"
          placeholder="Search memories"
          defaultValue={searchQuery}
          autoComplete="off"
          spellCheck={false}
          className="flex-1 bg-transparent px-3 text-base text-charcoal outline-none placeholder:text-charcoal-muted"
        />

        {selectedCategory && (
          <input
            type="hidden"
            name="category"
            value={selectedCategory}
          />
        )}

        {hasActiveSearch && (
          <a
            href={buildClearTimelineHref(
              selectedCategory
            )}
            className="rounded-full border border-sand-deep/60 px-4 py-2 text-sm text-charcoal-soft transition hover:bg-sand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Clear
          </a>
        )}

        <button
          type="submit"
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-sand"
        >
          Search
        </button>
      </form>
    </div>
  );
}
