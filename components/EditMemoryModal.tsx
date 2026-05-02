"use client";

import { useState } from "react";
import { TOAST_MESSAGES } from "@/lib/toastMessages";

export default function EditMemoryModal({
  memory,
  onClose,
  onUpdated,
  showToast,
}: {
  memory: any;
  onClose: () => void;
  onUpdated: (memory: any) => void;
  showToast: (message: string, type?: "success" | "error") => void;
}) {
  const [title, setTitle] = useState(memory.title);
  const [content, setContent] = useState(memory.content);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    setLoading(true);

    const res = await fetch(`/api/memories/${memory.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      showToast(err?.error || TOAST_MESSAGES.ERROR_GENERIC, "error");
      setLoading(false);
      return;
    }

    const updated = await res.json();

    onUpdated(updated);
    showToast(TOAST_MESSAGES.MEMORY_UPDATED);

    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
      <div className="card w-full max-w-md">
        <h2>Edit Memory</h2>

        <input
          className="input mt-3"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="input mt-3"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleUpdate}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "Saving..." : "Update"}
          </button>

          <button onClick={onClose} className="text-gray-500">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}