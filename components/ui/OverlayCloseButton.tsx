import type { ReactNode } from "react";

/**
 * Reusable close ("×") control for FULL-SCREEN overlays (PhotoViewer, full-screen modals).
 *
 * Anchored with the iOS safe-area insets — `top: max(<base>, env(safe-area-inset-top))`
 * and `right: max(<base>, env(safe-area-inset-right))` — so it NEVER sits under the notch
 * or Dynamic Island, on ANY iPhone (current or future), in portrait OR landscape, and
 * degrades to the base offset on the web (where the insets are 0). Requires
 * `viewport-fit=cover` (already set app-wide in app/layout.tsx). No hard-coded top offsets,
 * no per-overlay hacks — this is the ONE place overlay close placement is defined.
 */
export default function OverlayCloseButton({
  onClick,
  label = "Close",
  children = "×",
  className = "",
}: {
  onClick: () => void;
  label?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={[
        "absolute z-20 flex h-10 w-10 items-center justify-center rounded-full",
        "bg-white/15 text-2xl leading-none text-white backdrop-blur-sm transition",
        "top-[max(0.75rem,env(safe-area-inset-top))]",
        "right-[max(0.75rem,env(safe-area-inset-right))]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}
