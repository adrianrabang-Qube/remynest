import { ImageResponse } from "next/og";

import { IDENTITY } from "@/lib/brand/tokens";

// Dedicated apple-touch icon: 180x180, OPAQUE (no transparency), NO rounded corners
// (iOS applies its own superellipse mask). Remy Bird identity — cream/gold bird in a
// nest on the purple ground.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(160deg, ${IDENTITY.purpleLight}, ${IDENTITY.purpleDeep})`,
        }}
      >
        <svg width="132" height="132" viewBox="0 0 64 64">
          <path
            d="M32 14.5 C 30 12 26.5 11 26.5 8.3 C 26.5 6.6 28 5.6 29.4 5.6 C 30.6 5.6 31.5 6.3 32 7.2 C 32.5 6.3 33.4 5.6 34.6 5.6 C 36 5.6 37.5 6.6 37.5 8.3 C 37.5 11 34 12 32 14.5 Z"
            fill={IDENTITY.pendant}
          />
          <path
            d="M12 33 C 12 48 21 55 32 55 C 43 55 52 48 52 33"
            fill="none"
            stroke={IDENTITY.cream}
            strokeWidth={2.6}
            strokeLinecap="round"
          />
          <path
            d="M18.5 35 C 18.5 46 25 51 32 51 C 39 51 45.5 46 45.5 35"
            fill="none"
            stroke={IDENTITY.cream}
            strokeWidth={2.2}
            strokeLinecap="round"
          />
          <path d="M21 33 L13.5 29 L16 36 Z" fill={IDENTITY.gold} />
          <ellipse cx="30" cy="31" rx="10" ry="8.5" fill={IDENTITY.birdCream} />
          <path d="M24.5 30 Q31 27.5 37 31.5 Q31.5 35.5 24.5 32 Z" fill={IDENTITY.gold} />
          <path d="M40 28.8 L46 30.4 L40 32.4 Z" fill={IDENTITY.pendant} />
          <circle cx="36.3" cy="28" r="1.7" fill={IDENTITY.purpleDeep} />
        </svg>
      </div>
    ),
    { ...size }
  );
}
