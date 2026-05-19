"use client";

import { useState } from "react";

interface Memory {
  id: string;
  title: string;
  content: string;
  ai_summary: string;
  ai_mood: string;
  ai_importance: string;
  ai_sentiment: string;
  similarity: number;
}

export default function MemoryChatPage() {
  const [query, setQuery] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [answer, setAnswer] =
    useState("");

  const [memories, setMemories] =
    useState<Memory[]>([]);

  const handleSearch = async () => {
    if (!query.trim()) return;

    try {
      setLoading(true);

      setAnswer("");

      setMemories([]);

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

      console.log(
        "🧠 MEMORY CHAT RESPONSE:"
      );

      console.log(data);

      setAnswer(data.answer);

      setMemories(
        data.memories || []
      );

    } catch (error) {

      console.log(
        "❌ MEMORY CHAT ERROR:"
      );

      console.log(error);

    } finally {

      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f1e8] p-8">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}

        <div className="mb-10">
          <h1 className="text-4xl font-bold text-[#2f3b2f]">
            Memory Chat
          </h1>

          <p className="text-gray-600 mt-2">
            Ask RemyNest to
            recall memories using
            semantic cognition.
          </p>
        </div>

        {/* SEARCH */}

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 mb-8">

          <div className="flex gap-4">

            <input
              type="text"
              value={query}
              onChange={(e) =>
                setQuery(
                  e.target.value
                )
              }
              placeholder="Ask something like: What workouts have I been doing recently?"
              className="flex-1 border border-gray-300 rounded-xl px-4 py-4 text-lg outline-none focus:border-black"
            />

            <button
              onClick={
                handleSearch
              }
              disabled={loading}
              className="bg-black text-white px-8 py-4 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {loading
                ? "Thinking..."
                : "Ask"}
            </button>
          </div>
        </div>

        {/* AI ANSWER */}

        {answer && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 mb-8">

            <h2 className="text-2xl font-bold text-[#2f3b2f] mb-4">
              AI Recall
            </h2>

            <div className="text-gray-800 leading-8 whitespace-pre-wrap text-lg">
              {answer}
            </div>
          </div>
        )}

        {/* RELATED MEMORIES */}

        {memories.length > 0 && (
          <div>

            <h2 className="text-2xl font-bold text-[#2f3b2f] mb-6">
              Retrieved Memories
            </h2>

            <div className="space-y-6">

              {memories.map(
                (memory) => (
                  <div
                    key={memory.id}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200"
                  >

                    <div className="flex items-center justify-between mb-4">

                      <h3 className="text-xl font-bold text-[#2f3b2f]">
                        {memory.title}
                      </h3>

                      <div className="bg-black text-white text-sm px-3 py-1 rounded-full">
                        {Math.round(
                          memory.similarity *
                            100
                        )}
                        % Match
                      </div>
                    </div>

                    <p className="text-gray-700 mb-4 leading-7">
                      {
                        memory.content
                      }
                    </p>

                    <div className="bg-[#f8fafc] border border-gray-200 rounded-xl p-4 mb-4">

                      <div className="text-sm text-gray-500 mb-2 uppercase tracking-wide">
                        AI Summary
                      </div>

                      <div className="text-gray-700 italic">
                        {
                          memory.ai_summary
                        }
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">

                      <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                        Mood:{" "}
                        {
                          memory.ai_mood
                        }
                      </div>

                      <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                        Importance:{" "}
                        {
                          memory.ai_importance
                        }
                      </div>

                      <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">
                        Sentiment:{" "}
                        {
                          memory.ai_sentiment
                        }
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* EMPTY STATE */}

        {!answer &&
          memories.length ===
            0 &&
          !loading && (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-200">

              <h3 className="text-2xl font-bold text-[#2f3b2f] mb-3">
                Cognitive Recall Ready
              </h3>

              <p className="text-gray-600 text-lg">
                Ask questions about
                your memories,
                experiences,
                routines,
                emotions,
                relationships,
                workouts,
                timelines,
                or life events.
              </p>
            </div>
          )}
      </div>
    </div>
  );
}