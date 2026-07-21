import Link from "next/link";
import { formatMemoryDateLabel } from "@/lib/memories/memory-date";

type RelatedMemory = {
  id: string;
  title: string;
  ai_title?: string;
  created_at: string;
  memory_date?: string | null;
  memory_date_precision?: string | null;

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
      <div className="mb-4 flex items-center justify-between gap-4">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-charcoal-muted">
          Related Memories
        </h4>

        <span className="text-xs text-charcoal-muted">
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

            const memoryDateLabel =
              formatMemoryDateLabel(
                memory
              );

            return (
              <Link
                href={`/memories/${memory.id}`}
                key={memory.id}
                className="group block rounded-2xl border border-sand-deep/60 bg-sand/30 p-4 transition hover:border-sand-deep hover:bg-sand/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-semibold text-charcoal transition-colors group-hover:text-primary-deep">
                      {displayTitle}
                    </p>

                    <p className="mt-1 text-sm font-medium text-primary-deep">
                      {memoryDateLabel}
                    </p>
                  </div>

                  {memory.ai_importance && (
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                      {
                        memory.ai_importance
                      }
                    </span>
                  )}
                </div>

                {memory.ai_category && (
                  <div className="mt-3">
                    <span className="text-xs uppercase tracking-wide text-charcoal-muted">
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
