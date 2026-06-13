import TimelineCard from "./TimelineCard";
import TimelineRow from "./TimelineRow";

type Memory = {
  id: string;
  title: string;
  content: string;
  created_at: string;

  ai_title?: string;
  ai_summary?: string;
  ai_category?: string;
  ai_tags?: string[];

  normalizedCategory?: string;

  ai_mood?: string;
  ai_importance?: string;
  ai_confidence?: number;
  ai_sentiment?: string;
  ai_emotional_weight?: string;
};

type TimelineDayGroupProps = {
  date: string;
  memories: Memory[];
  allMemories: Memory[];
  formatCategoryLabel: (
    category: string
  ) => string;
};

function buildRelatedMemories(
  memory: Memory,
  allMemories: Memory[]
) {
  const relatedMemories =
    allMemories.filter(
      (related) => {
        if (
          related.id === memory.id
        ) {
          return false;
        }

        if (
          !memory.normalizedCategory
        ) {
          return false;
        }

        return (
          related.normalizedCategory ===
          memory.normalizedCategory
        );
      }
    );

  return relatedMemories
    .sort((a, b) => {
      return (
        new Date(
          b.created_at
        ).getTime() -
        new Date(
          a.created_at
        ).getTime()
      );
    })
    .slice(0, 3);
}

export default function TimelineDayGroup({
  date,
  memories,
  allMemories,
  formatCategoryLabel,
}: TimelineDayGroupProps) {
  const normalizedMemories =
    memories.filter(Boolean);

  if (
    normalizedMemories.length === 0
  ) {
    return null;
  }

  return (
    <section className="space-y-4 max-md:space-y-2">
      <div className="sticky top-0 z-10 bg-[#f5f1e8]/95 backdrop-blur-sm py-2 max-md:top-[12.5rem] max-md:py-1.5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-500 uppercase tracking-wide max-md:text-xs max-md:font-semibold">
            {date}
          </h2>

          <span className="text-sm text-gray-400 whitespace-nowrap max-md:text-[11px]">
            {normalizedMemories.length} memories
          </span>
        </div>
      </div>

      {/* Mobile: compact rows */}
      <ul className="md:hidden overflow-hidden rounded-2xl border border-sand-deep/60 bg-white divide-y divide-sand-deep/40">
        {normalizedMemories.map((memory) => (
          <TimelineRow
            key={memory.id}
            memory={memory}
            formatCategoryLabel={formatCategoryLabel}
          />
        ))}
      </ul>

      {/* Desktop: existing cards — unchanged */}
      <div className="hidden space-y-4 md:block">
        {normalizedMemories.map((memory) => {
          const relatedMemories = buildRelatedMemories(memory, allMemories);

          return (
            <TimelineCard
              key={memory.id}
              memory={memory}
              relatedMemories={relatedMemories}
              formatCategoryLabel={formatCategoryLabel}
            />
          );
        })}
      </div>
    </section>
  );
}