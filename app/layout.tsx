import "./globals.css";

import Script from "next/script";

import {
  Inter,
} from "next/font/google";

import QueryProvider from "@/components/QueryProvider";
import OneSignalInit from "@/components/OneSignalInit";

const inter = Inter({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
          strategy="beforeInteractive"
        />
      </head>

      <body
        className={`${inter.className} antialiased bg-[#f5f1ea] text-[#2f3e34]`}
      >
        <QueryProvider>
          <OneSignalInit />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}