import RemyAvatar from "@/components/remy/RemyAvatar";

/** Join phrases naturally: ["a","b","c"] → "a, b and c". */
function joinNatural(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/**
 * AskRemy — the understanding layer that sits above search results. Remy frames
 * the result set in its own voice (template-only, deterministic — no AI, no LLM,
 * no embeddings). Search stays fully functional below; this is Remy's read on
 * what was found.
 */
export default function AskRemy({
  query,
  loading,
  memories,
  library,
  people,
  total,
}: {
  query: string;
  loading: boolean;
  memories: number;
  library: number;
  people: number;
  total: number;
}) {
  let text: string;
  if (loading) {
    text = "Remy is looking through your memories…";
  } else if (total === 0) {
    text = `Remy couldn't find anything for “${query}” yet.`;
  } else {
    const parts: string[] = [];
    if (memories > 0) {
      parts.push(`${memories} ${memories === 1 ? "memory" : "memories"}`);
    }
    if (library > 0) parts.push(`${library} in your library`);
    if (people > 0) {
      parts.push(`${people} ${people === 1 ? "person" : "people"}`);
    }
    text = `Remy found ${joinNatural(parts)} for “${query}”.`;
  }

  return (
    <div className="mb-3 flex items-center gap-2.5 rounded-2xl border border-sand-deep/70 bg-gradient-to-b from-primary/5 to-white px-3 py-2.5">
      <RemyAvatar size="sm" />
      <p className="min-w-0 flex-1 text-sm text-charcoal-soft">{text}</p>
    </div>
  );
}
