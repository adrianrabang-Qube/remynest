"use client";

import { useEffect, useState } from "react";
import { Bell, MessageCircle, Pencil, Search, Sparkles } from "lucide-react";

import {
  resolveNestStage,
  resolveTimeOfDay,
  isNightTime,
  greetingForTimeOfDay,
  type NestStage,
  type TimeOfDay,
} from "@/lib/remy";
import Remy from "@/components/remy/Remy";
import FloatingCompanionButton from "@/components/navigation/FloatingCompanionButton";

import NestMenu, { type NestMenuItem } from "./NestMenu";
import { useNestInteraction } from "./use-nest-interaction";
import styles from "./nest.module.css";

/**
 * The Nest — Remy's persistent, LIVING HOME in the bottom-nav center. Not a floating action
 * button and not a menu button. Remy rests inside the Nest (asleep at night, calm by day) with
 * ambient life — a soft glow, drifting motes, and breathing. Tapping wakes Remy, who peeks out,
 * climbs out, and greets the user (time-appropriately) — and ONLY THEN offers actions. Choosing an
 * action sends Remy home; the Nest settles back to rest. The interaction with Remy is the feature;
 * the menu is a CONSEQUENCE of Remy's `greeting` behaviour, not a state.
 *
 * The Nest is a living, EVOLVING object: `NestStage` (tiny → cozy → family → golden → memory-tree →
 * sanctuary) is resolved from a REAL memory-milestone count threaded from the app shell, and the
 * ambient lighting shifts with the local `TimeOfDay` (moonlight at night). Dedicated per-stage
 * artwork plugs in later with no code change here.
 *
 * PLATFORM INTEGRITY: Remy is drawn ONLY through the single `<Remy>` renderer; the behaviour,
 * choreography, evolution, and time-of-day vocabulary all live in the ONE Remy platform
 * (`@/lib/remy`). This component holds NO Remy vocabulary and NO state machine — it plays the
 * platform choreography (`useNestInteraction`) and renders the result. Presentation + routing only;
 * every destination is an EXISTING route threaded with `?context=`.
 */
export interface NestProps {
  remyHref: string;
  memoryHref: string;
  reminderHref: string;
  searchHref: string;
  insightsHref: string;
  /** REAL memory-milestone count driving Nest evolution (from the app shell; default 0 → Tiny Nest). */
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

  // Time of day is computed on the CLIENT after mount (SSR/hydration-safe): the first render
  // matches the server, then the effect settles the real local time. Refreshed every 10 min so a
  // long-open session still transitions (e.g. evening → night) without a reload.
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("morning");
  useEffect(() => {
    const update = () => setTimeOfDay(resolveTimeOfDay(new Date()));
    update();
    const id = setInterval(update, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  const night = isNightTime(timeOfDay);

  const stage: NestStage = resolveNestStage(memoryCount);

  // At rest, Remy's LOOK follows the time of day — asleep at night, calm-awake by day. Mid-
  // interaction (wake → greet → return) the behaviour's own look drives the expression.
  const restingExpression = night ? "sleeping" : "idle";
  const displayExpression = isResting ? restingExpression : look.expression;
  const displayEmotion = isResting ? undefined : look.emotion;

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
        className={night ? styles.glowNight : styles.glow}
      >
        {/* The living Nest: ambient motes drift behind Remy; the stage + time of day drive the
            halo/lighting; re-keying per behaviour replays the one-shot wake motion. */}
        <span
          key={behavior}
          data-nest-stage={stage}
          data-time-of-day={timeOfDay}
          className={[styles.nest, isWaking ? styles.wake : ""]
            .filter(Boolean)
            .join(" ")}
        >
          <span aria-hidden className={styles.particles}>
            <i className={styles.particle} />
            <i className={styles.particle} />
            <i className={styles.particle} />
            <i className={styles.particle} />
          </span>
          {/* Remy fills the FAB circle: the avatar box now spans the full 48px button
              (was an under-sized 40px that left a wide white ring), so the bird is the
              primary element instead of floating in white. A circular clip on THIS
              wrapper only (not `.nest`) trims the enlarged frame's corners cleanly and
              keeps the ambient halo + motes — which live on `.nest` — unclipped. `fit`
              stays `contain` (never crops the character; safe for the landscape frames),
              and the ~8px top/bottom letterbox gives the 4px float bob headroom so no
              part of the animation is clipped. Sizes off the FAB (`h-12 w-12`), so it
              scales with the button on every device. */}
          <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full">
            <Remy
              state={displayExpression}
              emotion={displayEmotion}
              reactionKey={behavior}
              float={isResting}
              size={48}
              decorative
            />
          </span>
        </span>
      </FloatingCompanionButton>

      {/* The menu is a CONSEQUENCE of Remy greeting — Remy offers the actions while greeting. */}
      <NestMenu
        open={presentsActions}
        items={items}
        greeting={{ expression: look.expression, emotion: look.emotion }}
        greetingTitle={`${greetingForTimeOfDay(timeOfDay)} — how can I help?`}
        onDismiss={sendHome}
        onSelect={chooseAction}
      />
    </>
  );
}
