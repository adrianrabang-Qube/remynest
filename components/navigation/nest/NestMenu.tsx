"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { haptic } from "@/lib/haptics";
import { useFocusTrap } from "@/lib/a11y/use-focus-trap";
import Remy, { type RemyVariant } from "@/components/remy/Remy";
import type { RemyEmotion } from "@/lib/remy";
import {
  backdropVariants,
  nestSheetVariants,
  remyEmergeVariants,
  offerListVariants,
  offerItemVariants,
} from "@/components/remy/motion/primitives";

export interface NestMenuItem {
  href: string;
  label: string;
  hint: string;
  Icon: LucideIcon;
}

/**
 * The Nest surface Remy OPENS when greeting — Remy rises, emerges, and OFFERS the actions (they
 * stagger in one by one via framer-motion), so it reads as the companion presenting options, not a
 * system bottom-sheet. Pure presentation over EXISTING routes (no new AI/conversation); every href
 * arrives pre-threaded with `?context=` from the parent, so care-workspace routing is unchanged.
 *
 * PORTAL (required, not cosmetic): the host `MobileBottomNav` has `backdrop-blur-md`, and a
 * non-`none` backdrop-filter establishes the containing block for `position:fixed` descendants on
 * WebKit/iOS — an inline overlay would re-root to the nav box (the documented TestFlight
 * corruption). So the overlay is `createPortal(document.body)`. Focus-trap + Escape + focus-restore
 * + scroll-lock reuse the shared `useFocusTrap` hook; a desktop-breakpoint safety-close avoids a
 * stranded scroll-lock on resize. Motion is centralized in `@/components/remy/motion/primitives`
 * and honours `prefers-reduced-motion` (no enter animation).
 */
export default function NestMenu({
  open,
  items,
  greeting,
  greetingTitle = "How can I help?",
  onDismiss,
  onSelect,
}: {
  open: boolean;
  items: NestMenuItem[];
  greeting: { expression: RemyVariant; emotion?: RemyEmotion };
  greetingTitle?: string;
  onDismiss: () => void;
  onSelect: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  // Focus trap + Escape-to-close + focus restore (shared a11y hook, same as the nav drawer).
  useFocusTrap(open, onDismiss, panelRef);

  // Lock background scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // The sheet is `lg:hidden`; if the viewport grows to the desktop breakpoint while it is open,
    // close it so the overlay hides AND the body scroll-lock is not left stranded.
    const mq = window.matchMedia("(min-width: 1024px)");
    const onBreakpoint = (e: MediaQueryListEvent) => {
      if (e.matches) onDismiss();
    };
    mq.addEventListener("change", onBreakpoint);
    return () => {
      document.body.style.overflow = previousOverflow;
      mq.removeEventListener("change", onBreakpoint);
    };
  }, [open, onDismiss]);

  // Rendered only when open (starts closed), so document.body always exists here and
  // SSR/hydration never evaluates the portal.
  if (!open) return null;

  // Under reduced motion, skip the enter animations entirely (initial === animate).
  const initial = reduce ? false : "hidden";

  return createPortal(
    <div
      className="fixed inset-0 z-[60] lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="How can Remy help?"
    >
      {/* Backdrop — a soft fade, not a hard modal flash. */}
      <motion.button
        type="button"
        aria-label="Close"
        onClick={onDismiss}
        className="absolute inset-0 h-full w-full cursor-default bg-charcoal/40"
        variants={backdropVariants}
        initial={initial}
        animate="visible"
      />

      {/* The Nest surface — Remy opening the Nest (rises + settles), not a menu snapping up.
          This is a COMPANION surface, so it carries the approved Remy identity (deep violet
          #5B3E8E · lavender #8A6BD0 · warm gold #E3A24A) — a soft lavender wash + violet accents,
          scoped to this sheet only (the app-wide sage/sand system is untouched). Focus rings stay
          sage per the authoritative a11y rule. */}
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 mx-auto max-h-[85vh] max-w-md overflow-y-auto rounded-t-3xl bg-gradient-to-b from-[#F5F2FB] to-white px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-soft-lg focus:outline-none"
        variants={nestSheetVariants}
        initial={initial}
        animate="visible"
      >
        {/* Grab handle */}
        <div
          aria-hidden
          className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#8A6BD0]/30"
        />

        <div className="mb-3 flex items-center gap-3 px-1">
          {/* Remy emerges to greet. */}
          <motion.span
            variants={remyEmergeVariants}
            initial={initial}
            animate="visible"
            className="inline-flex"
          >
            <Remy
              state={greeting.expression}
              assetVariant="avatar"
              emotion={greeting.emotion}
              reactionKey="nest-greeting"
              size={44}
              decorative
            />
          </motion.span>
          <div className="min-w-0">
            <p className="font-serif text-lg font-semibold text-charcoal">
              {greetingTitle}
            </p>
            <p className="text-sm text-charcoal-muted">
              Choose what you&apos;d like to do.
            </p>
          </div>
        </div>

        {/* Remy OFFERS the actions — they stagger in one after another. */}
        <motion.nav
          aria-label="Remy actions"
          className="space-y-1.5"
          variants={offerListVariants}
          initial={initial}
          animate="visible"
        >
          {items.map(({ href, label, hint, Icon }) => (
            <motion.div key={label} variants={offerItemVariants}>
              <Link
                href={href}
                onClick={() => {
                  void haptic("light");
                  onSelect();
                }}
                className="flex items-center gap-4 rounded-2xl px-3 py-3 transition hover:bg-[#8A6BD0]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#8A6BD0]/10 text-[#5B3E8E]">
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
            </motion.div>
          ))}
        </motion.nav>
      </motion.div>
    </div>,
    document.body,
  );
}
