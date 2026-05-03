import "./globals.css";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* NAVBAR (styled — not broken) */}
        <nav className="flex items-center justify-between px-6 py-4 border-b shadow-sm">
          <div className="flex gap-6 text-sm font-medium">
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            <Link href="/memories" className="hover:underline">
              Memories
            </Link>
            <Link href="/new" className="hover:underline">
              New
            </Link>
            <Link href="/timeline" className="hover:underline">
              Timeline
            </Link>
            <Link href="/reminders" className="hover:underline">
              Reminders
            </Link>
          </div>

          {/* LOGOUT BUTTON (right side) */}
          <LogoutButton />
        </nav>

        {/* MAIN CONTENT */}
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}