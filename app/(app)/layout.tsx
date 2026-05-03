import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f5efe7] text-[#2f3e34]">
      <nav className="flex items-center justify-between px-8 py-4 border-b shadow-sm">
        <div className="flex gap-8 text-sm font-medium">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/memories">Memories</Link>
          <Link href="/memories/new">New</Link>
          <Link href="/timeline">Timeline</Link>
          <Link href="/reminders">Reminders</Link>
        </div>

        <LogoutButton />
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {children}
      </main>
    </div>
  );
}