"use client";

import { useEffect, useState } from "react";
import MemoryCard from "@/components/MemoryCard";
import CreateMemoryModal from "@/components/CreateMemoryModal";
import EditMemoryModal from "@/components/EditMemoryModal";
import { useToast } from "@/components/ToastProvider";

type Memory = {
  id: string;
  title: string;
  content: string;
};

export default function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);

  const { showToast } = useToast();

  // Fetch memories
  useEffect(() => {
    const fetchMemories = async () => {
      const res = await fetch("/api/memories");
      const data = await res.json();
      setMemories(data);
    };

    fetchMemories();
  }, []);

  // Add new memory
  const handleCreated = (memory: Memory) => {
    setMemories((prev) => [memory, ...prev]);
  };

  // Update memory
  const handleUpdated = (updated: Memory) => {
    setMemories((prev) =>
      prev.map((m) => (m.id === updated.id ? updated : m))
    );
  };

  // Delete memory
  const handleDelete = (id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="section">
      <h1>Your Memories</h1>

      <button
        className="btn-primary mt-4"
        onClick={() => setShowCreate(true)}
      >
        + New
      </button>

      <div className="mt-6 space-y-4">
        {memories.map((memory) => (
          <MemoryCard
            key={memory.id}
            memory={memory}
            onDelete={handleDelete}
            showToast={showToast}
          />
        ))}
      </div>

      {/* CREATE MODAL */}
      {showCreate && (
        <CreateMemoryModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
          showToast={showToast}
        />
      )}

      {/* EDIT MODAL */}
      {selectedMemory && (
        <EditMemoryModal
          memory={selectedMemory}
          onClose={() => setSelectedMemory(null)}
          onUpdated={handleUpdated}   // ✅ FIXED NAME
          showToast={showToast}
        />
      )}
    </div>
  );
}