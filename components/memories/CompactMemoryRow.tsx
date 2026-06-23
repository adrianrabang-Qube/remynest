"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, FileText, MoreHorizontal } from "lucide-react";

import MemoryGalleryPreview from "@/components/memories/MemoryGalleryPreview";
import { formatMemoryDateLabel } from "@/lib/memories/memory-date";
import { hapticWarning } from "@/lib/haptics";

type RowAttachment = { type?: string; url?: string; fallbackUrl?: string };

export interface MemoryRowData {
  id: string;
  title: string;
  content: string;
  created_at?: string;
  memory_date?: string | null;
  memory_date_precision?: string | null;
  ai_title?: string;
  ai_summary?: string;
  ai_category?: string | null;
  ai_tags?: string[];
  attachments?: RowAttachment[];
}

interface CompactMemoryRowProps {
  memory: MemoryRowData;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * CompactMemoryRow — the mobile memory-feed row (Apple Notes / Gmail style).
 * ~76px: leading thumbnail (or fallback icon) · title + one-line preview ·
 * date · category · attachment count · chevron. The whole row links to the
 * existing memory detail page (full content lives there). Edit/Delete move into
 * an overflow menu so rows stay scannable. Mobile-only — desktop keeps MemoryCard.
 */
export default function CompactMemoryRow({
  memory,
  onEdit,
  onDelete,
}: CompactMemoryRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [thumbErrored, setThumbErrored] = useState(false);

  const title = memory.ai_title || memory.title || "Untitled memory";
  const preview = memory.ai_summary || memory.content || "";

  const thumbAttachment = memory.attachments?.find(
    (a) => a.type === "image" && a.url,
  );
  const thumbnail = thumbAttachment?.url;
  const thumbFallback = thumbAttachment?.fallbackUrl;

  const attachmentCount = memory.attachments?.length ?? 0;
  const hasImages = !!memory.attachments?.some((a) => a.type === "image");
  // Multi-image (or mixed image+video) memories show the condensed photo grid
  // below the row — the same 2 / 3 / 4+ preview as the desktop card, on mobile.
  const gridCount =
    memory.attachments?.filter(
      (a) => a.type === "image" || a.type === "video",
    ).length ?? 0;
  const showGrid = gridCount >= 2;
  const attachmentLabel =
    attachmentCount > 0
      ? `${attachmentCount} ${
          hasImages
            ? attachmentCount === 1
              ? "photo"
              : "photos"
            : attachmentCount === 1
              ? "file"
              : "files"
        }`
      : null;

  const dateLabel = memory.created_at
    ? formatMemoryDateLabel({
        created_at: memory.created_at,
        memory_date: memory.memory_date,
        memory_date_precision: memory.memory_date_precision,
      })
    : null;

  const meta = [dateLabel, memory.ai_category, attachmentLabel]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="relative">
      <Link
        href={`/memories/${memory.id}`}
        className="block py-2.5 pl-3 pr-12 transition active:bg-sand/50"
      >
        <div className="flex items-center gap-3">
          {/* Leading thumbnail/icon — hidden when the photo grid renders below */}
          {!showGrid &&
            (thumbnail ? (
              <div className="relative h-12 w-12 shrink-0">
                <Image
                  src={
                    thumbErrored && thumbFallback ? thumbFallback : thumbnail
                  }
                  alt=""
                  width={48}
                  height={48}
                  unoptimized
                  loading="lazy"
                  onError={() => {
                    if (thumbFallback) setThumbErrored(true);
                  }}
                  className="h-12 w-12 rounded-xl border border-sand-deep/50 object-cover"
                />
              </div>
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sage/10 text-sage">
                <FileText className="h-5 w-5" aria-hidden />
              </div>
            ))}

          {/* Center: title + preview + metadata */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-charcoal">
              {title}
            </p>
            {preview && (
              <p className="truncate text-xs text-charcoal-soft">{preview}</p>
            )}
            {meta && (
              <p className="mt-0.5 truncate text-[11px] text-charcoal-muted">
                {meta}
              </p>
            )}
          </div>

          <ChevronRight
            className="ml-1 h-4 w-4 shrink-0 text-charcoal-muted"
            aria-hidden
          />
        </div>

        {/* Multi-image / mixed-media: condensed photo grid (2 side-by-side ·
            3 large+stacked · 4+ grid with +N), surfaced on the mobile feed.
            Tap → detail's full swipeable gallery. */}
        {showGrid && (
          <div className="mt-2">
            <MemoryGalleryPreview attachments={memory.attachments} />
          </div>
        )}
      </Link>

      {/* Trailing: overflow actions (kept out of the link) */}
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        aria-label={`Actions for ${title}`}
        aria-haspopup="menu"
        className="absolute right-1 top-1/2 flex h-11 w-9 -translate-y-1/2 items-center justify-center rounded-full text-charcoal-muted transition hover:bg-sand/60"
      >
        <MoreHorizontal className="h-5 w-5" aria-hidden />
      </button>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={() => setMenuOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-2 top-12 z-50 w-36 overflow-hidden rounded-xl border border-sand-deep/60 bg-white shadow-xl"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onEdit();
              }}
              className="block w-full px-4 py-2.5 text-left text-sm text-charcoal hover:bg-sand/50"
            >
              Edit
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                void hapticWarning(); // destructive-action feedback (native only)
                setMenuOpen(false);
                onDelete();
              }}
              className="block w-full px-4 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </li>
  );
}
