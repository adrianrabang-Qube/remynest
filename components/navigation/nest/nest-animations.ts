/**
 * Nest interaction motion timing (ms). Kept OUT of the components and the FSM so the animation
 * feel is tuned in ONE place while the state machine stays pure and the components stay
 * declarative. The CSS keyframes live in `nest.module.css`; these durations drive the
 * JS-scheduled phase advances in `useNestInteraction`.
 *
 * All motion is reduced-motion-safe: the hook skips the timed sequence when
 * `prefers-reduced-motion: reduce`, and the CSS disables the keyframes independently.
 *
 * FUTURE-READY: a real animation backend (Rive / Lottie / Framer) plugs in behind the same
 * phase→visual mapping (`NEST_VISUALS`) without touching the FSM or the components — only these
 * durations and the CSS module change.
 */
export const NEST_TIMING = {
  /** idle → peek: Remy wakes and peeks out of the nest. */
  peekMs: 180,
  /** peek → popout → menuOpen: Remy pops out to greet, then presents the menu. */
  popMs: 200,
  /** returnHome → idle: Remy settles back into the nest after the menu closes. */
  returnMs: 220,
} as const;
