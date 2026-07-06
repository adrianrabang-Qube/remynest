/**
 * Remy Platform (v2) — BRAIN.
 *
 * The Brain interprets EVENTS into SEMANTIC STATE. It never renders, never loads assets, never
 * touches the UI. It answers "what is going on and how does Remy feel about it?" and nothing
 * more; the Policy Engine turns that into a look, the engines/renderer draw it.
 *
 * Today it tracks two things:
 *   - the stack of active sticky CONTEXTS (entered/exited), and
 *   - a transient MOMENT emotion (set by moment events; cleared by the host after its duration).
 * It consults the Emotion Engine for feelings.
 *
 * DESIGNED FOR EXPANSION — future semantic state lives here, additively, with no consumer
 * change: memory context, conversation state, AI state, relationship state, personality, trust,
 * and long-term context. Keep this class pure of rendering/timers so it stays portable (it can
 * back a React provider today and a native host tomorrow).
 */
import { emotionForContext, emotionForMoment } from "./emotion-engine";
import type { RemyEmotion } from "./emotion";
import { pickTopContext, type RemyContextKey, type RemyEvent, type RemyEventName } from "./events";

/** Events that also enter/exit a sticky context (independent of any moment emotion they carry). */
const CONTEXT_TRANSITIONS: Partial<
  Record<RemyEventName, { enter?: RemyContextKey; exit?: RemyContextKey }>
> = {
  "search.started": { enter: "searching" },
  "search.finished": { exit: "searching" },
  "conversation.started": { enter: "conversation" },
  "conversation.ended": { exit: "conversation" },
  "sync.started": { enter: "syncing" },
  "sync.completed": { exit: "syncing" },
  offline: { enter: "offline" },
  online: { exit: "offline" },
};

/** Lightweight session memory — THIS session only, never persisted (adaptive personality). */
export interface RemySessionMemory {
  created: number;
  saved: number;
  deleted: number;
  searches: number;
}

/** The Brain's observable semantic state. Pure data — no presentation. */
export interface RemyBrainState {
  /** Active sticky contexts, in insertion order. */
  contexts: RemyContextKey[];
  /** The resolved current feeling (transient moment wins, else the active context, else neutral). */
  emotion: RemyEmotion;
  /** The transient moment feeling, if one is active (else null). */
  transientEmotion: RemyEmotion | null;
  /** A monotonic token identifying the current transient moment (for host-driven expiry). */
  transientToken: number | null;
  /** The moment event that caused the current transient (for speech selection). */
  transientEvent: RemyEventName | null;
  /** Session memory: what the user has been doing this session (drives adaptive lines). */
  session: RemySessionMemory;
  // FUTURE (additive): memoryContext, conversation, aiState, relationship, trust,
  // longTermContext — read by a future Emotion/Policy model, never by features.
}

export type RemyBrainListener = (state: RemyBrainState) => void;

export class RemyBrain {
  private contexts: RemyContextKey[] = [];
  private transient: { emotion: RemyEmotion; token: number; event: RemyEventName } | null = null;
  private tokenSeq = 0;
  private session: RemySessionMemory = { created: 0, saved: 0, deleted: 0, searches: 0 };
  private listeners = new Set<RemyBrainListener>();

  getState(): RemyBrainState {
    return {
      contexts: [...this.contexts],
      emotion: this.resolveEmotion(),
      transientEmotion: this.transient?.emotion ?? null,
      transientToken: this.transient?.token ?? null,
      transientEvent: this.transient?.event ?? null,
      session: { ...this.session },
    };
  }

  subscribe(listener: RemyBrainListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Interpret a single event. Context transitions and moment feelings are independent. */
  dispatch(event: RemyEvent): void {
    let changed = this.recordSession(event.name);

    if (event.name === "context.enter" && event.context) {
      changed = this.enter(event.context) || changed;
    } else if (event.name === "context.exit" && event.context) {
      changed = this.exit(event.context) || changed;
    }

    const transition = CONTEXT_TRANSITIONS[event.name];
    if (transition?.enter) changed = this.enter(transition.enter) || changed;
    if (transition?.exit) changed = this.exit(transition.exit) || changed;

    const moment = emotionForMoment(event.name);
    if (moment) {
      // Session milestone: the FIRST memory of the session is a celebration, not just happy.
      const milestone = event.name === "memory.created" && this.session.created === 1;
      this.transient = {
        emotion: milestone ? "celebrating" : moment,
        token: ++this.tokenSeq,
        event: event.name,
      };
      changed = true;
    }

    if (changed) this.notify();
  }

  /** Update session counters (this session only). Returns whether anything changed. */
  private recordSession(name: RemyEventName): boolean {
    switch (name) {
      case "memory.created":
        this.session.created++;
        return true;
      case "memory.saved":
        this.session.saved++;
        return true;
      case "memory.deleted":
        this.session.deleted++;
        return true;
      case "search.started":
        this.session.searches++;
        return true;
      default:
        return false;
    }
  }

  /** Clear a transient moment (called by the host after the policy duration). Token-guarded. */
  clearTransient(token: number): void {
    if (this.transient?.token === token) {
      this.transient = null;
      this.notify();
    }
  }

  private enter(context: RemyContextKey): boolean {
    if (this.contexts.includes(context)) return false;
    this.contexts.push(context);
    return true;
  }

  private exit(context: RemyContextKey): boolean {
    const i = this.contexts.indexOf(context);
    if (i === -1) return false;
    this.contexts.splice(i, 1);
    return true;
  }

  private resolveEmotion(): RemyEmotion {
    if (this.transient) return this.transient.emotion;
    const top = pickTopContext(this.contexts);
    return top ? emotionForContext(top) : "neutral";
  }

  private notify(): void {
    const state = this.getState();
    for (const listener of Array.from(this.listeners)) listener(state);
  }
}
