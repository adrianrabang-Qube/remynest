import { ImageResponse } from "next/og";

import { BRAND } from "@/lib/brand/tokens";

// Dedicated apple-touch icon: 180x180, OPAQUE (no transparency), NO rounded
// corners (iOS applies its own superellipse mask). Sand mark on a sage ground.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const arc = {
    fill: "none",
    stroke: BRAND.sand,
    strokeWidth: 4.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND.sage,
        }}
      >
        <svg width="118" height="118" viewBox="0 0 64 64">
          <ellipse cx="32" cy="27" rx="8.5" ry="9.5" fill={BRAND.gold} />
          <path d="M9 30 C 9 45 20 53 32 53 C 44 53 55 45 55 30" {...arc} />
          <path d="M16 32 C 16 43 24 49 32 49 C 40 49 48 43 48 32" {...arc} />
          <path d="M23 34 C 23 41 27 45 32 45 C 37 45 41 41 41 34" {...arc} />
        </svg>
      </div>
    ),
    { ...size }
  );
}
