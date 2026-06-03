"use client";

import Link from "next/link";

const IMAGE_ATTACHMENT_FALLBACK =
  "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 240'%3E%3Crect width='320' height='240' fill='%23f3f4f6'/%3E%3Ctext x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='18' fill='%236b7280'%3EImage unavailable%3C/text%3E%3C/svg%3E";

type Attachment = {
  name?: string;
  filename?: string;
  type?: string;
  url?: string;
  mimeType?: string;
  size?: number;
};

type Memory = {
  id: string;

  title: string;
  content: string;

  created_at?: string;

  ai_title?: string;
  ai_summary?: string;
  ai_tags?: string[];
  attachments?: Attachment[];
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

        {Array.isArray(memory.attachments) && memory.attachments.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {memory.attachments
              .slice(0, 3)
              .map((attachment, index) => {
                const name =
                  attachment.name ||
                  attachment.filename ||
                  "Attachment";

                if (attachment.type === "image" && attachment.url) {
                  return (
                    <img
                      key={index}
                      src={attachment.url}
                      alt={name}
                      onError={(event) => {
                        const target = event.currentTarget;
                        target.onerror = null;
                        target.src = IMAGE_ATTACHMENT_FALLBACK;
                      }}
                      className="h-20 w-full rounded-2xl object-cover border border-gray-200"
                    />
                  );
                }

                const badgeLabel =
                  attachment.type === "video"
                    ? "Video"
                    : attachment.type === "audio"
                    ? "Audio"
                    : "File";

                return (
                  <div
                    key={index}
                    className="flex items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700"
                  >
                    {badgeLabel}
                  </div>
                );
              })}
          </div>
        )}

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