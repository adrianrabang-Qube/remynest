import Image from "next/image";
import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";

import { formatMemoryDateLabel } from "@/lib/memories/memory-date";

type Attachment = { type?: string; url?: string };

export type TimelineRowMemory = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  memory_date?: string | null;
  memory_date_precision?: string | null;
  ai_title?: string;
  ai_summary?: string;
  normalizedCategory?: string;
  attachments?: Attachment[];
};

interface TimelineRowProps {
  memory: TimelineRowMemory;
  formatCategoryLabel: (category: string) => string;
}

/**
 * TimelineRow — the mobile chronological feed row (~76px). Leading thumbnail or
 * icon · title + one-line preview · date · category · chevron. Links to the
 * existing memory detail page, where the full content, attachments, AI
 * intelligence and related memories live. Mobile-only — desktop keeps
 * TimelineCard. No information is deleted, only relocated to detail.
 */
export default function TimelineRow({
  memory,
  formatCategoryLabel,
}: TimelineRowProps) {
  const title = memory.ai_title?.trim() || memory.title?.trim() || "Untitled Memory";
  const preview =
    memory.ai_summary?.trim() ||
    memory.content?.replace(/\s+/g, " ").trim() ||
    "";

  const thumbnail = memory.attachments?.find(
    (a) => a.type === "image" && a.url,
  )?.url;

  const dateLabel = formatMemoryDateLabel(memory);
  const category = memory.normalizedCategory
    ? formatCategoryLabel(memory.normalizedCategory)
    : null;
  const meta = [dateLabel, category].filter(Boolean).join(" · ");

  return (
    <li>
      <Link
        href={`/memories/${memory.id}`}
        className="flex items-center gap-3 py-2.5 pl-3 pr-3 transition hover:bg-sand/40 active:bg-sand/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sage"
      >
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt=""
            width={48}
            height={48}
            unoptimized
            className="h-12 w-12 shrink-0 rounded-xl border border-sand-deep/50 object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sage/10 text-sage">
            <FileText className="h-5 w-5" aria-hidden />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-charcoal">{title}</p>
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
          className="h-4 w-4 shrink-0 text-charcoal-muted"
          aria-hidden
        />
      </Link>
    </li>
  );
}
