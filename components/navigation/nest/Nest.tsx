"use client";

import { useEffect, useState } from "react";
import { Bell, MessageCircle, Mic, Pencil, Search, Sparkles } from "lucide-react";

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
  /** Voice-first entry into the SAME new-memory flow (?voice=1). */
  voiceMemoryHref: string;
  reminderHref: string;
  searchHref: string;
  insightsHref: string;
  /** REAL memory-milestone count driving Nest evolution (from the app shell; default 0 → Tiny Nest). */
  memoryCount?: number;
}

export default function Nest({
  remyHref,
  memoryHref,
  voiceMemoryHref,
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
    // 2026-07-15: voice discoverability (operator-approved sixth row) — the same
    // create-memory flow opened voice-first; recording still starts only on tap.
    { href: voiceMemoryHref, label: "Record a voice memory", hint: "Save a moment in your own words", Icon: Mic },
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
          {/* Remy IS the button: the AVATAR tier (`assetVariant="avatar"`) draws the square,
              character-filling 256px export of the same approved art, so the bird fills the
              48px circle instead of a landscape scene letterboxing it to a ~15px speck. The
              circular clip on THIS wrapper only (not `.nest`) trims any square-crop edges
              cleanly and keeps the ambient halo + motes — which live on `.nest` — unclipped.
              `fit` stays `contain` (never distorts); a missing avatar export falls back to
              scene art safely inside this same clip.

              OPTICAL CENTERING (not mathematical): the avatar art composes the character HIGH
              in its square — the crest sits at the asset's top edge with more empty margin
              below the feet — so a geometrically-centred 48px fill puts the crest at the
              circle's top edge, and the 4px (~8%) upward float bob then lifts it PAST that edge
              (top-heavy; worse on small phones where the FAB draws more of the eye). The fix
              lives HERE (the Nest surface — never in the shared `<Remy>` renderer other
              surfaces depend on): `items-start` + a PROPORTIONAL top margin on the avatar
              (`mt-[8%]` ≈ 8% of the FAB, via `<Remy>`'s documented className margin API — NOT a
              translateY, and NOT on the float's animated transform, so the bob is untouched and
              stays centred on the re-seated bird). This biases Remy's optical centre below the
              geometric centre: the crest keeps clearance across the whole float (≈6.8px at rest,
              ≈2.8px at the bob peak) while the feet stay visible (≈2px above the bottom). Being a
              % of the box, it scales with the FAB on every device and survives avatar art
              evolving to a lower composition (the margin simply becomes a no-op). */}
          <span className="flex h-12 w-12 items-start justify-center overflow-hidden rounded-full">
            <Remy
              className="mt-[8%]"
              state={displayExpression}
              assetVariant="avatar"
              emotion={displayEmotion}
              reactionKey={behavior}
              float={isResting}
              size={48}
              decorative
            />
          </span>
        </span>
      </FloatingCompanionButton>

      {/* Warm the wake-choreography artwork so Remy's FIRST wake never pops: hidden, inert
          <Remy> instances at the live size generate the exact same optimized-image URLs as
          the choreography beats (waking→idle, peeking→wink, emerging/greeting→welcome,
          returningHome→goodbye), so every frame is already cached when the sequence plays.
          Zero-size + overflow-hidden + aria-hidden → no layout, no a11y, no interaction. */}
      <span aria-hidden className="pointer-events-none absolute h-0 w-0 overflow-hidden">
        <Remy state="idle" assetVariant="avatar" size={48} decorative />
        <Remy state="wink" assetVariant="avatar" size={48} decorative />
        <Remy state="welcome" assetVariant="avatar" size={48} decorative />
        <Remy state="goodbye" assetVariant="avatar" size={48} decorative />
      </span>

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
