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
    <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
      <form
        action="/timeline"
        method="GET"
        className="flex items-center gap-3"
      >
        <input
          type="text"
          name="search"
          placeholder="Search memories..."
          defaultValue={searchQuery}
          autoComplete="off"
          spellCheck={false}
          className="flex-1 text-lg outline-none bg-transparent"
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
            className="px-4 py-2 rounded-2xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Clear
          </a>
        )}

        <button
          type="submit"
          className="px-5 py-2 rounded-2xl bg-black text-white text-sm hover:opacity-90 transition-opacity"
        >
          Search
        </button>
      </form>
    </div>
  );
}