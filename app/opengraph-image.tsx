import { ImageResponse } from "next/og";

import { BRAND } from "@/lib/brand/tokens";

// Branded social card (also used as twitter-image). Sand ground, sage nest mark,
// two-tone wordmark, tagline, gold keepsake hairline. Uses the default Satori
// font (loading Fraunces is a polish follow-up — see docs/brand).
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "RemyNest — a calm home for your memories";

export default function OpengraphImage() {
  const arc = {
    fill: "none",
    stroke: BRAND.sage,
    strokeWidth: 4.2,
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
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND.sand,
          color: BRAND.charcoal,
        }}
      >
        <svg width="190" height="190" viewBox="0 0 64 64">
          <ellipse cx="32" cy="27" rx="8.5" ry="9.5" fill={BRAND.gold} />
          <path d="M9 30 C 9 45 20 53 32 53 C 44 53 55 45 55 30" {...arc} />
          <path d="M16 32 C 16 43 24 49 32 49 C 40 49 48 43 48 32" {...arc} />
          <path d="M23 34 C 23 41 27 45 32 45 C 37 45 41 41 41 34" {...arc} />
        </svg>
        <div style={{ display: "flex", fontSize: 88, fontWeight: 700, marginTop: 18 }}>
          <span>Remy</span>
          <span style={{ color: BRAND.sage }}>Nest</span>
        </div>
        <div style={{ fontSize: 34, color: BRAND.charcoalSoft, marginTop: 4 }}>
          A calm home for your memories
        </div>
        <div
          style={{
            width: 90,
            height: 5,
            background: BRAND.gold,
            borderRadius: 3,
            marginTop: 30,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
