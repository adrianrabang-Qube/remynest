import "./globals.css";

import {
  Inter,
} from "next/font/google";

import QueryProvider from "@/components/QueryProvider";

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
      <body
        className={`${inter.className} antialiased bg-[#f5f1ea] text-[#2f3e34]`}
      >
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}