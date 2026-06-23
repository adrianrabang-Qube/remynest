"use client";

import { useCallback, useSyncExternalStore } from "react";

const DISMISS_KEY = "remynest-mynest-explainer-dismissed";

// Subscribe to localStorage (cross-tab + our own in-tab dismiss notifications).
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
function getClientSnapshot() {
  return window.localStorage.getItem(DISMISS_KEY) === "1";
}

/**
 * First-run education defining My Nest vs Care Profiles in plain language. The PARENT
 * decides relevance (render only when in My Nest with zero care profiles); this
 * component owns the dismissible state via localStorage, read with useSyncExternalStore
 * so there is no SSR/hydration flash and no set-state-in-effect.
 */
export default function MyNestExplainer() {
  // Server snapshot = true (hidden during SSR); client reads localStorage.
  const dismissed = useSyncExternalStore(subscribe, getClientSnapshot, () => true);

  const dismiss = useCallback(() => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    listeners.forEach((l) => l());
  }, []);

  if (dismissed) return null;

  return (
    <section className="rounded-3xl border border-sand-deep/60 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-charcoal">Getting started</h2>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="-mt-1 rounded-full px-2 text-lg leading-none text-charcoal-muted transition hover:text-charcoal"
        >
          ×
        </button>
      </div>
      <div className="mt-2 space-y-3 text-sm">
        <div>
          <p className="font-semibold text-charcoal">My Nest</p>
          <p className="text-charcoal-soft">
            Your personal memory space. Store memories, reminders and life events
            for yourself.
          </p>
        </div>
        <div>
          <p className="font-semibold text-charcoal">Care Profiles</p>
          <p className="text-charcoal-soft">
            Create a separate space for a parent, grandparent, loved one or someone
            you care for. Keep memories, reminders and important information
            organised separately.
          </p>
        </div>
      </div>
    </section>
  );
}
