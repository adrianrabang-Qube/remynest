"use client";

import { useState } from "react";
import { TOAST_MESSAGES } from "@/lib/toastMessages";

type Memory = {
  id: string;
  title: string;
  content: string;
};

export default function MemoryCard({
  memory,
  onDelete,
  showToast,
}: {
  memory: Memory;
  onDelete: (id: string) => void;
  showToast: (message: string, type?: "success" | "error") => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);

    const res = await fetch(`/api/memories/${memory.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      showToast(err?.error || TOAST_MESSAGES.ERROR_GENERIC, "error");
      setLoading(false);
      return;
    }

    onDelete(memory.id);
    showToast(TOAST_MESSAGES.MEMORY_DELETED);

    setLoading(false);
  };

  return (
    <div className="card transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-xl">
      <h3>{memory.title}</h3>
      <p>{memory.content}</p>

      <div className="flex gap-4 mt-3">
        <button className="text-blue-500 hover:underline">
          Edit
        </button>

        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-red-500 hover:underline"
        >
          {loading ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}