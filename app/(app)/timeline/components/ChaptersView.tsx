import LifeChapterCard from "./LifeChapterCard";

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

  ai_importance?: string;
  ai_emotional_weight?: string;
};

type LifeChapter = {
  id: string;
  title: string;
  summary: string;
  memoryCount: number;
  startDate?: string;
  endDate?: string;
  themes: string[];
};

type ChaptersViewProps = {
  memories: Memory[];
};

function formatChapterTitle(category: string) {
  return (
    category
      .split(" ")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() +
          word.slice(1)
      )
      .join(" ") +
    " Chapter"
  );
}

function extractThemes(memories: Memory[]) {
  return Array.from(
    new Set(
      memories.flatMap(
        (memory) => memory.ai_tags || []
      )
    )
  )
    .filter(Boolean)
    .slice(0, 6);
}

function buildChapterSummary(memories: Memory[], category: string) {
  const themes = extractThemes(memories);

  return `Your ${category} chapter reflects recurring experiences, evolving patterns, and connected memories$${''}`.replace('$${\'\'}',
    themes.length > 0
      ? ` across themes like ${themes.join(", ")}.`
      : "."
  );
}

function calculateChapterScore(memories: Memory[]) {
  // Placeholder: could be improved with AI scoring, importance, etc.
  return memories.length;
}

function buildLifeChapters(memories: Memory[]): LifeChapter[] {
  const grouped: Record<string, Memory[]> = memories.reduce(
    (acc, memory) => {
      const category = memory.normalizedCategory || "uncategorized";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(memory);
      return acc;
    },
    {} as Record<string, Memory[]>
  );

  return Object.entries(grouped)
    .map(([category, memories]) => {
      const sortedMemories = [...memories].sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
      );
      const firstMemory = sortedMemories[0];
      const lastMemory = sortedMemories[sortedMemories.length - 1];
      return {
        id: category,
        title: formatChapterTitle(category),
        summary: buildChapterSummary(memories, category),
        memoryCount: memories.length,
        startDate: firstMemory?.created_at,
        endDate: lastMemory?.created_at,
        themes: extractThemes(memories),
        score: calculateChapterScore(memories),
      };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ score: _score, ...chapter }) => {
      void _score;
      return chapter;
    });
}

export default function ChaptersView({ memories }: ChaptersViewProps) {
  const chapters = buildLifeChapters(memories);

  if (chapters.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-3xl p-10 shadow-sm">
        <p className="text-gray-500">
          No life chapters available yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {chapters.map((chapter) => (
        <LifeChapterCard
          key={chapter.id}
          chapter={chapter}
        />
      ))}
    </div>
  );
}