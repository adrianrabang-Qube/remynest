import Link from "next/link";
import {
  BookMarked,
  ChevronRight,
  FileText,
  FolderHeart,
  Link2,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { SearchHit, SearchHitType } from "./types";

const TYPE_META: Record<
  SearchHitType,
  { icon: LucideIcon; badge: string; tint: string }
> = {
  memory: { icon: FileText, badge: "Memory", tint: "bg-sage/10 text-sage" },
  collection: {
    icon: FolderHeart,
    badge: "Collection",
    tint: "bg-amber-100 text-amber-700",
  },
  connection: {
    icon: Link2,
    badge: "Connection",
    tint: "bg-sky-100 text-sky-700",
  },
  chapter: {
    icon: BookMarked,
    badge: "Chapter",
    tint: "bg-violet-100 text-violet-700",
  },
  person: { icon: Users, badge: "Person", tint: "bg-rose-100 text-rose-700" },
};

/**
 * SearchResultRow — one ~72px global-search result: leading type icon · title +
 * one-line preview · type badge + metadata · chevron. The whole row is a single
 * link (≥44px tap target) to the canonical destination for that hit.
 */
export default function SearchResultRow({ hit }: { hit: SearchHit }) {
  const { icon: Icon, badge, tint } = TYPE_META[hit.type];
  const sub = [badge, hit.meta].filter(Boolean).join(" · ");

  return (
    <li>
      <Link
        href={hit.href}
        className="flex min-h-[44px] items-center gap-3 px-2 py-2.5 transition hover:bg-sand/40 active:bg-sand/50"
      >
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tint}`}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-charcoal">
            {hit.title}
          </p>
          {hit.preview && (
            <p className="truncate text-xs text-charcoal-soft">{hit.preview}</p>
          )}
          <p className="mt-0.5 truncate text-[11px] text-charcoal-muted">
            {sub}
          </p>
        </div>

        <ChevronRight
          className="h-4 w-4 shrink-0 text-charcoal-muted"
          aria-hidden
        />
      </Link>
    </li>
  );
}
