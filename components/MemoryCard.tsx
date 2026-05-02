"use client";

type Memory = {
  id: string;
  title: string;
  content: string;
};

export default function MemoryCard({
  memory,
  onDelete,
  onEdit,
}: {
  memory: Memory;
  onDelete: (id: string) => void;
  onEdit: (memory: Memory) => void;
}) {
  return (
    <div className="p-4 bg-white rounded-xl shadow space-y-2">
      <h2 className="font-semibold text-lg">{memory.title}</h2>
      <p className="text-gray-600">{memory.content}</p>

      <div className="flex gap-3 text-sm mt-2">
        <button
          onClick={() => onEdit(memory)}
          className="text-blue-500"
        >
          Edit
        </button>

        <button
          onClick={async () => {
            await fetch(`/api/memories/${memory.id}`, {
              method: "DELETE",
            });
            onDelete(memory.id);
          }}
          className="text-red-500"
        >
          Delete
        </button>
      </div>
    </div>
  );
}