/**
 * Remy Platform (v2) — EVENT BUS.
 *
 * The single entry point into the platform. Everything that wants to tell Remy something
 * publishes a semantic event here; the Brain (via the provider) is the only subscriber in
 * practice. Framework-agnostic (no React, no DOM) so it works from React, a future SwiftUI
 * bridge, a service worker, a web worker, or plain scripts.
 *
 * It is a module singleton: `Remy.emit(...)` (the public API) posts here from anywhere. If no
 * Brain is subscribed yet (SSR, no provider mounted), events are simply dropped — Remy is a
 * best-effort ambient presence, never a correctness dependency.
 */
import type { RemyEvent } from "./events";

export type RemyEventListener = (event: RemyEvent) => void;

/**
 * Bounded replay buffer. React runs child effects BEFORE parent effects, so a declaratively
 * mounted context (`<RemyStage>` / `useRemyContext`) can `emit` before the provider's Brain has
 * subscribed. Rather than drop those, we buffer events emitted while there are no listeners and
 * flush them (in order) to the first subscriber — so the Brain never misses a context declared
 * at initial mount. The cap makes it a no-leak best-effort buffer if a provider never mounts.
 */
const MAX_PENDING = 64;

export class RemyEventBus {
  private listeners = new Set<RemyEventListener>();
  private pending: RemyEvent[] = [];

  emit(event: RemyEvent): void {
    if (this.listeners.size === 0) {
      this.pending.push(event);
      if (this.pending.length > MAX_PENDING) this.pending.shift();
      return;
    }
    this.deliver(event);
  }

  subscribe(
    listener: RemyEventListener,
    options?: { replay?: boolean },
  ): () => void {
    const wantsReplay = options?.replay !== false;
    this.listeners.add(listener);
    // Flush the buffered initial-mount events to the FIRST subscriber that wants replay (the
    // Brain, via the provider) — regardless of subscription ORDER. A SECONDARY listener (e.g. a
    // celebration surface, whose child effect can run before the provider's parent effect) must
    // subscribe with `{ replay: false }` so it never steals the buffer the Brain relies on for a
    // context declared at initial mount. The buffered events go only to the replay-wanting listener.
    if (wantsReplay && this.pending.length > 0) {
      const queued = this.pending;
      this.pending = [];
      for (const event of queued) {
        try {
          listener(event);
        } catch (err) {
          if (process.env.NODE_ENV !== "production") {
            console.error("[remy:bus] listener error", err);
          }
        }
      }
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  private deliver(event: RemyEvent): void {
    // Copy to an array so a listener that (un)subscribes during dispatch can't mutate the set
    // mid-iteration. Errors in one listener never block the others or the emitter.
    for (const listener of Array.from(this.listeners)) {
      try {
        listener(event);
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[remy:bus] listener error", err);
        }
      }
    }
  }
}

/** The process-wide bus. The public `Remy` facade and the provider both use this instance. */
export const remyEventBus = new RemyEventBus();
