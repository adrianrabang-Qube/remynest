"use client";

import { Bell, MessageCircle, Pencil, Search, Sparkles } from "lucide-react";

import { resolveNestStage, type NestStage } from "@/lib/remy";
import Remy from "@/components/remy/Remy";
import FloatingCompanionButton from "@/components/navigation/FloatingCompanionButton";

import NestMenu, { type NestMenuItem } from "./NestMenu";
import { useNestInteraction } from "./use-nest-interaction";
import styles from "./nest.module.css";

/**
 * The Nest — Remy's persistent HOME in the bottom-nav center. NOT a floating action button and NOT
 * a menu button. Remy RESTS inside the Nest (asleep, gently breathing, soft glow); TAPPING wakes
 * Remy, who peeks out, climbs out, and greets the user — and ONLY THEN presents actions. Choosing
 * an action sends Remy home and the Nest settles back to rest. The interaction with Remy is the
 * feature; the menu is a CONSEQUENCE of Remy's `greeting` behaviour, not a state.
 *
 * The Nest is a living, EVOLVING object: `NestStage` (small → growing → blooming → family →
 * legendary) is resolved from a memory-milestone count and drives the Nest's presence; dedicated
 * per-stage artwork plugs in later with no code change here.
 *
 * PLATFORM INTEGRITY: Remy is drawn ONLY through the single `<Remy>` renderer; the behaviour
 * vocabulary, the wake/return choreography, and the evolution stages all live in the ONE Remy
 * platform (`@/lib/remy`). This component holds NO Remy vocabulary and NO state machine — it plays
 * the platform choreography (`useNestInteraction`) and renders the result. The presented-actions
 * overlay is portaled (WebKit backdrop-blur containing-block invariant). Presentation + routing
 * only; every destination is an EXISTING route threaded with `?context=`.
 */
export interface NestProps {
  remyHref: string;
  memoryHref: string;
  reminderHref: string;
  searchHref: string;
  insightsHref: string;
  /** Memory-milestone count driving Nest evolution (default 0 → Small Nest). Wire to live data later. */
  memoryCount?: number;
}

export default function Nest({
  remyHref,
  memoryHref,
  reminderHref,
  searchHref,
  insightsHref,
  memoryCount = 0,
}: NestProps) {
  const { behavior, look, presentsActions, isWaking, isResting, wake, sendHome, chooseAction } =
    useNestInteraction();

  const stage: NestStage = resolveNestStage(memoryCount);

  const items: NestMenuItem[] = [
    { href: remyHref, label: "Ask Remy", hint: "Talk through a memory", Icon: MessageCircle },
    { href: memoryHref, label: "Add a memory", hint: "Save a moment or photo", Icon: Pencil },
    { href: reminderHref, label: "Add a reminder", hint: "A gentle nudge for later", Icon: Bell },
    { href: searchHref, label: "Search memories", hint: "Find a moment or person", Icon: Search },
    { href: insightsHref, label: "Insights", hint: "See what Remy noticed", Icon: Sparkles },
  ];

  return (
    <>
      <FloatingCompanionButton
        onActivate={wake}
        variant="nest"
        label="Remy's nest — tap to wake Remy"
        isActive={presentsActions}
        className={styles.glow}
      >
        {/* The living Nest: Remy rests inside and wakes on tap. The stage drives the nest's
            presence; re-keying per behaviour replays the one-shot wake motion as Remy stirs,
            peeks, and climbs out. */}
        <span
          key={behavior}
          data-nest-stage={stage}
          className={[styles.nest, isWaking ? styles.wake : ""]
            .filter(Boolean)
            .join(" ")}
        >
          <Remy
            state={look.expression}
            emotion={look.emotion}
            reactionKey={behavior}
            float={isResting}
            size={40}
            decorative
          />
        </span>
      </FloatingCompanionButton>

      {/* The menu is a CONSEQUENCE of Remy greeting — it appears only while Remy presents actions. */}
      <NestMenu
        open={presentsActions}
        items={items}
        greeting={{ expression: look.expression, emotion: look.emotion }}
        onDismiss={sendHome}
        onSelect={chooseAction}
      />
    </>
  );
}
