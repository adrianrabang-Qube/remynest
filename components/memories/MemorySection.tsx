"use client";

import MemoryCard from "@/components/MemoryCard";
import CompactMemoryRow, {
  type MemoryRowData,
} from "@/components/memories/CompactMemoryRow";

interface MemorySectionProps<T extends MemoryRowData> {
  label: string;
  memories: T[];
  onEdit: (memory: T) => void;
  onDelete: (id: string) => void;
}

/**
 * A grouped memory section. Mobile (< md) renders a dense divided list of
 * CompactMemoryRows under a sticky header; desktop (md+) keeps the existing
 * MemoryCard stack unchanged. Generic over the caller's memory type so the
 * edit handler hands back the full record (not just the row's subset).
 */
export default function MemorySection<T extends MemoryRowData>({
  label,
  memories,
  onEdit,
  onDelete,
}: MemorySectionProps<T>) {
  if (memories.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal-muted max-md:sticky max-md:top-[calc(6.75rem_+_env(safe-area-inset-top))] max-md:z-10 max-md:mb-0 max-md:bg-sand/95 max-md:py-2 max-md:backdrop-blur">
        {label}
      </h2>

      {/* Mobile: compact rows */}
      <ul className="overflow-hidden rounded-2xl border border-sand-deep/60 bg-white divide-y divide-sand-deep/40 md:hidden">
        {memories.map((memory) => (
          <CompactMemoryRow
            key={memory.id}
            memory={memory}
            onEdit={() => onEdit(memory)}
            onDelete={() => onDelete(memory.id)}
          />
        ))}
      </ul>

      {/* Desktop: existing cards — unchanged */}
      <div className="hidden space-y-4 md:block">
        {memories.map((memory) => (
          <MemoryCard
            key={memory.id}
            memory={memory}
            onEdit={() => onEdit(memory)}
            onDelete={() => onDelete(memory.id)}
          />
        ))}
      </div>
    </section>
  );
}
