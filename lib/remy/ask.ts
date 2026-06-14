/**
 * Remy Ask V1 — a deterministic intent ROUTER. Remy's first interactive entry
 * point at the end of the pipeline:
 *
 *   … → Coach → Ask
 *
 * NOT AI, NOT a chatbot, NOT semantic search / RAG / embeddings / retrieval. It
 * is a fixed registry of supported intents (real app destinations) plus a
 * deterministic keyword resolver. It creates nothing and learns nothing.
 *
 * Resolver behavior: the query is lowercased, punctuation is flattened to
 * spaces, and each keyword is matched as a WHOLE word/phrase (token-bounded) —
 * so "facebook" does not match "book" and "history" does not match "story". The
 * FIRST intent (in registry order, specific → generic) with a matching keyword
 * wins. No substring/fuzzy/semantic matching, no scoring, no ranking. An empty
 * or unrecognized query → null (the UI shows the fixed "doesn't know" message).
 */
export interface RemyIntent {
  id: string;
  label: string;
  href: string;
  keywords: string[];
}

export interface RemyAsk {
  intents: RemyIntent[];
}

const INTENTS: RemyIntent[] = [
  {
    id: "new-memory",
    label: "Add a memory",
    href: "/memories/new",
    keywords: [
      "add a memory",
      "add memory",
      "new memory",
      "create memory",
      "capture a memory",
    ],
  },
  {
    id: "memory-dates",
    label: "Add memory dates",
    href: "/memory-dates",
    keywords: ["memory dates", "add dates", "dates"],
  },
  {
    id: "memory-book",
    label: "Open the memory book",
    href: "/library/memory-book",
    keywords: ["memory book", "keepsake"],
  },
  {
    id: "biography",
    label: "Read the biography",
    href: "/library/biography",
    keywords: ["biography", "life document"],
  },
  {
    id: "story",
    label: "Show my story",
    href: "/library/story",
    keywords: ["story", "life story"],
  },
  {
    id: "timeline",
    label: "Open my timeline",
    href: "/timeline",
    keywords: ["timeline", "life journey", "journey", "history"],
  },
  {
    id: "chapters",
    label: "Life chapters",
    href: "/chapters",
    keywords: ["chapters", "chapter", "decades", "periods", "eras"],
  },
  {
    id: "collections",
    label: "Browse collections",
    href: "/collections",
    keywords: ["collections", "collection", "themes", "topics"],
  },
  {
    id: "connections",
    label: "View connections",
    href: "/connections",
    keywords: ["connections", "connection", "related"],
  },
  {
    id: "people",
    label: "See people",
    href: "/profiles",
    keywords: ["people", "profiles", "profile", "family"],
  },
  {
    id: "reminders",
    label: "Open reminders",
    href: "/reminders",
    keywords: ["reminders", "reminder"],
  },
  {
    id: "search",
    label: "Search",
    href: "/search",
    keywords: ["search", "find"],
  },
  {
    id: "memories",
    label: "View memories",
    href: "/memories",
    keywords: ["memories", "all memories", "my memories"],
  },
  {
    id: "library",
    label: "Open the library",
    href: "/library",
    keywords: ["library"],
  },
];

/** The registry of supported intents (real destinations only). */
export function buildRemyAsk(): RemyAsk {
  return { intents: INTENTS };
}

/**
 * Resolve a free-text request to a supported intent via deterministic
 * whole-word/phrase keyword matching. First match in registry order wins;
 * empty/unknown → null. No substring, fuzzy or semantic matching, no AI.
 */
export function resolveRemyIntent(query: string): RemyIntent | null {
  const normalized = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return null;

  const padded = ` ${normalized} `;
  for (const intent of INTENTS) {
    for (const keyword of intent.keywords) {
      if (padded.includes(` ${keyword} `)) return intent;
    }
  }
  return null;
}
