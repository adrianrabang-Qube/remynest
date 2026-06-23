/**
 * RemyNestLogo — the PRODUCT brand lockup (geometric nest mark + RemyNest wordmark).
 * Sage/sand/gold product identity (NOT the purple Remy Bird companion). Used on the
 * auth screens. The mark is decorative; the wordmark text carries the accessible name.
 */
export default function RemyNestLogo({
  size = 52,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        aria-hidden="true"
        focusable="false"
      >
        <ellipse cx="32" cy="27" rx="8.5" ry="9.5" fill="#C9A86A" />
        <g
          fill="none"
          stroke="#4F6B5B"
          strokeWidth={4.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 30 C 9 45 20 53 32 53 C 44 53 55 45 55 30" />
          <path d="M16 32 C 16 43 24 49 32 49 C 40 49 48 43 48 32" />
          <path d="M23 34 C 23 41 27 45 32 45 C 37 45 41 41 41 34" />
        </g>
      </svg>
      <span
        className="text-2xl font-semibold tracking-tight"
        style={{ fontFamily: "Fraunces, Georgia, serif" }}
      >
        <span className="text-charcoal">Remy</span>
        <span className="text-sage">Nest</span>
      </span>
    </div>
  );
}
