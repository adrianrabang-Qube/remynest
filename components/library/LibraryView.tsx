"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookHeart,
  Sparkles,
  Clock,
  Compass,
  ScrollText,
  BookOpen,
  ChevronRight,
  Search,
  Puzzle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface LibrarySection {
  key: string;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

/**
 * The Library destinations. Collections/Connections/Chapters keep their own
 * routes; Story/Biography/Memory Book have dedicated /library/* routes;
 * Remy's Activities (2026-07-13) is the activities-platform home.
 */
const SECTIONS: LibrarySection[] = [
  { key: "activities", label: "Remy's Activities", description: "Memory puzzles and other gentle ways to enjoy your photos", href: "/activities", icon: Puzzle },
  { key: "collections", label: "Collections", description: "Themed groups of related memories", href: "/collections", icon: BookHeart },
  { key: "connections", label: "Connections", description: "Memories that connect to each other", href: "/connections", icon: Sparkles },
  { key: "chapters", label: "Chapters", description: "The periods that shaped your life", href: "/chapters", icon: Clock },
  { key: "story", label: "Story", description: "A guided walk through your story", href: "/library/story", icon: Compass },
  { key: "biography", label: "Biography", description: "Your life as a readable document", href: "/library/biography", icon: ScrollText },
  { key: "memory-book", label: "Memory Book", description: "Your biography as a bound book", href: "/library/memory-book", icon: BookOpen },
];

const CHIPS = [{ key: "all", label: "All" }, ...SECTIONS.map((s) => ({ key: s.key, label: s.label }))];

/**
 * Library hub — the single discovery surface. One search box + a horizontal
 * sticky filter-chip row + compact destination rows (reusing the platform's
 * CompactRow pattern). Mobile-first; desktop just doesn't apply the `max-md:`
 * sticky styling.
 */
export default function LibraryView() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const q = query.trim().toLowerCase();
  const visible = SECTIONS.filter((section) => {
    const matchesChip = filter === "all" || section.key === filter;
    const matchesQuery =
      !q ||
      section.label.toLowerCase().includes(q) ||
      section.description.toLowerCase().includes(q);
    return matchesChip && matchesQuery;
  });

  return (
    <div className="space-y-4">
      {/* Sticky search + filter chips on mobile */}
      <div className="space-y-3 max-md:sticky max-md:top-[calc(3.5rem_+_env(safe-area-inset-top))] max-md:z-20 max-md:-mx-4 max-md:bg-sand/95 max-md:px-4 max-md:py-2 max-md:backdrop-blur">
        <label className="flex items-center gap-2 rounded-full border border-sand-deep/70 bg-white px-4 py-2.5 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary">
          <Search className="h-4 w-4 shrink-0 text-charcoal-muted" aria-hidden />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your library…"
            aria-label="Search the library"
            className="w-full bg-transparent text-base text-charcoal outline-none placeholder:text-charcoal-muted"
          />
        </label>

        <div
          role="tablist"
          aria-label="Library filters"
          className="flex gap-2 overflow-x-auto px-1 py-1 max-md:flex-nowrap md:flex-wrap"
        >
          {CHIPS.map((chip) => {
            const active = filter === chip.key;
            return (
              <button
                key={chip.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(chip.key)}
                className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  active
                    ? "bg-primary text-white"
                    : "border border-sand-deep/70 bg-white text-charcoal-soft hover:bg-sand/50"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Destination rows */}
      {visible.length > 0 ? (
        <ul className="divide-y divide-sand-deep/40 overflow-hidden rounded-3xl border border-sand-deep/60 bg-white shadow-soft">
          {visible.map((section) => {
            const Icon = section.icon;
            return (
              <li key={section.key}>
                <Link
                  href={section.href}
                  className="flex items-center gap-3 px-3 py-3 transition hover:bg-sand/40 active:bg-sand/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-charcoal">
                      {section.label}
                    </p>
                    <p className="truncate text-xs text-charcoal-soft">
                      {section.description}
                    </p>
                  </div>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-charcoal-muted"
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
          <p className="text-sm text-charcoal-muted">
            No library sections match your search.
          </p>
        </div>
      )}
    </div>
  );
}
