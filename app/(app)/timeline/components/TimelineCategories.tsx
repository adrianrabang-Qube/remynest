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

const CHIP_BASE =
  "rounded-full px-4 py-2 text-sm transition max-md:shrink-0 max-md:whitespace-nowrap max-md:px-3 max-md:py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage";
const CHIP_ACTIVE = "bg-sage text-white";
const CHIP_INACTIVE =
  "border border-sand-deep/60 bg-white text-charcoal-soft hover:bg-sand/40";

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
    <div className="flex flex-wrap gap-2 max-md:flex-nowrap max-md:overflow-x-auto max-md:px-0.5 max-md:py-0.5">
      <Link
        href={buildTimelineHref({
          search: searchQuery,
        })}
        aria-current={!selectedCategory ? "page" : undefined}
        className={`${CHIP_BASE} ${
          !selectedCategory ? CHIP_ACTIVE : CHIP_INACTIVE
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
              aria-current={isActive ? "page" : undefined}
              className={`${CHIP_BASE} ${
                isActive ? CHIP_ACTIVE : CHIP_INACTIVE
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
