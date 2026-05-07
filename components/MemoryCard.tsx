"use client";

import Link from "next/link";

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
    <Link href={`/memories/${memory.id}`}>
      <div className="border rounded-xl p-4 mb-4 bg-white shadow-sm hover:shadow-md transition overflow-hidden cursor-pointer">
        {/* Title */}
        <h3 className="font-semibold text-lg break-words whitespace-pre-wrap">
          {memory.ai_title || memory.title}
        </h3>

        {/* Content */}
        <p className="text-sm text-gray-600 mb-2 break-words whitespace-pre-wrap">
          {memory.content}
        </p>

        {/* AI Summary */}
        {memory.ai_summary && (
          <p className="text-xs text-gray-500 italic mb-2 break-words whitespace-pre-wrap">
            {memory.ai_summary}
          </p>
        )}

        {/* AI Tags */}
        {memory.ai_tags && memory.ai_tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {memory.ai_tags.map((tag, i) => (
              <span
                key={i}
                className="text-xs bg-gray-200 px-2 py-1 rounded-full break-words"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 text-sm">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit();
            }}
            className="text-blue-500 hover:underline"
          >
            Edit
          </button>

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            className="text-red-500 hover:underline"
          >
            Delete
          </button>
        </div>
      </div>
    </Link>
  );
}