import { Capacitor } from "@capacitor/core";

/**
 * Lightweight haptic feedback wrapper (Mobile Experience Sprint V1).
 *
 * Native-only: a no-op on web/SSR (`Capacitor.isNativePlatform()` is false there),
 * so it is safe to call from any client component. `@capacitor/haptics` is loaded
 * via dynamic import so it never enters the SSR/web critical path, and every call
 * is wrapped in try/catch so a missing native plugin (e.g. before `cap sync`)
 * degrades silently instead of throwing.
 *
 * Use:
 *   - `haptic("light")`  → taps: nav, cards, buttons, send/submit
 *   - `haptic("medium")` → confirmations: save, create
 *   - `haptic("heavy")`  → destructive intent
 *   - `hapticSuccess()`  → a completed action (memory saved, reminder created)
 *   - `hapticWarning()`  → a guarded/blocked action
 */
type Impact = "light" | "medium" | "heavy";

function active(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

export async function haptic(impact: Impact = "light"): Promise<void> {
  if (!active()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    const style =
      impact === "heavy"
        ? ImpactStyle.Heavy
        : impact === "medium"
          ? ImpactStyle.Medium
          : ImpactStyle.Light;
    await Haptics.impact({ style });
  } catch {
    /* native plugin unavailable — silent no-op */
  }
}

export async function hapticSuccess(): Promise<void> {
  if (!active()) return;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    /* no-op */
  }
}

export async function hapticWarning(): Promise<void> {
  if (!active()) return;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Warning });
  } catch {
    /* no-op */
  }
}
