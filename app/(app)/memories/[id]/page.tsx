import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type Props = {
  params: {
    id: string;
  };
};

export default async function MemoryPage({
  params,
}: Props) {
  const supabase = createClient();

  // 🔐 Get logged in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return notFound();
  }

  // 📦 Fetch memory
  const { data: memory, error } =
    await supabase
      .from("memories")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

  if (error || !memory) {
    return notFound();
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Back */}
      <a
        href="/memories"
        className="text-sm text-gray-500 hover:text-black"
      >
        ← Back to Memories
      </a>

      {/* Card */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-6">
        {/* Title */}
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">
            Memory
          </p>

          <h1 className="text-3xl font-bold break-words">
            {memory.ai_title || memory.title}
          </h1>
        </div>

        {/* Category */}
        {memory.ai_category && (
          <div>
            <span className="inline-flex items-center rounded-full bg-black text-white px-3 py-1 text-xs">
              {memory.ai_category}
            </span>
          </div>
        )}

        {/* Original Content */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-500">
            Original Memory
          </h2>

          <div className="bg-gray-50 rounded-xl p-4 text-gray-700 whitespace-pre-wrap break-words">
            {memory.content}
          </div>
        </div>

        {/* AI Summary */}
        {memory.ai_summary && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-500">
              AI Summary
            </h2>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-gray-700 italic whitespace-pre-wrap break-words">
              {memory.ai_summary}
            </div>
          </div>
        )}

        {/* AI Tags */}
        {memory.ai_tags &&
          memory.ai_tags.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-500">
                AI Tags
              </h2>

              <div className="flex flex-wrap gap-2">
                {memory.ai_tags.map(
                  (
                    tag: string,
                    index: number
                  ) => (
                    <span
                      key={index}
                      className="bg-gray-200 text-sm px-3 py-1 rounded-full"
                    >
                      #{tag}
                    </span>
                  )
                )}
              </div>
            </div>
          )}

        {/* Created Date */}
        <div className="pt-4 border-t text-xs text-gray-400">
          Created{" "}
          {new Date(
            memory.created_at
          ).toLocaleString()}
        </div>
      </div>
    </div>
  );
}