import "./globals.css";
import QueryProvider from "@/components/QueryProvider";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://remynest.com"),
  title: "Remynest",
  description: "Your AI-powered memory system",
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
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}