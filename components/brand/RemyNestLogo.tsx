import Image from "next/image";

/**
 * RemyNestLogo — the product brand lockup (canonical purple fingerprint-heart-bird
 * mark + RemyNest wordmark). Strategy-1 unification (2026-07-18): the mark is the
 * SAME approved master used by the app icon on every platform
 * (`public/brand/remynest-mark.png`, transparent, native-resolution crop — never
 * redrawn). Used on the auth screens + onboarding. The mark is decorative; the
 * wordmark text carries the accessible name. Wordmark colours: "Remy" charcoal +
 * "Nest" deep violet #5B3E8E (the companion violet — AA on sand; the board's gold
 * wordmark is barred as text by the brand a11y rule: gold fails contrast on light).
 */
export default function RemyNestLogo({
  size = 52,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  // The mark master is 695×728 — keep its native aspect at any rendered size.
  const width = Math.round(size * (695 / 728));
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <Image
        src="/brand/remynest-mark.png"
        alt=""
        aria-hidden
        width={width}
        height={size}
        priority
        draggable={false}
      />
      <span
        className="text-2xl font-semibold tracking-tight"
        style={{ fontFamily: "Fraunces, Georgia, serif" }}
      >
        <span className="text-charcoal">Remy</span>
        <span className="text-[#5B3E8E]">Nest</span>
      </span>
    </div>
  );
}
