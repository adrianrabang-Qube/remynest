import { createClient } from "@/lib/supabase/server";
import { getActiveContext } from "@/lib/active-profile";


import TimelineHeader from "./components/TimelineHeader";
import TimelineSearch from "./components/TimelineSearch";
import TimelineCategories from "./components/TimelineCategories";
import TimelineDayGroup from "./components/TimelineDayGroup";
import TimelineViewToggle from "./components/TimelineViewToggle";
import ChaptersView from "./components/ChaptersView";

export const dynamic = "force-dynamic";

type Memory = {
  id: string;
  title: string;
  content: string;
  created_at: string;

  ai_title?: string;
  ai_summary?: string;
  ai_category?: string;
  ai_tags?: string[];

  memory_profile_id?: string;

  normalizedCategory?: string;

  ai_mood?: string;
  ai_importance?: string;
  ai_confidence?: number;
  ai_sentiment?: string;
  ai_emotional_weight?: string;

  relevanceScore?: number;
  relatedCount?: number;
};

type NormalizedMemory =
  Memory & {
    normalizedCategory: string;
  };

function normalizeCategory(
  category?: string
) {
  if (!category) {
    return "uncategorized";
  }

  return category
    .trim()
    .toLowerCase();
}

function formatCategoryLabel(
  category: string
) {
  return category
    .split(" ")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

function normalizeSearchParam(
  value?: string
) {
  if (!value) {
    return "";
  }

  return value
    .trim()
    .toLowerCase();
}

function buildSearchableValues(
  memory: Memory
) {
  return [
    memory.title,
    memory.content,
    memory.ai_title,
    memory.ai_summary,
    memory.ai_category,
    ...(memory.ai_tags || []),
  ]
    .filter(Boolean)
    .map((value) =>
      String(value).toLowerCase()
    );
}

function groupMemoriesByDate(
  memories: NormalizedMemory[]
) {
  const groupedMemories: Record<
    string,
    NormalizedMemory[]
  > = {};

  memories.forEach((memory) => {
    const date = new Date(
      memory.created_at
    ).toLocaleDateString(
      "en-IE",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );

    if (!groupedMemories[date]) {
      groupedMemories[date] = [];
    }

    groupedMemories[date].push(
      memory
    );
  });

  return groupedMemories;
}

export default async function TimelinePage({
  searchParams,
}: {
  searchParams?: {
    search?: string;
    category?: string;
    view?: string;
    context?: string;
  };
}) {
  const supabase =
    await createClient();

  // =====================================
  // AUTH
  // =====================================

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          Please log in
        </h1>
      </div>
    );
  }

  // =====================================
  // ACTIVE PROFILE
  // =====================================

  const isMyNestContext =
    searchParams?.context ===
    "my-nest";

  const activeContext =
    await getActiveContext();

  const isCareContext =
    activeContext?.type === "CARE";

  const activeProfileId =
    isMyNestContext
      ? null
      : isCareContext
        ? activeContext.profileId
        : null;

  if (!isMyNestContext && !activeProfileId) {
    return (
      <div className="space-y-6 p-6">
        <TimelineHeader />

        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
          <p className="text-yellow-700">
            No active profile selected.
          </p>
        </div>
      </div>
    );
  }

  // =====================================
  // FETCH MEMORIES
  // =====================================

  const memoriesQuery = supabase
    .from("memories")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  const query =
    isMyNestContext
      ? memoriesQuery.is(
          "memory_profile_id",
          null
        )
      : memoriesQuery.eq(
          "memory_profile_id",
          activeProfileId
        );

  const {
    data: memories,
    error,
  } = await query;

  if (error) {
    console.error(
      "[timeline-page-fetch-error]",
      error
    );
  }

  const allMemories: Memory[] =
    Array.isArray(memories)
      ? memories
      : [];

  // =====================================
  // NORMALIZATION
  // =====================================

  const normalizedMemories: NormalizedMemory[] =
    allMemories.map(
      (memory: Memory) => ({
        ...memory,
        normalizedCategory:
          normalizeCategory(
            memory.ai_category
          ),
      })
    );

  // =====================================
  // URL QUERY STATE
  // =====================================

  const searchQuery =
    normalizeSearchParam(
      searchParams?.search
    );

  const selectedCategory =
    normalizeSearchParam(
      searchParams?.category
    );

  const currentView:
    | "timeline"
    | "chapters" =
      searchParams?.view ===
      "chapters"
        ? "chapters"
        : "timeline";

  // =====================================
  // FILTERING
  // =====================================

  const filteredMemories: NormalizedMemory[] =
    normalizedMemories.filter(
      (
        memory: NormalizedMemory
      ) => {
        const searchableValues =
          buildSearchableValues(
            memory
          );

        const matchesSearch =
          !searchQuery ||
          searchableValues.some(
            (value) =>
              value.includes(
                searchQuery
              )
          );

        const matchesCategory =
          !selectedCategory ||
          memory.normalizedCategory ===
            selectedCategory;

        return (
          matchesSearch &&
          matchesCategory
        );
      }
    );

  // =====================================
  // GROUPING
  // =====================================

  const groupedMemories =
    groupMemoriesByDate(
      filteredMemories
    );

  // =====================================
  // UNIQUE CATEGORIES
  // =====================================

  const categories =
    Array.from(
      new Set(
        normalizedMemories
          .map(
            (memory) =>
              memory.normalizedCategory
          )
          .filter(Boolean)
      )
    ).sort();

  const hasResults =
    filteredMemories.length > 0;

  // =====================================
  // RENDER
  // =====================================

  return (
    <div className="space-y-6 p-6">
      <TimelineHeader />

      <TimelineViewToggle
        currentView={currentView}
        searchQuery={searchQuery}
        selectedCategory={
          selectedCategory
        }
      />

      <TimelineSearch
        searchQuery={searchQuery}
        selectedCategory={
          selectedCategory
        }
      />

      <TimelineCategories
        categories={categories}
        selectedCategory={
          selectedCategory
        }
        searchQuery={searchQuery}
        formatCategoryLabel={
          formatCategoryLabel
        }
      />

      {/* Empty State */}
      {!hasResults && (
        <div className="bg-white border border-gray-100 rounded-3xl p-10 shadow-sm">
          <p className="text-gray-500">
            No memories matched your current AI timeline filters.
          </p>
        </div>
      )}

      {/* View Renderer */}
      {currentView ===
      "chapters" ? (
        <ChaptersView
          memories={
            filteredMemories
          }
        />
      ) : (
        Object.entries(
          groupedMemories
        ).map(
          ([date, memories]) => (
            <TimelineDayGroup
              key={date}
              date={date}
              memories={memories}
              allMemories={
                normalizedMemories
              }
              formatCategoryLabel={
                formatCategoryLabel
              }
            />
          )
        )
      )}
    </div>
  );
}