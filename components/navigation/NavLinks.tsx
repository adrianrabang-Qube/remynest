import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function NavLinks() {
  const searchParams = useSearchParams();

  const context = searchParams.get("context");

  const withContext = (path: string) =>
    context ? `${path}?context=${context}` : path;

  return (
    <nav className="flex gap-6 text-sm font-medium">
      <Link href={withContext("/dashboard")}>Dashboard</Link>

      <Link href={withContext("/memories")}>Memories</Link>

      <Link href={withContext("/memory-chat")}>Memory Chat</Link>

      <Link href={withContext("/memories/new")}>New</Link>

      <Link href={withContext("/timeline")}>Timeline</Link>

      <Link href={withContext("/reminders")}>Reminders</Link>

      <Link href={withContext("/insights")}>Insights</Link>
    </nav>
  );
}