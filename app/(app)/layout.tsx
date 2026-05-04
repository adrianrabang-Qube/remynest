import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* NAVBAR */}
      <header className="flex justify-between items-center px-6 py-4 border-b">
        <nav className="flex gap-6 text-sm font-medium">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/memories">Memories</Link>
          <Link href="/memories/new">New</Link>
          <Link href="/timeline">Timeline</Link>
          <Link href="/reminders">Reminders</Link>
        </nav>

        <LogoutButton />
      </header>

      {/* PAGE CONTENT */}
      <main className="p-6">{children}</main>
    </>
  );
}