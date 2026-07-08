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
    <div className="inline-flex items-center rounded-2xl border border-sand-deep/60 bg-white p-1 shadow-soft">
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
            aria-current={isActive ? "page" : undefined}
            className={`rounded-xl px-5 py-2 text-sm font-medium transition max-md:px-3 max-md:py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage ${
              isActive
                ? "bg-sage text-white shadow-soft"
                : "text-charcoal-soft hover:bg-sand/40 hover:text-charcoal"
            }`}
          >
            {view.label}
          </Link>
        );
      })}
    </div>
  );
}
