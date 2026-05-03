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
      <body className="bg-[#f5efe7] text-[#2f3e34]">
        
        {/* NAVBAR */}
        <nav className="flex items-center justify-between px-8 py-4 bg-white shadow-sm border-b">
          
          {/* LEFT NAV */}
          <div className="flex gap-6 text-sm font-medium">
            <Link href="/dashboard" className="hover:opacity-70 transition">
              Dashboard
            </Link>
            <Link href="/memories" className="hover:opacity-70 transition">
              Memories
            </Link>
            <Link href="/new" className="hover:opacity-70 transition">
              New
            </Link>
            <Link href="/timeline" className="hover:opacity-70 transition">
              Timeline
            </Link>
            <Link href="/reminders" className="hover:opacity-70 transition">
              Reminders
            </Link>
          </div>

          {/* RIGHT SIDE */}
          <div className="flex items-center gap-4">
            <LogoutButton />
          </div>
        </nav>

        {/* PAGE CONTAINER */}
        <main className="max-w-4xl mx-auto px-6 py-8">
          {children}
        </main>

      </body>
    </html>
  );
}