/**
 * RemyBirdLogo — the unified Remy Bird brand lockup (mark + wordmark) for light
 * surfaces (auth screens, etc.). Identity layer: purple bird + gold nest, navy/gold
 * wordmark. The bird SVG is decorative; the wordmark text carries the accessible name.
 */
export default function RemyBirdLogo({
  size = 56,
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
        <path
          d="M32 14.5 C 30 12 26.5 11 26.5 8.3 C 26.5 6.6 28 5.6 29.4 5.6 C 30.6 5.6 31.5 6.3 32 7.2 C 32.5 6.3 33.4 5.6 34.6 5.6 C 36 5.6 37.5 6.6 37.5 8.3 C 37.5 11 34 12 32 14.5 Z"
          fill="#E3A24A"
        />
        <g fill="none" stroke="#C9A86A" strokeLinecap="round">
          <path d="M12 33 C 12 48 21 55 32 55 C 43 55 52 48 52 33" strokeWidth={2.6} />
          <path d="M18.5 35 C 18.5 46 25 51 32 51 C 39 51 45.5 46 45.5 35" strokeWidth={2.2} />
        </g>
        <path d="M21 33 L13.5 29 L16 36 Z" fill="#7C5CBF" />
        <ellipse cx="30" cy="31" rx="10" ry="8.5" fill="#5B3E8E" />
        <path d="M24.5 30 Q31 27.5 37 31.5 Q31.5 35.5 24.5 32 Z" fill="#8A6BD0" />
        <path d="M40 28.8 L46 30.4 L40 32.4 Z" fill="#E3A24A" />
        <circle cx="36.3" cy="28" r="1.7" fill="#F3E7C8" />
        <circle cx="36.3" cy="28" r="0.8" fill="#2A2350" />
      </svg>
      <span
        className="text-2xl font-semibold tracking-tight"
        style={{ fontFamily: "Fraunces, Georgia, serif" }}
      >
        <span style={{ color: "#2A2350" }}>Remy</span>
        <span style={{ color: "#B58A2E" }}>Nest</span>
      </span>
    </div>
  );
}
