"use client";

import { useState } from "react";
import Link from "next/link";
import type { MemoryBook } from "@/lib/remy/memory-book";

/**
 * Remy Memory Book — a book PREVIEW (not export/print/share). A cover, a table
 * of contents, and a chapter navigator: pick a chapter from the contents to read
 * it. Mobile responsive; no nested scrolling; hidden when there's no book.
 */
export default function RemyMemoryBook({
  book,
}: {
  book: MemoryBook | null;
}) {
  const [activeId, setActiveId] = useState(
    book?.sections[0]?.id ?? ""
  );

  if (!book || book.sections.length === 0) return null;

  const active =
    book.sections.find((s) => s.id === activeId) ?? book.sections[0];

  return (
    <section className="overflow-hidden rounded-3xl border border-sand-deep/70 bg-white shadow-soft">
      {/* Cover */}
      <header className="border-b border-sand-deep/60 bg-gradient-to-br from-primary/[0.10] to-sand/50 p-6 sm:p-8 max-md:p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-deep">
          Memory Book
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-charcoal sm:text-4xl max-md:text-2xl">
          {book.cover.title}
        </h2>
        {book.cover.subtitle && (
          <p className="mt-1 text-sm font-medium uppercase tracking-wide text-charcoal-muted">
            {book.cover.subtitle}
          </p>
        )}
        <Link
          href="/memory-book/print"
          className="mt-4 inline-flex items-center rounded-full border border-primary/40 bg-white px-4 py-2 text-sm font-semibold text-primary-deep transition hover:bg-primary/10"
        >
          Export as PDF →
        </Link>
      </header>

      <div className="grid gap-0 md:grid-cols-[14rem_1fr]">
        {/* Table of Contents — chapter navigation */}
        <nav className="border-b border-sand-deep/60 p-4 max-md:p-3 md:border-b-0 md:border-r">
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-charcoal-muted">
            Contents
          </p>
          {/* Mobile: a single horizontal-scroll chip row. Desktop: vertical sidebar. */}
          <ul className="mt-2 flex gap-1 md:flex-col max-md:flex-nowrap max-md:overflow-x-auto max-md:pb-1">
            {book.tableOfContents.map((entry) => {
              const isActive = entry.anchor === active.id;
              return (
                <li key={entry.anchor}>
                  <button
                    type="button"
                    onClick={() => setActiveId(entry.anchor)}
                    aria-current={isActive ? "true" : undefined}
                    className={`rounded-xl px-3 py-2 text-left text-sm transition max-md:shrink-0 max-md:whitespace-nowrap ${
                      isActive
                        ? "bg-primary/15 font-semibold text-primary-deep"
                        : "text-charcoal-soft hover:bg-sand/40"
                    }`}
                  >
                    <span className="text-charcoal-muted">{entry.number}.</span>{" "}
                    {entry.title}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Active chapter */}
        <article className="p-6 sm:p-8 max-md:p-4">
          <h3 className="text-2xl font-semibold text-charcoal max-md:text-lg">
            {active.title}
          </h3>

          {active.chapters && active.chapters.length > 0 ? (
            <div className="mt-4 space-y-6">
              {active.chapters.map((chapter) => (
                <div key={chapter.id}>
                  <h4 className="font-semibold text-charcoal">
                    {chapter.number}. {chapter.title}
                  </h4>
                  {chapter.paragraphs.map((paragraph, index) => (
                    <p
                      key={index}
                      className="mt-1 text-[16px] leading-relaxed text-charcoal-soft break-words"
                    >
                      {paragraph}
                    </p>
                  ))}
                  {chapter.href && (
                    <Link
                      href={chapter.href}
                      className="mt-1 inline-flex items-center text-sm font-semibold text-primary-deep underline-offset-2 hover:underline"
                    >
                      Open chapter →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {active.paragraphs.map((paragraph, index) => (
                <p
                  key={index}
                  className="text-[16px] leading-relaxed text-charcoal-soft break-words"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          )}

          {active.href && (
            <Link
              href={active.href}
              className="mt-5 inline-flex items-center text-sm font-semibold text-primary-deep underline-offset-2 hover:underline"
            >
              Explore →
            </Link>
          )}
        </article>
      </div>
    </section>
  );
}
