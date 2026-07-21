import Image from "next/image";
import Link from "next/link";
import { formatMemoryDateLabel } from "@/lib/memories/memory-date";
import type { ReminiscenceMemory } from "@/lib/remy/reminiscence";

/**
 * A calm, image-forward reminiscence card with large tap targets and generous
 * type — designed for caregivers and family revisiting memories together.
 */
export default function ReminiscenceCard({
  memory,
}: {
  memory: ReminiscenceMemory;
}) {
  const title =
    memory.ai_title?.trim() || memory.title?.trim() || "A memory";
  const dateLabel = formatMemoryDateLabel(memory);
  const summary =
    memory.ai_summary?.trim() ||
    (memory.content ?? "").trim().slice(0, 180) ||
    "";
  const imageUrl = resolveImageUrl(memory);

  return (
    <Link
      href={`/memories/${memory.id}`}
      className="flex min-h-[140px] flex-col overflow-hidden rounded-3xl border border-sand-deep/70 bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-soft-lg"
    >
      {imageUrl && (
        <div className="relative h-48 w-full bg-sand/40">
          <Image
            src={imageUrl}
            alt={title}
            fill
            unoptimized
            className="object-cover"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col p-6">
        <p className="text-base font-semibold text-primary-deep">
          🕰 {dateLabel}
        </p>
        <h3 className="mt-1 text-2xl font-semibold leading-tight text-charcoal break-words">
          {title}
        </h3>
        {summary && (
          <p className="mt-3 text-lg leading-relaxed text-charcoal-soft break-words">
            {summary}
            {(memory.ai_summary?.trim() ? "" : (memory.content ?? "").length > 180 ? "…" : "")}
          </p>
        )}
      </div>
    </Link>
  );
}

function resolveImageUrl(memory: ReminiscenceMemory): string | null {
  if (memory.cover_image_url) return memory.cover_image_url;
  if (Array.isArray(memory.attachments)) {
    for (const a of memory.attachments) {
      if (
        a &&
        typeof a === "object" &&
        (a as { type?: string }).type === "image" &&
        (a as { url?: string }).url
      ) {
        return (a as { url?: string }).url as string;
      }
    }
  }
  return null;
}
