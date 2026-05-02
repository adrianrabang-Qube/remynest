"use client";

import { useEffect, useState } from "react";
import MemoryCard from "@/components/MemoryCard";
import EditMemoryModal from "@/components/EditMemoryModal";
import CreateMemoryModal from "@/components/CreateMemoryModal";

type Memory = {
  id: string;
  title: string;
  content: string;
};

export default function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/memories")
      .then((res) => res.json())
      .then((data) => setMemories(data));
  }, []);

  const handleDelete = (id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  const handleUpdate = (updated: Memory) => {
    setMemories((prev) =>
      prev.map((m) => (m.id === updated.id ? updated : m))
    );
  };

  const handleCreate = (created: Memory) => {
    setMemories((prev) => [created, ...prev]);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Your Memories</h1>

        <button
          onClick={() => setCreating(true)}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          + New
        </button>
      </div>

      <div className="space-y-4">
        {memories.map((memory) => (
          <MemoryCard
            key={memory.id}
            memory={memory}
            onDelete={handleDelete}
            onEdit={(m) => setEditingMemory(m)}
          />
        ))}
      </div>

      {editingMemory && (
        <EditMemoryModal
          memory={editingMemory}
          onClose={() => setEditingMemory(null)}
          onSave={handleUpdate}
        />
      )}

      {creating && (
        <CreateMemoryModal
          onClose={() => setCreating(false)}
          onCreate={(created) => {
            handleCreate(created);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}