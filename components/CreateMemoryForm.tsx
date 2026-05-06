"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateMemoryForm() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);

      const response = await fetch("/api/memories/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content,
        }),
      });

      if (!response.ok) {
        alert("Failed to create memory");
        return;
      }

      setTitle("");
      setContent("");

      router.refresh();

      alert("✅ Memory saved");
    } catch (error) {
      console.log(error);

      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4"
    >
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Create Memory
        </h2>

        <p className="text-gray-500 text-sm mt-1">
          Save something important.
        </p>
      </div>

      <input
        type="text"
        placeholder="Memory title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none"
      />

      <textarea
        placeholder="Write your memory..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={5}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none resize-none"
      />

      <button
        type="submit"
        disabled={loading}
        className="bg-black text-white px-5 py-3 rounded-xl hover:opacity-90 transition"
      >
        {loading ? "Saving..." : "Save Memory"}
      </button>
    </form>
  );
}