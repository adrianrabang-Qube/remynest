/** @type {import('tailwindcss').Config} */
module.exports = {
  // Dark theme MECHANISM only (tokens defined in app/globals.css .dark block).
  // Not flipped on broadly yet — a scoped component audit + toggle is a follow-up.
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // RemyNest type scale (additive — default Tailwind sizes still available).
      // Fraunces (font-serif) for display/h1-h4; Inter (font-sans) for body/UI.
      fontSize: {
        display: ["3.5rem", { lineHeight: "1.05", letterSpacing: "-0.03em", fontWeight: "600" }],
        h1: ["2.5rem", { lineHeight: "1.1", letterSpacing: "-0.025em", fontWeight: "600" }],
        h2: ["2rem", { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "600" }],
        h3: ["1.625rem", { lineHeight: "1.2", letterSpacing: "-0.015em", fontWeight: "600" }],
        h4: ["1.375rem", { lineHeight: "1.25", letterSpacing: "-0.01em", fontWeight: "600" }],
        "body-lg": ["1.1875rem", { lineHeight: "1.6" }],
        body: ["1.0625rem", { lineHeight: "1.6" }],
        small: ["0.9375rem", { lineHeight: "1.5", fontWeight: "500" }],
        caption: ["0.8125rem", { lineHeight: "1.45", letterSpacing: "0.01em", fontWeight: "500" }],
      },
      // RemyNest brand palette — Memory · Family · Trust · Legacy · Nature · Care.
      // Intentionally NOT healthcare blue.
      colors: {
        sage: {
          DEFAULT: "#4F6B5B", // Forest Sage — primary
          deep: "#3E5648",
          soft: "#8FAE8A", // Soft Moss — success / gentle accent
        },
        sand: {
          DEFAULT: "#F5F1EA", // Warm Sand — background
          deep: "#E7E0D3", // hairline borders / quiet fills
        },
        gold: {
          DEFAULT: "#C9A86A", // Soft Gold — accent (FILLS/graphics only, fails as text)
          soft: "#E3D1A9",
          ink: "#7A5E22", // text-grade gold for links/accent-text — AA on light (5.4:1)
        },
        moss: "#8FAE8A",
        // Remy companion palette (authoritative 2026-07-21) — the purple identity
        // trio + pendant gold + the lavender-tinted surface white. Scope: Remy/Nest
        // COMPANION surfaces ONLY (Nest sheet, Ask Remy, moment chip, Remy-labelled
        // cards) — never app-wide UI chrome (that stays sage/sand). Use these tokens
        // instead of hardcoded hex on companion surfaces.
        remy: {
          violet: "#5B3E8E", // deep companion violet (AA on white ~8.6:1)
          lavender: "#8A6BD0", // light companion purple — washes/borders/hover
          gold: "#E3A24A", // Remy pendant warm gold — accent only
          mist: "#F5F2FB", // lavender-tinted surface white (sheet/card gradient top)
        },
        charcoal: {
          DEFAULT: "#2F3E34", // Deep Charcoal — text
          soft: "#54655B", // secondary text
          muted: "#7C887F", // tertiary / captions
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"],
      },
      boxShadow: {
        // Gentle elevation — soft, low-contrast, warm-tinted.
        soft: "0 10px 30px rgba(47,62,52,0.05), 0 1px 2px rgba(47,62,52,0.04)",
        "soft-lg":
          "0 20px 45px rgba(47,62,52,0.08), 0 4px 10px rgba(47,62,52,0.04)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};
