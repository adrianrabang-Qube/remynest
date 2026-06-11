"use client";

import { useState } from "react";
import MemoryDateField from "@/components/memories/MemoryDateField";
import {
  selectionFromMemoryDate,
  type ResolvedMemoryDate,
} from "@/lib/memories/memory-date";

type Memory = {
  id: string;
  title: string;
  content: string;
  memory_date?: string | null;
  memory_date_precision?: string | null;
};

export default function EditMemoryModal({
  memory,
  onClose,
  onUpdate,
}: {
  memory: Memory;
  onClose: () => void;
  onUpdate: (data: {
    title: string;
    content: string;
    memoryDate: string | null;
    memoryDatePrecision: string;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState(memory.title);
  const [content, setContent] = useState(memory.content);
  const [memoryDate, setMemoryDate] =
    useState<ResolvedMemoryDate>({
      memoryDate: memory.memory_date ?? null,
      precision:
        (memory.memory_date_precision as
          | ResolvedMemoryDate["precision"]
          | undefined) ?? "day",
    });
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    await onUpdate({
      title,
      content,
      memoryDate: memoryDate.memoryDate,
      memoryDatePrecision: memoryDate.precision,
    });
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-6 rounded w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold">Edit Memory</h2>

        <input
          className="border p-2 w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="border p-2 w-full"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <MemoryDateField
          initial={selectionFromMemoryDate(
            memory.memory_date,
            memory.memory_date_precision
          )}
          onChange={setMemoryDate}
        />

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-black text-white px-4 py-2"
          >
            {loading ? "Updating..." : "Update"}
          </button>

          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}