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
  // Type is conveyed by the distinct ICON + badge text; the chip tint stays a single calm
  // brand sage (Polaris: brand tokens only, hierarchy over colour — no amber/sky/violet/rose).
  memory: { icon: FileText, badge: "Memory", tint: "bg-sage/10 text-sage" },
  collection: { icon: FolderHeart, badge: "Collection", tint: "bg-sage/10 text-sage" },
  connection: { icon: Link2, badge: "Connection", tint: "bg-sage/10 text-sage" },
  chapter: { icon: BookMarked, badge: "Chapter", tint: "bg-sage/10 text-sage" },
  person: { icon: Users, badge: "Person", tint: "bg-sage/10 text-sage" },
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
        className="flex min-h-[44px] items-center gap-3 px-3 py-2.5 transition hover:bg-sand/40 active:bg-sand/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sage"
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
