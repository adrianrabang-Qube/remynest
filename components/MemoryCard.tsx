"use client";

import Image from "next/image";
import { useState } from "react";
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
  const [imageError, setImageError] =
    useState<Record<number, boolean>>({});

  return (
    <Link href={`/memories/${memory.id}`}>
      <div className="rounded-3xl border border-sand-deep/70 p-5 mb-4 bg-white shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 transition overflow-hidden cursor-pointer">
        {/* Title */}
        <h3 className="font-semibold text-lg text-charcoal break-words whitespace-pre-wrap">
          {memory.ai_title || memory.title}
        </h3>

        {/* Content */}
        <p className="text-sm text-charcoal-soft mt-1 mb-2 break-words whitespace-pre-wrap">
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
                    <Image
                      key={index}
                      src={
                        imageError[index]
                          ? IMAGE_ATTACHMENT_FALLBACK
                          : attachment.url
                      }
                      alt={name}
                      width={96}
                      height={80}
                      unoptimized
                      onError={() => {
                        setImageError((prev) => ({
                          ...prev,
                          [index]: true,
                        }));
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
                className="text-xs bg-sage/10 text-sage px-2.5 py-1 rounded-full break-words"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 text-sm pt-1">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit();
            }}
            className="font-medium text-sage hover:text-sage-deep"
          >
            Edit
          </button>

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            className="font-medium text-rose-500/80 hover:text-rose-600"
          >
            Delete
          </button>
        </div>
      </div>
    </Link>
  );
}