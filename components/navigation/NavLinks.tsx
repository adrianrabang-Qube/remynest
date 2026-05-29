import Link from "next/link";

export default function NavLinks() {
  return (
    <nav className="flex gap-6 text-sm font-medium">
      <Link href="/dashboard">Dashboard</Link>

      <Link href="/memories">Memories</Link>

      <Link href="/memory-chat">Memory Chat</Link>

      <Link href="/memories/new">New</Link>

      <Link href="/timeline">Timeline</Link>

      <Link href="/reminders">Reminders</Link>

      <Link href="/insights">Insights</Link>
    </nav>
  );
}