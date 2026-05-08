import "./globals.css";
import QueryProvider from "@/components/QueryProvider";
import OneSignalInit from "./OneSignalInit";
import Script from "next/script";

import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(
    "https://remynest.com"
  ),

  title: "Remynest",

  description:
    "Your AI-powered memory system",

  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Script
          src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
          strategy="beforeInteractive"
        />

        <OneSignalInit />

        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}