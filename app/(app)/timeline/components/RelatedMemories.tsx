import Link from "next/link";

type RelatedMemory = {
  id: string;
  title: string;
  ai_title?: string;
  created_at: string;

  ai_category?: string;
  ai_importance?: string;
};

type RelatedMemoriesProps = {
  memories: RelatedMemory[];
};

function buildDisplayTitle(
  memory: RelatedMemory
) {
  return (
    memory.ai_title?.trim() ||
    memory.title?.trim() ||
    "Untitled Memory"
  );
}

function buildFormattedDate(
  createdAt: string
) {
  const parsedDate =
    new Date(createdAt);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return "Unknown date";
  }

  return parsedDate.toLocaleDateString(
    "en-IE",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

export default function RelatedMemories({
  memories,
}: RelatedMemoriesProps) {
  const normalizedMemories =
    Array.from(
      new Map(
        memories
          .filter(Boolean)
          .map((memory) => [
            memory.id,
            memory,
          ])
      ).values()
    );

  if (
    normalizedMemories.length === 0
  ) {
    return null;
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Related Memories
        </h4>

        <span className="text-xs text-gray-400">
          {
            normalizedMemories.length
          }{" "}
          linked
        </span>
      </div>

      <div className="space-y-3">
        {normalizedMemories.map(
          (memory) => {
            const displayTitle =
              buildDisplayTitle(
                memory
              );

            const formattedDate =
              buildFormattedDate(
                memory.created_at
              );

            return (
              <Link
                href={`/memories/${memory.id}`}
                key={memory.id}
                className="group block bg-gray-50 rounded-2xl p-4 border border-gray-100 hover:bg-gray-100 hover:scale-[1.01] hover:border-gray-200 transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 break-words group-hover:text-black transition-colors">
                      {displayTitle}
                    </p>

                    <p className="text-sm text-gray-500 mt-1">
                      {formattedDate}
                    </p>
                  </div>

                  {memory.ai_importance && (
                    <span className="text-xs px-2 py-1 rounded-full bg-black text-white whitespace-nowrap shrink-0">
                      {
                        memory.ai_importance
                      }
                    </span>
                  )}
                </div>

                {memory.ai_category && (
                  <div className="mt-3">
                    <span className="text-xs text-gray-400 uppercase tracking-wide">
                      {
                        memory.ai_category
                      }
                    </span>
                  </div>
                )}
              </Link>
            );
          }
        )}
      </div>
    </div>
  );
}