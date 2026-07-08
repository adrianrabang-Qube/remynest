import Link from "next/link";

import { RemyStage } from "@/lib/remy";
import { createClient } from "@/lib/supabase/server";
import { getActiveContext } from "@/lib/active-profile";
import { signMemories } from "@/lib/memory-media-signing";
import {
  effectiveSortValue,
  formatMemoryGroupLabel,
} from "@/lib/memories/memory-date";


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

  // Historical dating — effective date = memory_date ?? created_at.
  memory_date?: string | null;
  memory_date_precision?: string | null;

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

  // Place each memory on its EFFECTIVE date (memory_date ?? created_at) and
  // order groups newest-first by that date, so historical memories slot into
  // their true position. Pre-migration rows have no memory_date, so this is
  // identical to the previous created_at grouping.
  const ordered = [...memories].sort(
    (a, b) =>
      effectiveSortValue(b) -
      effectiveSortValue(a)
  );

  ordered.forEach((memory) => {
    const date =
      formatMemoryGroupLabel(memory);

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
    show?: string;
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
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <h1 className="font-serif text-2xl font-semibold text-charcoal">
          Please log in
        </h1>
      </div>
    );
  }

  // =====================================
  // ACTIVE PROFILE
  // =====================================

  const activeContext =
    await getActiveContext();

  const isMyNestContext =
    activeContext?.type === "PERSONAL";

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
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <TimelineHeader />

        <div className="rounded-2xl border border-sand-deep/60 bg-sand/40 p-6">
          <p className="text-charcoal-soft">
            No active profile selected.
          </p>
        </div>
      </div>
    );
  }

  // =====================================
  // URL QUERY STATE + PAGINATION
  // =====================================

  const searchQuery = normalizeSearchParam(searchParams?.search);
  const selectedCategory = normalizeSearchParam(searchParams?.category);
  const currentView: "timeline" | "chapters" =
    searchParams?.view === "chapters" ? "chapters" : "timeline";

  // Server-side pagination: the default feed loads ONE page and grows via a "Show more"
  // link (?show=). A narrowed view (active search/category, or the chapters view — which
  // needs the whole set to build chapters) loads the full MATCHING set up to a hard safety
  // cap. So no view is ever unbounded, a filter naturally keeps the set small, and only the
  // memories that actually render are signed (below).
  const PAGE_SIZE = 60;
  const SAFETY_CAP = 2000;
  const isNarrowed =
    Boolean(searchQuery || selectedCategory) || currentView === "chapters";
  const requestedShow = Math.floor(Number(searchParams?.show));
  const shown =
    Number.isFinite(requestedShow) && requestedShow > 0
      ? Math.min(Math.max(requestedShow, PAGE_SIZE), SAFETY_CAP)
      : PAGE_SIZE;
  const fetchLimit = isNarrowed ? SAFETY_CAP : shown + 1;

  // =====================================
  // FETCH MEMORIES (bounded)
  // =====================================

  const memoriesQuery = supabase
    .from("memories")
    .select("*")
    .order("created_at", {
      ascending: false,
    })
    // Deterministic tiebreaker (created_at is not unique) for stable ordering.
    .order("id", { ascending: false })
    .limit(fetchLimit);

  // PERSONAL (My Nest) reads are bound to the session user so they can never return another
  // user's memories; CARE reads use activeProfileId, which is validated at the source
  // (getActiveContext → userCanAccessProfile). App-layer enforcement — not RLS-dependent.
  const query =
    isMyNestContext
      ? memoriesQuery
          .is("memory_profile_id", null)
          .eq("user_id", user.id)
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

  // Normalize the RAW rows (UNSIGNED) — used for filtering, the category list, and the
  // related-memory context, none of which need signed image URLs.
  const normalizedMemories: NormalizedMemory[] = (
    Array.isArray(memories) ? (memories as Memory[]) : []
  ).map((memory) => ({
    ...memory,
    normalizedCategory: normalizeCategory(memory.ai_category),
  }));

  // =====================================
  // FILTERING (in-memory, over the fetched set) — UNSIGNED
  // =====================================

  const filteredMemories: NormalizedMemory[] =
    normalizedMemories.filter((memory) => {
      const searchableValues = buildSearchableValues(memory);
      const matchesSearch =
        !searchQuery ||
        searchableValues.some((value) => value.includes(searchQuery));
      const matchesCategory =
        !selectedCategory || memory.normalizedCategory === selectedCategory;
      return matchesSearch && matchesCategory;
    });

  // Pagination: the default feed shows one page (grow via "Show more"); a narrowed view
  // shows its whole matching set. Only these VISIBLE memories are signed.
  const hasMore = !isNarrowed && filteredMemories.length > shown;
  const visibleMemories: NormalizedMemory[] = isNarrowed
    ? filteredMemories
    : filteredMemories.slice(0, shown);

  // =====================================
  // SIGN ONLY THE VISIBLE (RENDERED) MEMORIES
  // =====================================

  const signedVisible = await signMemories(visibleMemories, {
    variant: "thumb",
    maxImagesPerMemory: 4,
  });

  // =====================================
  // GROUPING (signed, visible)
  // =====================================

  const groupedMemories = groupMemoriesByDate(signedVisible);

  // "Show more" href — preserve the current params, grow the page by one PAGE_SIZE.
  const showMoreParams = new URLSearchParams();
  if (searchParams?.search) showMoreParams.set("search", searchParams.search);
  if (searchParams?.category)
    showMoreParams.set("category", searchParams.category);
  if (searchParams?.view) showMoreParams.set("view", searchParams.view);
  if (searchParams?.context) showMoreParams.set("context", searchParams.context);
  showMoreParams.set("show", String(shown + PAGE_SIZE));
  const showMoreHref = `/timeline?${showMoreParams.toString()}`;

  // =====================================
  // UNIQUE CATEGORIES
  // =====================================

  // Category chips must reflect the WHOLE workspace (up to the safety cap), independent of
  // the paginated feed — otherwise a category used only in OLDER memories would disappear
  // from the filter bar in the default view (it isn't in the first page). A narrowed view
  // already fetched the full matching set, so reuse it; the default view runs one
  // lightweight single-column query.
  let categoryValues: string[];
  if (isNarrowed) {
    categoryValues = normalizedMemories.map((memory) => memory.normalizedCategory);
  } else {
    const categoryQuery = supabase.from("memories").select("ai_category");
    const { data: categoryRows } = await (isMyNestContext
      ? categoryQuery.is("memory_profile_id", null).eq("user_id", user.id)
      : categoryQuery.eq("memory_profile_id", activeProfileId)
    ).limit(SAFETY_CAP);
    categoryValues = (Array.isArray(categoryRows) ? categoryRows : []).map((row) =>
      normalizeCategory(
        (row as { ai_category?: string | null }).ai_category ?? undefined
      )
    );
  }
  const categories = Array.from(new Set(categoryValues.filter(Boolean))).sort();

  const hasResults =
    filteredMemories.length > 0;

  // =====================================
  // RENDER
  // =====================================

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 max-md:space-y-4 max-md:p-4">
      <TimelineHeader />

      {/* Compact control bar — sticky on mobile so the toggle, search and
          filters stay reachable while scrolling the feed. The wrapper keeps the
          original `space-y-6` on desktop, so desktop layout is unchanged. */}
      <div className="space-y-6 max-md:space-y-2 max-md:sticky max-md:top-[calc(3.5rem_+_env(safe-area-inset-top))] max-md:z-20 max-md:-mx-4 max-md:border-b max-md:border-sand-deep/40 max-md:bg-sand/95 max-md:px-4 max-md:py-2 max-md:backdrop-blur">
        <TimelineViewToggle
          currentView={currentView}
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
        />

        <TimelineSearch
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
        />

        <TimelineCategories
          categories={categories}
          selectedCategory={selectedCategory}
          searchQuery={searchQuery}
          formatCategoryLabel={formatCategoryLabel}
        />
      </div>

      {/* Empty State */}
      {!hasResults && (
        <div className="rounded-3xl border border-sand-deep/70 bg-white p-10 text-center shadow-soft max-md:p-8">
          <RemyStage context="timeline.empty" size={128} className="mx-auto mb-3" />
          <h2 className="font-serif text-xl font-semibold text-charcoal">
            Your story starts here
          </h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-charcoal-soft">
            As you add memories, they&apos;ll gather here into a calm, chronological
            story of your life — newest moments first.
          </p>
          <Link
            href="/memories/new"
            className="mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-sage px-5 py-2.5 text-[15px] font-semibold text-white shadow-soft transition hover:bg-sage-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-sand"
          >
            Add a memory
          </Link>
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
        <>
          {Object.entries(groupedMemories).map(
            ([date, memories]) => (
              <TimelineDayGroup
                key={date}
                date={date}
                memories={memories}
                allMemories={normalizedMemories}
                formatCategoryLabel={formatCategoryLabel}
              />
            )
          )}

          {hasMore && (
            <div className="pt-2 text-center">
              <Link
                href={showMoreHref}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-sand-deep/70 bg-white px-5 py-2.5 text-[15px] font-semibold text-charcoal-soft shadow-soft transition hover:bg-sand/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
              >
                Show more
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}