import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";

import QueryProvider from "@/components/QueryProvider";
import {
  SITE_URL,
  SITE_NAME,
  SITE_TITLE,
  SITE_TAGLINE,
  SITE_DESCRIPTION,
  SITE_OG_IMAGE,
} from "@/lib/seo";

// Site-wide SEO defaults. `metadataBase` makes every relative canonical/og:url
// resolve to an absolute URL. Per-page metadata (homepage + marketing/legal
// pages) overrides title/description/canonical via lib/seo `pageMetadata`.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      { url: SITE_OG_IMAGE, width: 1200, height: 630, alt: `${SITE_NAME} — ${SITE_TAGLINE}` },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [SITE_OG_IMAGE],
  },
  // Icons are auto-wired by the App-Router file conventions:
  // app/favicon.ico, app/icon.svg, app/apple-icon.tsx, app/opengraph-image.tsx.
};

// `viewport-fit=cover` lets the app draw into the iOS safe-area insets so the
// mobile bottom nav can pad itself clear of the home indicator via
// env(safe-area-inset-bottom).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Brand sage for browser/PWA chrome (was the manifest's off-brand black). A dark
  // media variant lands with the dark-UI rollout, not before it.
  themeColor: "#4F6B5B",
};

// Body: Inter (clear, calm, Apple-like rhythm).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Headings: Fraunces — a warm, literary serif for a "memory home" feel
// (Storyworth / Apple Journal warmth), never clinical.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="font-sans antialiased bg-sand text-charcoal">
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}