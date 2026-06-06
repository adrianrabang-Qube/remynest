/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
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
          DEFAULT: "#C9A86A", // Soft Gold — accent
          soft: "#E3D1A9",
        },
        moss: "#8FAE8A",
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
