"use client";

import { Bell, MessageCircle, Pencil, Search, Sparkles } from "lucide-react";

import Remy from "@/components/remy/Remy";
import FloatingCompanionButton from "@/components/navigation/FloatingCompanionButton";

import NestMenu, { type NestMenuItem } from "./NestMenu";
import { useNestInteraction } from "./use-nest-interaction";
import styles from "./nest.module.css";

/**
 * The Nest — the bottom-nav center interaction hub (evolves the Polaris-Pass-1 RemyActionButton
 * sheet). The center slot is no longer a "+" FAB or a static speed-dial: Remy REST­S inside the
 * nest (idle breathing + soft glow), and tapping wakes Remy through a calm peek → pop → greet
 * sequence, after which Remy "presents" the menu. Choosing an action returns Remy to the nest.
 *
 * PRESENTATION + ROUTING ONLY. Every destination is an EXISTING route, threaded with the caller's
 * `?context=` (care-workspace routing unchanged). No deferred AI/conversation is built. Remy is
 * drawn ONLY through the single `<Remy>` renderer (never a hardcoded <img>); the menu overlay is
 * portaled (WebKit containing-block invariant). The interaction phases live in a LOCAL FSM
 * (`useNestInteraction`) — not a second Remy brain/provider/registry (platform one-of-each rule).
 *
 * FUTURE-READY: the FSM already defines Listening/Thinking/Processing/Celebrate states mapped to
 * real expressions, and the hook exposes an `onPhaseChange` seam — voice / AI / celebrations wire
 * in later by triggering those states, with no rewrite here.
 */
export interface NestProps {
  remyHref: string;
  memoryHref: string;
  reminderHref: string;
  searchHref: string;
  insightsHref: string;
}

export default function Nest({
  remyHref,
  memoryHref,
  reminderHref,
  searchHref,
  insightsHref,
}: NestProps) {
  const { phase, visual, isMenuOpen, isWaking, open, dismiss, select } =
    useNestInteraction();

  const items: NestMenuItem[] = [
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
    {
      href: searchHref,
      label: "Search memories",
      hint: "Find a moment or person",
      Icon: Search,
    },
    {
      href: insightsHref,
      label: "Insights",
      hint: "See what Remy noticed",
      Icon: Sparkles,
    },
  ];

  return (
    <>
      <FloatingCompanionButton
        onActivate={open}
        variant="nest"
        label="Remy — ask for help"
        isActive={isMenuOpen}
        className={styles.glow}
      >
        {/* Re-keyed per expression so the one-shot wake animation replays as Remy peeks/pops. */}
        <span
          key={visual.expression}
          className={isWaking ? styles.wake : undefined}
        >
          <Remy
            state={visual.expression}
            emotion={visual.emotion}
            reactionKey={visual.expression}
            float={phase === "idle"}
            size={40}
            decorative
          />
        </span>
      </FloatingCompanionButton>

      <NestMenu
        open={isMenuOpen}
        items={items}
        greeting={{ expression: visual.expression, emotion: visual.emotion }}
        onDismiss={dismiss}
        onSelect={select}
      />
    </>
  );
}
