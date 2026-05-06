import { createClient } from "@/lib/supabase/server";

export default async function TimelinePage() {
  const supabase = createClient();

  // 🔐 Get logged in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 🚫 Not logged in
  if (!user) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          Please log in
        </h1>
      </div>
    );
  }

  // 📦 Fetch memories
  const { data: memories } = await supabase
    .from("memories")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          AI Timeline
        </h1>

        <p className="text-gray-500 mt-2">
          Your memories organized intelligently.
        </p>
      </div>

      {!memories || memories.length === 0 ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-600">
            No memories yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {memories.map((memory) => (
            <div
              key={memory.id}
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {memory.ai_title || memory.title}
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(memory.created_at).toLocaleString()}
                  </p>
                </div>

                {/* Category */}
                {memory.ai_category && (
                  <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                    {memory.ai_category}
                  </span>
                )}
              </div>

              {/* Summary */}
              {memory.ai_summary && (
                <p className="text-gray-700 mt-4">
                  {memory.ai_summary}
                </p>
              )}

              {/* Original Content */}
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-1">
                  Original Memory
                </p>

                <p className="text-gray-800 whitespace-pre-wrap">
                  {memory.content}
                </p>
              </div>

              {/* Tags */}
              {memory.ai_tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {memory.ai_tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="text-xs px-3 py-1 rounded-full bg-black text-white"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}