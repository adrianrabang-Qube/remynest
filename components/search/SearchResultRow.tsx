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
export default function SearchResultRow({
  hit,
  onReport,
}: {
  hit: SearchHit;
  /** LA5.1: report a shared memory (only wired when hit.reportableMemoryId is set). */
  onReport?: (memoryId: string, title: string) => void;
}) {
  const { icon: Icon, badge, tint } = TYPE_META[hit.type];
  const sub = [badge, hit.meta].filter(Boolean).join(" · ");
  const reportable = Boolean(hit.reportableMemoryId && onReport);

  // The row body (icon · title/preview · type). Shared between the navigational and
  // the non-navigational (reportable) variants.
  const body = (
    <>
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tint}`}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-charcoal">{hit.title}</p>
        {hit.preview && (
          <p className="truncate text-xs text-charcoal-soft">{hit.preview}</p>
        )}
        <p className="mt-0.5 truncate text-[11px] text-charcoal-muted">{sub}</p>
      </div>
    </>
  );

  return (
    // The row body and the (optional) Report button are SIBLINGS — a button is never
    // nested inside a link (keeps tap targets + a11y clean).
    <li className="flex items-center">
      {reportable ? (
        // A care memory authored by SOMEONE ELSE: its detail page is user_id-scoped
        // (would 404), so the body is NOT a navigational link — only Report is actionable.
        <div className="flex min-h-[44px] flex-1 items-center gap-3 px-3 py-2.5">
          {body}
        </div>
      ) : (
        <Link
          href={hit.href}
          className="flex min-h-[44px] flex-1 items-center gap-3 px-3 py-2.5 transition hover:bg-sand/40 active:bg-sand/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sage"
        >
          {body}
          <ChevronRight
            className="h-4 w-4 shrink-0 text-charcoal-muted"
            aria-hidden
          />
        </Link>
      )}

      {reportable && (
        <button
          type="button"
          onClick={() => onReport!(hit.reportableMemoryId!, hit.title)}
          className="mr-2 inline-flex min-h-11 shrink-0 items-center rounded-full border border-sand-deep/60 px-3 text-xs font-medium text-charcoal-soft transition hover:bg-sand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
          aria-label={`Report "${hit.title}"`}
        >
          Report
        </button>
      )}
    </li>
  );
}
