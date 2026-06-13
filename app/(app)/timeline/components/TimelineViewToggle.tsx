import Link from "next/link";

type TimelineView =
  | "timeline"
  | "chapters";

type TimelineViewToggleProps = {
  currentView: TimelineView;
  searchQuery: string;
  selectedCategory: string;
};

function buildViewHref({
  view,
  searchQuery,
  selectedCategory,
}: {
  view: TimelineView;
  searchQuery: string;
  selectedCategory: string;
}) {
  const params =
    new URLSearchParams();

  params.set("view", view);

  if (searchQuery.trim()) {
    params.set(
      "search",
      searchQuery.trim()
    );
  }

  if (
    selectedCategory.trim()
  ) {
    params.set(
      "category",
      selectedCategory.trim()
    );
  }

  return `/timeline?${params.toString()}`;
}

export default function TimelineViewToggle({
  currentView,
  searchQuery,
  selectedCategory,
}: TimelineViewToggleProps) {
  const views: {
    value: TimelineView;
    label: string;
  }[] = [
    {
      value: "timeline",
      label: "Timeline",
    },
    {
      value: "chapters",
      label: "Life Chapters",
    },
  ];

  return (
    <div className="inline-flex items-center bg-white border border-gray-200 rounded-2xl p-1 shadow-sm">
      {views.map((view) => {
        const isActive =
          currentView ===
          view.value;

        return (
          <Link
            key={view.value}
            href={buildViewHref({
              view: view.value,
              searchQuery,
              selectedCategory,
            })}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 max-md:px-3 max-md:py-1.5 ${
              isActive
                ? "bg-black text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            {view.label}
          </Link>
        );
      })}
    </div>
  );
}