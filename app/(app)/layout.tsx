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
      <nav className="flex items-center justify-between px-6 py-4 border-b shadow-sm bg-white">
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

        {/* LOGOUT BUTTON */}
        <LogoutButton />
      </nav>

      {/* CONTENT */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {children}
      </main>
    </>
  );
}