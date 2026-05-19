"use client";

import { useState } from "react";

type Memory = {
  id: string;
  ai_title?: string;
  title?: string;
  ai_summary?: string;
  ai_mood?: string;
  similarity?: number;
};

export default function MemoryChatPage() {
  const [query, setQuery] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [answer, setAnswer] =
    useState("");

  const [memories, setMemories] =
    useState<Memory[]>([]);

  async function handleSearch() {
    if (!query.trim()) return;

    try {
      setLoading(true);

      const response = await fetch(
        "/api/memory-chat",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            query,
          }),
        }
      );

      const data =
        await response.json();

      setAnswer(
        data.answer || ""
      );

      setMemories(
        data.memories || []
      );
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-5xl font-bold text-gray-900">
          RemyNest AI
        </h1>

        <p className="text-gray-500 mt-3 text-lg">
          Conversational semantic
          memory recall.
        </p>
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
        <textarea
          value={query}
          onChange={(e) =>
            setQuery(
              e.target.value
            )
          }
          placeholder="Ask RemyNest about your memories..."
          className="w-full h-32 rounded-2xl border border-gray-200 p-5 outline-none resize-none text-lg"
        />

        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-black text-white px-6 py-3 rounded-2xl font-medium hover:opacity-90 transition"
        >
          {loading
            ? "Thinking..."
            : "Search Memories"}
        </button>
      </div>

      {/* AI Response */}
      {answer && (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 rounded-3xl p-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              AI Recall
            </h2>

            <div className="text-xs bg-black text-white px-3 py-1 rounded-full">
              Cognitive Engine
            </div>
          </div>

          <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-lg">
            {answer}
          </div>
        </div>
      )}

      {/* Related Memories */}
      {memories.length > 0 && (
        <div className="space-y-5">
          <h2 className="text-xl font-bold text-gray-900">
            Retrieved Memories
          </h2>

          <div className="space-y-4">
            {memories.map(
              (memory) => (
                <a
                  key={memory.id}
                  href={`/memories/${memory.id}`}
                  className="block bg-white border border-gray-100 rounded-3xl p-6 hover:border-black transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {memory.ai_title ||
                          memory.title}
                      </h3>

                      <p className="text-gray-600 leading-relaxed">
                        {memory.ai_summary}
                      </p>
                    </div>

                    {memory.ai_mood && (
                      <div className="bg-green-100 text-green-700 text-sm px-3 py-1 rounded-full whitespace-nowrap">
                        {
                          memory.ai_mood
                        }
                      </div>
                    )}
                  </div>

                  {memory.similarity && (
                    <div className="mt-5">
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                        <span>
                          Semantic Match
                        </span>

                        <span>
                          {Math.round(
                            memory.similarity *
                              100
                          )}
                          %
                        </span>
                      </div>

                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                          style={{
                            width: `${Math.round(
                              memory.similarity *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </a>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}