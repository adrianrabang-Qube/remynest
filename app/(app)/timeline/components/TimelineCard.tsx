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
    <details className="group bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md open:shadow-md">
      <summary className="list-none cursor-pointer p-7 transition-colors group-open:bg-gray-50/40">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-4xl font-bold text-gray-900 leading-tight group-hover:text-black transition-colors break-words">
              {displayTitle}
            </h3>

            <p className="mt-3 text-lg font-medium text-sage-deep">
              🕰 Memory Date: {memoryDateLabel}
            </p>
          </div>

          {memory.normalizedCategory && (
            <span className="text-sm px-4 py-2 rounded-full bg-gray-100 text-gray-700 whitespace-nowrap shrink-0">
              {formatCategoryLabel(
                memory.normalizedCategory
              )}
            </span>
          )}
        </div>

        <p className="text-gray-700 mt-8 text-2xl leading-relaxed break-words">
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
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600"
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

      <div className="px-7 pb-7 border-t border-gray-100 bg-gradient-to-b from-white to-gray-50/30">
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Original Memory
          </h4>

          <p className="text-gray-800 whitespace-pre-wrap leading-relaxed break-words">
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
                  className="text-xs px-3 py-1 rounded-full bg-black text-white"
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
          <p className="mt-6 text-xs text-gray-400">
            Added to RemyNest on {addedDate}
          </p>
        )}
      </div>
    </details>
  );
}
