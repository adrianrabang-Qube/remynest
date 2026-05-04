"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import MemoryCard from "@/components/MemoryCard";
import CreateMemoryModal from "@/components/CreateMemoryModal";
import EditMemoryModal from "@/components/EditMemoryModal";

type Memory = {
  id: string;
  title: string;
  content: string;
  created_at: string;
};

export default function MemoriesPage() {
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);

  const { data: memories = [] } = useQuery<Memory[]>({
    queryKey: ["memories"],
    queryFn: async () => {
      const res = await fetch("/api/memories");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      await fetch("/api/memories", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      setShowCreate(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      title,
      content,
    }: {
      id: string;
      title: string;
      content: string;
    }) => {
      await fetch(`/api/memories/${id}`, {
        method: "PUT",
        body: JSON.stringify({ title, content }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      setEditingMemory(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/memories/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
    },
  });

  // =========================
  // SORT (CRITICAL FIX)
  // =========================
  const sortedMemories = [...memories].sort(
    (a, b) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
  );

  // =========================
  // GROUPING
  // =========================
  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  const today: Memory[] = [];
  const thisWeek: Memory[] = [];
  const earlier: Memory[] = [];

  sortedMemories.forEach((memory) => {
    const date = new Date(memory.created_at);

    if (date >= startOfToday) {
      today.push(memory);
    } else if (date >= startOfWeek) {
      thisWeek.push(memory);
    } else {
      earlier.push(memory);
    }
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Your Memories</h1>

      <button
        onClick={() => setShowCreate(true)}
        className="text-blue-600"
      >
        + New Memory
      </button>

      {/* TODAY */}
      {today.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 mb-2">
            Today
          </h2>
          <div className="space-y-4">
            {today.map((memory) => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                onEdit={() => setEditingMemory(memory)}
                onDelete={() => deleteMutation.mutate(memory.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* THIS WEEK */}
      {thisWeek.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 mb-2">
            This Week
          </h2>
          <div className="space-y-4">
            {thisWeek.map((memory) => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                onEdit={() => setEditingMemory(memory)}
                onDelete={() => deleteMutation.mutate(memory.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* EARLIER */}
      {earlier.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 mb-2">
            Earlier
          </h2>
          <div className="space-y-4">
            {earlier.map((memory) => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                onEdit={() => setEditingMemory(memory)}
                onDelete={() => deleteMutation.mutate(memory.id)}
              />
            ))}
          </div>
        </div>
      )}

      {showCreate && (
        <CreateMemoryModal
          onClose={() => setShowCreate(false)}
          onCreate={async (data) => {
            await createMutation.mutateAsync(data);
          }}
        />
      )}

      {editingMemory && (
        <EditMemoryModal
          memory={editingMemory}
          onClose={() => setEditingMemory(null)}
          onUpdate={async (data) => {
            await updateMutation.mutateAsync({
              id: editingMemory.id,
              ...data,
            });
          }}
        />
      )}
    </div>
  );
}