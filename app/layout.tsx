import "./globals.css";

import { Inter, Fraunces } from "next/font/google";

import QueryProvider from "@/components/QueryProvider";

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