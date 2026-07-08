"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Bell, MessageCircle, Pencil } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { haptic } from "@/lib/haptics";
import { useFocusTrap } from "@/lib/a11y/use-focus-trap";
import Remy from "@/components/remy/Remy";
import FloatingCompanionButton from "@/components/navigation/FloatingCompanionButton";

/**
 * Remy — the central interaction point (Project Polaris).
 *
 * Replaces the generic green "+" FAB. Tapping Remy no longer means "add"; it means "I want
 * help" — it opens a calm, portaled action sheet with the existing destinations. Every route
 * is unchanged (memory creation, reminders, Ask Remy); this is presentation only, and it wires
 * up NO deferred AI/conversation — it simply routes to surfaces that already exist.
 *
 * PORTAL (required, not cosmetic): the host `MobileBottomNav` has `backdrop-blur-md`, and a
 * non-`none` backdrop-filter establishes the containing block for `position:fixed` descendants
 * on WebKit/iOS. An inline sheet would re-root to the nav box; so the overlay is rendered via
 * createPortal(document.body) — the same invariant the WorkspaceSelector drawer follows.
 */

interface ActionItem {
  href: string;
  label: string;
  hint: string;
  Icon: LucideIcon;
}

export default function RemyActionButton({
  memoryHref,
  reminderHref,
  remyHref,
}: {
  memoryHref: string;
  reminderHref: string;
  remyHref: string;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = () => setOpen(false);

  // Focus trap + Escape-to-close + focus restore (shared a11y hook, same as the nav drawer).
  useFocusTrap(open, close, panelRef);

  // Lock background scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Safety: the button + overlay are `lg:hidden`, so if the viewport grows to the desktop
    // breakpoint while the sheet is open (e.g. a desktop window resize), close it — otherwise
    // the overlay hides but the body scroll-lock would be left stranded.
    const mq = window.matchMedia("(min-width: 1024px)");
    const onBreakpoint = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false);
    };
    mq.addEventListener("change", onBreakpoint);
    return () => {
      document.body.style.overflow = previousOverflow;
      mq.removeEventListener("change", onBreakpoint);
    };
  }, [open]);

  const items: ActionItem[] = [
    {
      href: remyHref,
      label: "Ask Remy",
      hint: "Talk through a memory",
      Icon: MessageCircle,
    },
    {
      href: memoryHref,
      label: "Add a memory",
      hint: "Save a moment or photo",
      Icon: Pencil,
    },
    {
      href: reminderHref,
      label: "Add a reminder",
      hint: "A gentle nudge for later",
      Icon: Bell,
    },
  ];

  return (
    <>
      <FloatingCompanionButton
        onActivate={() => setOpen(true)}
        variant="nest"
        label="Remy — ask for help"
        isActive={open}
      >
        <Remy state="welcome" size={40} decorative />
      </FloatingCompanionButton>

      {/* Rendered only after a client click (open starts false), so document.body always
          exists here and SSR/hydration never evaluates the portal. Portaled to document.body
          because the host nav has backdrop-blur (see file header). */}
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="How can Remy help?"
          >
            {/* Backdrop */}
            <button
              type="button"
              aria-label="Close"
              onClick={close}
              className="absolute inset-0 h-full w-full cursor-default bg-charcoal/40"
            />

            {/* Bottom sheet */}
            <div
              ref={panelRef}
              tabIndex={-1}
              className="absolute inset-x-0 bottom-0 mx-auto max-h-[85vh] max-w-md overflow-y-auto rounded-t-3xl bg-white px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-soft-lg focus:outline-none"
            >
              {/* Grab handle */}
              <div
                aria-hidden
                className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-sand-deep"
              />

              <div className="mb-3 flex items-center gap-3 px-1">
                <Remy state="happy" size={44} decorative />
                <div className="min-w-0">
                  <p className="font-serif text-lg font-semibold text-charcoal">
                    How can I help?
                  </p>
                  <p className="text-sm text-charcoal-muted">
                    Choose what you&apos;d like to do.
                  </p>
                </div>
              </div>

              <nav aria-label="Remy actions" className="space-y-1.5">
                {items.map(({ href, label, hint, Icon }) => (
                  <Link
                    key={label}
                    href={href}
                    onClick={() => {
                      void haptic("light");
                      close();
                    }}
                    className="flex items-center gap-4 rounded-2xl px-3 py-3 transition hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sand text-sage">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[17px] font-medium text-charcoal">
                        {label}
                      </span>
                      <span className="block text-sm text-charcoal-muted">
                        {hint}
                      </span>
                    </span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
