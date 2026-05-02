"use client";

import { useState } from "react";
import { TOAST_MESSAGES } from "@/lib/toastMessages";

export default function CreateMemoryModal({
  onClose,
  onCreated,
  showToast,
}: {
  onClose: () => void;
  onCreated: (memory: any) => void;
  showToast: (message: string, type?: "success" | "error") => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);

    const res = await fetch("/api/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      showToast(err?.error || TOAST_MESSAGES.ERROR_GENERIC, "error");
      setLoading(false);
      return;
    }

    const newMemory = await res.json();

    onCreated(newMemory);
    showToast(TOAST_MESSAGES.MEMORY_CREATED);

    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
      <div className="card w-full max-w-md">
        <h2>Create Memory</h2>

        <input
          className="input mt-3"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="input mt-3"
          placeholder="Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "Saving..." : "Save"}
          </button>

          <button onClick={onClose} className="text-gray-500">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}