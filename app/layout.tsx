import "./globals.css";
import Script from "next/script";

import QueryProvider from "@/components/QueryProvider";
import OneSignalInit from "@/components/OneSignalInit";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.es6.js"
          strategy="beforeInteractive"
        />
      </head>

      <body>
        <QueryProvider>
          <OneSignalInit />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}