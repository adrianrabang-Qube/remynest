"use client";

import Link from "next/link";
import { CalendarClock } from "lucide-react";
import {
  formatMemoryDateLabel,
  formatAddedDate,
} from "@/lib/memories/memory-date";
import MemoryGalleryPreview from "@/components/memories/MemoryGalleryPreview";

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
  memory_date?: string | null;
  memory_date_precision?: string | null;

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
  const memoryDateLabel = memory.created_at
    ? formatMemoryDateLabel({
        created_at: memory.created_at,
        memory_date: memory.memory_date,
        memory_date_precision: memory.memory_date_precision,
      })
    : null;

  const addedDate = formatAddedDate(memory.created_at);

  return (
    <Link
      href={`/memories/${memory.id}`}
      className="block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-sand"
    >
      <div className="rounded-3xl border border-sand-deep/70 p-5 mb-4 bg-white shadow-soft transition hover:shadow-soft-lg hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 overflow-hidden cursor-pointer">
        {/* Title */}
        <h3 className="font-semibold text-lg text-charcoal break-words whitespace-pre-wrap">
          {memory.ai_title || memory.title}
        </h3>

        {/* Primary date — when the memory happened */}
        {memoryDateLabel && (
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary-deep">
            <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="sr-only">Memory date: </span>
            {memoryDateLabel}
          </p>
        )}

        {/* Content */}
        <p className="text-sm text-charcoal-soft mt-1 mb-2 break-words whitespace-pre-wrap">
          {memory.content}
        </p>

        {Array.isArray(memory.attachments) &&
          memory.attachments.length > 0 && (
            <MemoryGalleryPreview
              attachments={memory.attachments}
            />
          )}

        {/* AI Summary */}
        {memory.ai_summary && (
          <p className="text-xs text-charcoal-muted italic mb-2 break-words whitespace-pre-wrap">
            {memory.ai_summary}
          </p>
        )}

        {/* AI Tags */}
        {memory.ai_tags && memory.ai_tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {memory.ai_tags.map((tag, i) => (
              <span
                key={i}
                className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full break-words"
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
            className="font-medium text-primary hover:text-primary-deep"
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

        {/* Added/recorded date — secondary metadata */}
        {addedDate && (
          <p className="mt-3 text-[11px] text-charcoal-muted">
            Added to RemyNest on {addedDate}
          </p>
        )}
      </div>
    </Link>
  );
}