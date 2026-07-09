"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Heart, Sparkles as SparklesIcon } from "lucide-react";

import { getRemyAsset } from "@/lib/remy/companion/asset-registry";

/**
 * Reusable companion EFFECTS (framer-motion) — centralized so every celebration across the app
 * shares one implementation (no duplicated animation logic). The feather burst uses the REAL
 * `goldenFeather` registry asset; sparkles + heart are icon+motion (no image required). All effects
 * are reduced-motion-safe: under `prefers-reduced-motion` each renders nothing (the celebration
 * still shows Remy + a label, just without the flourish). Purely decorative (aria-hidden).
 */

const GOLD = "#C9A86A";
const ROSE = "#C2748A";

/** Golden feathers (the real asset) fanning up and outward, then fading. */
export function FeatherBurst({ count = 6 }: { count?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  const feather = getRemyAsset("goldenFeather");
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-visible">
      {Array.from({ length: count }).map((_, i) => {
        const spread = count > 1 ? i / (count - 1) : 0.5; // 0..1 across the fan
        const rad = ((-70 + spread * 140) * Math.PI) / 180;
        const dist = 88 + (i % 3) * 18;
        const dx = Math.sin(rad) * dist;
        const dy = -Math.abs(Math.cos(rad)) * dist - 28;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 -ml-3 -mt-3"
            initial={{ x: 0, y: 0, opacity: 0, rotate: -25, scale: 0.5 }}
            animate={{ x: dx, y: dy, opacity: [0, 1, 1, 0], rotate: 25, scale: 1 }}
            transition={{ duration: 1.7, delay: i * 0.05, ease: "easeOut" }}
          >
            <Image src={feather.src} alt="" width={24} height={24} draggable={false} />
          </motion.span>
        );
      })}
    </div>
  );
}

const SPARKLE_POSITIONS = [
  { x: -60, y: -50 },
  { x: 60, y: -44 },
  { x: -72, y: 18 },
  { x: 72, y: 26 },
  { x: 0, y: -78 },
  { x: -18, y: 58 },
] as const;

/** A scatter of gold sparkles twinkling in, then out. */
export function Sparkles({ count = 5 }: { count?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {SPARKLE_POSITIONS.slice(0, count).map((p, i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-1/2"
          style={{ marginLeft: p.x, marginTop: p.y, color: GOLD }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, delay: 0.1 + i * 0.12, ease: "easeOut" }}
        >
          <SparklesIcon className="h-4 w-4" />
        </motion.span>
      ))}
    </div>
  );
}

/** A single heart that rises and pulses above Remy — "your memory is safe." */
export function HeartPulse() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <motion.span
      aria-hidden
      className="absolute left-1/2 top-0 -ml-2.5"
      style={{ color: ROSE }}
      initial={{ opacity: 0, y: 0, scale: 0.6 }}
      animate={{ opacity: [0, 1, 0], y: -30, scale: [0.6, 1.15, 0.9] }}
      transition={{ duration: 1.6, ease: "easeOut" }}
    >
      <Heart className="h-5 w-5 fill-current" />
    </motion.span>
  );
}
