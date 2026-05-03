import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f5efe7] text-[#2f3e34]">
      {/* NAVBAR */}
      <nav className="flex items-center justify-between px-8 py-4 border-b bg-[#f5efe7] shadow-sm">
        <div className="flex gap-8 text-sm font-medium">
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

        <LogoutButton />
      </nav>

      {/* CENTERED CONTENT */}
      <main className="max-w-3xl mx-auto px-6 py-10">
        {children}
      </main>
    </div>
  );
}