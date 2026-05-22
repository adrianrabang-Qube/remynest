import IntelligenceStrip from "./IntelligenceStrip";
import RelatedMemories from "./RelatedMemories";

type Memory = {
  id: string;
  title: string;
  content: string;
  created_at: string;

  ai_title?: string;
  ai_summary?: string;
  ai_tags?: string[];

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

  const formattedTime =
    new Date(
      memory.created_at
    ).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <details className="group bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md open:shadow-md">
      <summary className="list-none cursor-pointer p-7 transition-colors group-open:bg-gray-50/40">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-4xl font-bold text-gray-900 leading-tight group-hover:text-black transition-colors break-words">
              {displayTitle}
            </h3>

            <p className="text-gray-400 mt-3 text-lg">
              {formattedTime}
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
      </div>
    </details>
  );
}