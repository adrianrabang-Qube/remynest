import Link from "next/link";

type TimelineCategoriesProps = {
  categories: string[];
  selectedCategory: string;
  searchQuery: string;
  formatCategoryLabel: (
    category: string
  ) => string;
};

function buildTimelineHref({
  category,
  search,
}: {
  category?: string;
  search?: string;
}) {
  const params =
    new URLSearchParams();

  if (category) {
    params.set(
      "category",
      category
    );
  }

  if (search) {
    params.set(
      "search",
      search
    );
  }

  const queryString =
    params.toString();

  return queryString
    ? `/timeline?${queryString}`
    : "/timeline";
}

export default function TimelineCategories({
  categories,
  selectedCategory,
  searchQuery,
  formatCategoryLabel,
}: TimelineCategoriesProps) {
  const normalizedCategories =
    Array.from(
      new Set(
        categories.filter(Boolean)
      )
    ).sort();

  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href={buildTimelineHref({
          search: searchQuery,
        })}
        className={`px-5 py-2 rounded-full text-sm transition-colors ${
          !selectedCategory
            ? "bg-black text-white"
            : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
        }`}
      >
        All
      </Link>

      {normalizedCategories.map(
        (category) => {
          const isActive =
            selectedCategory ===
            category;

          return (
            <Link
              key={category}
              href={buildTimelineHref({
                category,
                search: searchQuery,
              })}
              className={`px-5 py-2 rounded-full text-sm transition-all ${
                isActive
                  ? "bg-black text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {formatCategoryLabel(
                category
              )}
            </Link>
          );
        }
      )}
    </div>
  );
}