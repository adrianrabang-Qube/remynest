"use client";

import { useState } from "react";

type Memory = {
  id: string;
  title: string;
  content: string;
};

export default function EditMemoryModal({
  memory,
  onClose,
  onSave,
}: {
  memory: Memory;
  onClose: () => void;
  onSave: (updated: Memory) => void;
}) {
  const [title, setTitle] = useState(memory.title);
  const [content, setContent] = useState(memory.content);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);

    const res = await fetch(`/api/memories/${memory.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, content }),
    });

    if (!res.ok) {
      alert("Update failed");
      setLoading(false);
      return;
    }

    const updated = await res.json();

    onSave(updated);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold">Edit Memory</h2>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border p-2 rounded"
        />

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full border p-2 rounded"
        />

        <div className="flex justify-end gap-2">
          <button onClick={onClose}>Cancel</button>

          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-1 rounded"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}