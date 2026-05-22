import TimelineCard from "./TimelineCard";

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
    <section className="space-y-4">
      <div className="sticky top-0 z-10 bg-[#f5f1e8]/95 backdrop-blur-sm py-2">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-500 uppercase tracking-wide">
            {date}
          </h2>

          <span className="text-sm text-gray-400 whitespace-nowrap">
            {
              normalizedMemories.length
            }{" "}
            memories
          </span>
        </div>
      </div>

      {normalizedMemories.map(
        (memory) => {
          const relatedMemories =
            buildRelatedMemories(
              memory,
              allMemories
            );

          return (
            <TimelineCard
              key={memory.id}
              memory={memory}
              relatedMemories={
                relatedMemories
              }
              formatCategoryLabel={
                formatCategoryLabel
              }
            />
          );
        }
      )}
    </section>
  );
}