"use client";

type Memory = {
  id: string;

  title: string;
  content: string;

  created_at?: string;

  ai_title?: string;
  ai_summary?: string;
  ai_tags?: string[];
};

export default function MemoryCard({
  memory,
  onEdit,
  onDelete,
}: {
  memory: Memory;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="border rounded-xl p-4 mb-4 bg-white shadow-sm hover:shadow-md transition">
      {/* Title */}
      <h3 className="font-semibold text-lg">
        {memory.ai_title || memory.title}
      </h3>

      {/* Content */}
      <p className="text-sm text-gray-600 mb-2">
        {memory.content}
      </p>

      {/* AI Summary */}
      {memory.ai_summary && (
        <p className="text-xs text-gray-500 italic mb-2">
          {memory.ai_summary}
        </p>
      )}

      {/* AI Tags */}
      {memory.ai_tags && memory.ai_tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {memory.ai_tags.map((tag, i) => (
            <span
              key={i}
              className="text-xs bg-gray-200 px-2 py-1 rounded-full"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4 text-sm">
        <button
          onClick={onEdit}
          className="text-blue-500 hover:underline"
        >
          Edit
        </button>

        <button
          onClick={onDelete}
          className="text-red-500 hover:underline"
        >
          Delete
        </button>
      </div>
    </div>
  );
}