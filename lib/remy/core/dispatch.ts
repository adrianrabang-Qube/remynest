/**
 * Remy Platform (v2) — DISPATCH HELPERS.
 *
 * Tiny framework-agnostic wrappers over the Event Bus singleton. These are what the public
 * `Remy` facade and the React hooks call, so emitting never requires React context, a mounted
 * provider, or the DOM. Kept separate from the public barrel to avoid an import cycle
 * (barrel → provider → dispatch, never back).
 */
import { remyEventBus } from "./event-bus";
import { contextEnter, contextExit, type RemyContextKey, type RemyEventName } from "./events";

export function emitRemyEvent(
  name: RemyEventName,
  payload?: Record<string, unknown>,
): void {
  remyEventBus.emit({ name, payload });
}

export function enterRemyContext(context: RemyContextKey): void {
  remyEventBus.emit(contextEnter(context));
}

export function exitRemyContext(context: RemyContextKey): void {
  remyEventBus.emit(contextExit(context));
}
