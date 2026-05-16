"use client";

import { useState } from "react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    if (!query) return;

    setLoading(true);

    try {
      const response = await fetch("/api/search", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          query,
        }),
      });

      const data = await response.json();

      console.log("SEARCH RESULTS:", data);

      setResults(data || []);
    } catch (error) {
      console.log("SEARCH ERROR:");
      console.log(error);
    }

    setLoading(false);
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        Semantic Memory Search
      </h1>

      <div className="flex gap-2 mb-6">
        <input
          value={query}
          onChange={(e) =>
            setQuery(e.target.value)
          }
          placeholder="Search memories..."
          className="border p-3 rounded w-full"
        />

        <button
          onClick={handleSearch}
          className="bg-black text-white px-5 rounded"
        >
          Search
        </button>
      </div>

      {loading && (
        <p>Searching memories...</p>
      )}

      <div className="space-y-4">
        {results.map((memory) => (
          <div
            key={memory.id}
            className="border rounded p-4"
          >
            <h2 className="font-bold text-lg">
              {memory.title}
            </h2>

            <p className="text-sm opacity-70 mb-2">
              Similarity Score:
              {" "}
              {memory.similarity?.toFixed(2)}
            </p>

            <p>{memory.content}</p>

            {memory.ai_summary && (
              <div className="mt-3">
                <p className="text-sm font-semibold">
                  AI Summary
                </p>

                <p className="text-sm opacity-80">
                  {memory.ai_summary}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}