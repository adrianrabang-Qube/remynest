import { createClient } from "@/lib/supabase/server";
import { getActiveProfile } from "@/lib/active-profile";

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
};

export default async function TimelinePage() {
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

  const activeProfileId =
    await getActiveProfile();

  if (!activeProfileId) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold text-gray-900">
          AI Timeline
        </h1>

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

  const {
    data: memories,
    error,
  } = await supabase
    .from("memories")
    .select("*")
    .eq(
      "memory_profile_id",
      activeProfileId
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.log(error);
  }

  const allMemories: Memory[] =
    memories || [];

  // =====================================
  // GROUP MEMORIES BY DATE
  // =====================================

  const groupedMemories: Record<
    string,
    Memory[]
  > = {};

  allMemories.forEach(
    (memory: Memory) => {

      const date =
        new Date(
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
    }
  );

  // =====================================
  // UNIQUE CATEGORIES
  // =====================================

  const categories =
    Array.from(
      new Set(
        allMemories
          .map(
            (
              memory
            ) =>
              memory.ai_category
          )
          .filter(Boolean)
      )
    );

  return (
    <div className="space-y-6 p-6">

      {/* Header */}
      <div>
        <h1 className="text-5xl font-bold text-gray-900">
          AI Timeline
        </h1>

        <p className="text-gray-500 mt-3 text-lg">
          Your memories organized intelligently.
        </p>
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">

        <input
          type="text"
          placeholder="Search memories..."
          className="w-full text-lg outline-none bg-transparent"
        />
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-3">

        <button className="px-5 py-2 rounded-full bg-black text-white text-sm">
          All
        </button>

        {categories.map(
          (category) => (
            <button
              key={category}
              className="px-5 py-2 rounded-full bg-white border border-gray-200 text-gray-700 text-sm"
            >
              {category}
            </button>
          )
        )}
      </div>

      {/* Empty State */}
      {allMemories.length ===
        0 && (
        <div className="bg-white border border-gray-100 rounded-3xl p-10 shadow-sm">
          <p className="text-gray-500">
            No memories yet.
          </p>
        </div>
      )}

      {/* Timeline */}
      {Object.entries(
        groupedMemories
      ).map(
        ([date, memories]: [
          string,
          Memory[]
        ]) => (

          <div
            key={date}
            className="space-y-4"
          >

            {/* Date Header */}
            <div className="sticky top-0 z-10 bg-[#f5f1e8] py-2">

              <h2 className="text-2xl font-bold text-gray-500 uppercase tracking-wide">
                {date}
              </h2>
            </div>

            {/* Memory Cards */}
            {memories.map(
              (memory: Memory) => {

                // =====================================
                // RELATED MEMORIES
                // =====================================

                const relatedMemories =
                  allMemories
                    .filter(
                      (
                        related
                      ) =>
                        related.id !==
                          memory.id &&
                        related.ai_category ===
                          memory.ai_category
                    )
                    .slice(0, 3);

                return (

                  <details
                    key={memory.id}
                    className="group bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden transition-all"
                  >

                    <summary className="list-none cursor-pointer p-7">

                      {/* Header */}
                      <div className="flex items-start justify-between gap-4">

                        <div>

                          <h3 className="text-4xl font-bold text-gray-900 leading-tight">
                            {memory.ai_title ||
                              memory.title}
                          </h3>

                          <p className="text-gray-400 mt-3 text-lg">
                            {new Date(
                              memory.created_at
                            ).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute:
                                  "2-digit",
                              }
                            )}
                          </p>
                        </div>

                        {/* Category */}
                        {memory.ai_category && (
                          <span className="text-sm px-4 py-2 rounded-full bg-gray-100 text-gray-700 whitespace-nowrap">
                            {
                              memory.ai_category
                            }
                          </span>
                        )}
                      </div>

                      {/* Summary */}
                      {memory.ai_summary && (
                        <p className="text-gray-700 mt-8 text-2xl leading-relaxed">
                          {
                            memory.ai_summary
                          }
                        </p>
                      )}

                      {/* Intelligence Strip */}
                      <div className="flex flex-wrap gap-3 mt-8">

                        <span className="px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm">
                          Mood: Stable
                        </span>

                        <span className="px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm">
                          Importance: Medium
                        </span>

                        <span className="px-4 py-2 rounded-full bg-purple-100 text-purple-700 text-sm">
                          AI Confidence: 92%
                        </span>
                      </div>

                    </summary>

                    {/* Expanded Content */}
                    <div className="px-7 pb-7 border-t border-gray-100">

                      {/* Original Memory */}
                      <div className="mt-6">

                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                          Original Memory
                        </h4>

                        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                          {memory.content}
                        </p>
                      </div>

                      {/* Tags */}
                      {(
                        memory.ai_tags ??
                        []
                      ).length > 0 && (

                        <div className="flex flex-wrap gap-2 mt-6">

                          {(
                            memory.ai_tags ??
                            []
                          ).map(
                            (
                              tag: string
                            ) => (

                              <span
                                key={tag}
                                className="text-xs px-3 py-1 rounded-full bg-black text-white"
                              >
                                #{tag}
                              </span>
                            )
                          )}
                        </div>
                      )}

                      {/* Related Memories */}
                      {relatedMemories.length >
                        0 && (

                        <div className="mt-8">

                          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                            Related Memories
                          </h4>

                          <div className="space-y-3">

                            {relatedMemories.map(
                              (
                                related
                              ) => (

                                <div
                                  key={
                                    related.id
                                  }
                                  className="bg-gray-50 rounded-2xl p-4 border border-gray-100"
                                >

                                  <p className="font-semibold text-gray-900">
                                    {related.ai_title ||
                                      related.title}
                                  </p>

                                  <p className="text-sm text-gray-500 mt-1">
                                    {new Date(
                                      related.created_at
                                    ).toLocaleDateString()}
                                  </p>

                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  </details>
                );
              }
            )}
          </div>
        )
      )}
    </div>
  );
}