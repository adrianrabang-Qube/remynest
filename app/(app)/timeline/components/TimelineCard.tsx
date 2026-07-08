import { CalendarClock } from "lucide-react";

import IntelligenceStrip from "./IntelligenceStrip";
import RelatedMemories from "./RelatedMemories";
import TimelineAttachmentImage from "./TimelineAttachmentImage";
import {
  formatMemoryDateLabel,
  formatAddedDate,
} from "@/lib/memories/memory-date";

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
  created_at: string;
  memory_date?: string | null;
  memory_date_precision?: string | null;

  ai_title?: string;
  ai_summary?: string;
  ai_tags?: string[];
  attachments?: Attachment[];

  ai_mood?: string;
  ai_importance?: string;
  ai_confidence?: number;
  ai_sentiment?: string;
  ai_emotional_weight?: string;

  normalizedCategory?: string;
};

type TimelineCardProps = {
  memory: Memory;
  relatedMemories: Memory[];
  formatCategoryLabel: (
    category: string
  ) => string;
};

function buildMemoryPreview(
  memory: Memory
) {
  const summary =
    memory.ai_summary?.trim();

  if (summary) {
    return summary;
  }

  const normalizedContent =
    memory.content
      ?.replace(/\s+/g, " ")
      .trim();

  if (!normalizedContent) {
    return "No preview available.";
  }

  return normalizedContent.length > 220
    ? `${normalizedContent.slice(
        0,
        220
      )}...`
    : normalizedContent;
}

function buildDisplayTitle(
  memory: Memory
) {
  return (
    memory.ai_title?.trim() ||
    memory.title?.trim() ||
    "Untitled Memory"
  );
}

export default function TimelineCard({
  memory,
  relatedMemories,
  formatCategoryLabel,
}: TimelineCardProps) {
  const preview =
    buildMemoryPreview(memory);

  const displayTitle =
    buildDisplayTitle(memory);

  const normalizedTags = Array.from(
    new Set(
      (memory.ai_tags ?? [])
        .filter(Boolean)
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );

  const memoryDateLabel =
    formatMemoryDateLabel(memory);

  const addedDate = formatAddedDate(
    memory.created_at
  );

  return (
    <details className="group overflow-hidden rounded-3xl border border-sand-deep/70 bg-white shadow-soft transition hover:shadow-soft-lg open:shadow-soft-lg motion-reduce:transition-none">
      <summary className="cursor-pointer list-none p-6 transition-colors group-open:bg-sand/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sage md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="break-words font-serif text-2xl font-semibold leading-tight text-charcoal transition-colors group-hover:text-sage-deep md:text-3xl">
              {displayTitle}
            </h3>

            <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-sage-deep">
              <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="sr-only">Memory date: </span>
              {memoryDateLabel}
            </p>
          </div>

          {memory.normalizedCategory && (
            <span className="shrink-0 whitespace-nowrap rounded-full bg-sand px-4 py-2 text-sm text-charcoal-soft">
              {formatCategoryLabel(
                memory.normalizedCategory
              )}
            </span>
          )}
        </div>

        <p className="mt-6 break-words text-base leading-relaxed text-charcoal-soft md:text-lg">
          {preview}
        </p>

        {Array.isArray(memory.attachments) && memory.attachments.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {memory.attachments.slice(0, 3).map((attachment, index) => {
              const name =
                attachment.name ||
                attachment.filename ||
                "Attachment";

              if (attachment.type === "image" && attachment.url) {
                return (
                  <TimelineAttachmentImage
                    key={index}
                    src={attachment.url}
                    alt={name}
                  />
                );
              }

              const icon =
                attachment.type === "video"
                  ? "🎬"
                  : attachment.type === "audio"
                  ? "🔊"
                  : "📄";

              return (
                <span
                  key={index}
                  className="inline-flex items-center gap-2 rounded-full border border-sand-deep/60 bg-sand/40 px-3 py-2 text-xs text-charcoal-soft"
                >
                  <span>{icon}</span>
                  <span>{name}</span>
                </span>
              );
            })}
          </div>
        )}

        <IntelligenceStrip
          ai_mood={memory.ai_mood}
          ai_importance={
            memory.ai_importance
          }
          ai_sentiment={
            memory.ai_sentiment
          }
          ai_emotional_weight={
            memory.ai_emotional_weight
          }
          ai_confidence={
            memory.ai_confidence
          }
        />
      </summary>

      <div className="border-t border-sand-deep/60 bg-gradient-to-b from-white to-sand/30 px-6 pb-6 md:px-7 md:pb-7">
        <div className="mt-6">
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-charcoal-muted">
            Original Memory
          </h4>

          <p className="whitespace-pre-wrap break-words leading-relaxed text-charcoal-soft">
            {memory.content ||
              "No memory content available."}
          </p>
        </div>

        {normalizedTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-6">
            {normalizedTags.map(
              (tag: string) => (
                <span
                  key={tag}
                  className="rounded-full bg-sage/10 px-3 py-1 text-xs text-sage"
                >
                  #{tag}
                </span>
              )
            )}
          </div>
        )}

        <RelatedMemories
          memories={relatedMemories}
        />

        {/* Added/recorded date — secondary metadata */}
        {addedDate && (
          <p className="mt-6 text-xs text-charcoal-muted">
            Added to RemyNest on {addedDate}
          </p>
        )}
      </div>
    </details>
  );
}
