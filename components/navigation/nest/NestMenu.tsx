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
 * The Nest ACTION MENU — design-bible board 07 (2026-07-21, operator-directed; supersedes the
 * bottom-sheet presentation): Remy pops out to the CENTRE of the screen over a soft sand wash,
 * greets in a speech bubble, and the actions orbit him in a fluid circle, staggering in one by
 * one. Pure presentation over EXISTING routes (no new AI/conversation); every href arrives
 * pre-threaded with `?context=` from the parent, so care-workspace routing is unchanged. The
 * menu is still a CONSEQUENCE of the `greeting` behaviour (`presentsActions`) — no menu state.
 *
 * PORTAL (required, not cosmetic): the host `MobileBottomNav` has `backdrop-blur-md`, and a
 * non-`none` backdrop-filter establishes the containing block for `position:fixed` descendants
 * on WebKit/iOS — an inline overlay would re-root to the nav box (the documented TestFlight
 * corruption). So the overlay is `createPortal(document.body)`. Focus-trap + Escape +
 * focus-restore + scroll-lock reuse the shared `useFocusTrap` hook; a desktop-breakpoint
 * safety-close avoids a stranded scroll-lock on resize. Motion is centralized in
 * `@/components/remy/motion/primitives` and honours `prefers-reduced-motion` (no enter
 * animation).
 */

/** Compact display labels for the orbit ring (a11y keeps the FULL label + hint). */
const SHORT_LABEL: Record<string, string> = {
  "Ask Remy": "Ask Remy",
  "Add a memory": "Add memory",
  "Record a voice memory": "Voice memory",
  "Add a reminder": "Reminder",
  "Search memories": "Search",
  Insights: "Insights",
};

/**
 * Six fixed orbit positions (percent of the ring box; centres, offset by -50% transforms),
 * starting at 12 o'clock and going clockwise — radius 42% of the box.
 */
const ORBIT: Array<{ left: string; top: string }> = [
  { left: "50%", top: "8%" },
  { left: "86.4%", top: "29%" },
  { left: "86.4%", top: "71%" },
  { left: "50%", top: "92%" },
  { left: "13.6%", top: "71%" },
  { left: "13.6%", top: "29%" },
];

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

  // Lock background scroll while the menu is open.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // The menu is `lg:hidden`; if the viewport grows to the desktop breakpoint while it is
    // open, close it so the overlay hides AND the body scroll-lock is not left stranded.
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
      {/* Light sand wash (board 07: the page fades to cream, never a dark modal flash). */}
      <motion.button
        type="button"
        aria-label="Close"
        onClick={onDismiss}
        className="absolute inset-0 h-full w-full cursor-default bg-sand/90"
        variants={backdropVariants}
        initial={initial}
        animate="visible"
      />

      {/* Remy centre-stage with the actions orbiting him (companion remy.* palette). */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 pb-[env(safe-area-inset-bottom)] focus:outline-none"
      >
        {/* Speech-bubble greeting (board frame 3: "Remy pops out and says hello"). */}
        <motion.div
          variants={remyEmergeVariants}
          initial={initial}
          animate="visible"
          className="pointer-events-none max-w-[20rem] rounded-3xl bg-white px-5 py-3 text-center shadow-soft-lg ring-1 ring-remy-lavender/25"
        >
          <p className="font-serif text-lg font-semibold text-charcoal">{greetingTitle}</p>
          <p className="mt-0.5 text-sm text-charcoal-muted">Choose what you&apos;d like to do.</p>
        </motion.div>

        {/* The orbit: Remy in the middle, six actions in a fluid circle around him.
            POSITIONING vs MOTION: the shared variants animate `transform` (y/scale), which
            would clobber Tailwind centering translates on the same element — so plain outer
            spans own the absolute position + -50% centering, and the motion elements INSIDE
            them own the animation. */}
        <div className="relative h-[320px] w-[320px] max-h-[86vw] max-w-[86vw]">
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <motion.span
              variants={remyEmergeVariants}
              initial={initial}
              animate="visible"
              className="block"
            >
              <Remy
                state={greeting.expression}
                assetVariant="avatar"
                emotion={greeting.emotion}
                reactionKey="nest-greeting"
                size={150}
                decorative
              />
            </motion.span>
          </span>

          <motion.nav
            aria-label="Remy actions"
            variants={offerListVariants}
            initial={initial}
            animate="visible"
          >
            {items.map(({ href, label, hint, Icon }, index) => {
              const pos = ORBIT[index % ORBIT.length];
              return (
                <span
                  key={label}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: pos.left, top: pos.top }}
                >
                  <motion.div variants={offerItemVariants}>
                  <Link
                    href={href}
                    aria-label={`${label} — ${hint}`}
                    onClick={() => {
                      void haptic("light");
                      onSelect();
                    }}
                    className="flex w-20 flex-col items-center gap-1 rounded-2xl p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-primary shadow-soft-lg ring-1 ring-remy-lavender/30 transition active:scale-95">
                      <Icon className="h-6 w-6" aria-hidden />
                    </span>
                    <span className="text-center text-[11px] font-medium leading-tight text-charcoal">
                      {SHORT_LABEL[label] ?? label}
                    </span>
                  </Link>
                  </motion.div>
                </span>
              );
            })}
          </motion.nav>
        </div>
      </div>
    </div>,
    document.body,
  );
}
