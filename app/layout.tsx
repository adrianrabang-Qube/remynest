import "./globals.css";
import QueryProvider from "@/components/QueryProvider";
import LogoutButton from "@/components/LogoutButton";
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
        <QueryProvider>
          {/* NAVBAR */}
          <div className="flex justify-between items-center px-6 py-4 border-b">
            <div className="flex gap-6 text-sm font-medium">
              <a href="/memories">Dashboard</a>
              <a href="/memories">Memories</a>
              <a href="/memories/new">New</a>
              <a href="/timeline">Timeline</a>
              <a href="/reminders">Reminders</a>
            </div>

            <LogoutButton />
          </div>

          {/* PAGE CONTENT */}
          <main>{children}</main>
        </QueryProvider>
      </body>
    </html>
  );
}