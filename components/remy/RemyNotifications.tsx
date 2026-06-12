"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  RemyNotification,
  RemyNotificationCategory,
} from "@/lib/remy/notifications";

const DEFAULT_VISIBLE = 3;

const CATEGORY_ICON: Record<RemyNotificationCategory, string> = {
  "memory-date": "🕰",
  collection: "🗂️",
  connection: "✨",
  chapter: "📖",
  family: "👪",
};

/**
 * Remy Updates — synthesized intelligence notifications. A compact dashboard
 * card that previews the 3 most important updates and expands in-place (the same
 * interaction pattern as Remy Activity). Hidden entirely when there's nothing to
 * surface.
 */
export default function RemyNotifications({
  notifications,
}: {
  notifications: RemyNotification[];
}) {
  const [expanded, setExpanded] = useState(false);

  if (notifications.length === 0) return null;

  const hasMore = notifications.length > DEFAULT_VISIBLE;
  const visible = expanded
    ? notifications
    : notifications.slice(0, DEFAULT_VISIBLE);

  return (
    <section className="rounded-3xl border border-sand-deep/70 bg-white p-4 md:p-6 shadow-soft">
      <h2 className="text-lg font-semibold text-charcoal">Remy Updates</h2>

      <ul className="mt-4 space-y-1">
        {visible.map((n) => (
          <li key={n.id}>
            <Link
              href={n.href}
              className="flex items-start gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-sand/40"
            >
              <span aria-hidden="true" className="mt-0.5 text-lg leading-none">
                {CATEGORY_ICON[n.category]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-charcoal break-words">
                  {n.title}
                </p>
                <p className="text-sm text-charcoal-soft break-words">
                  {n.message}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-3 w-full rounded-2xl px-3 py-2 text-left text-sm font-semibold text-sage-deep transition hover:bg-sand/40 sm:w-auto"
        >
          {expanded ? "Show less" : "Show more →"}
        </button>
      )}
    </section>
  );
}
