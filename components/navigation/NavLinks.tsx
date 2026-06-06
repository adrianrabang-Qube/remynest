import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const LINKS: { href: string; label: string }[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/memories", label: "Memories" },
  { href: "/memory-chat", label: "Memory Chat" },
  { href: "/memories/new", label: "New" },
  { href: "/timeline", label: "Timeline" },
  { href: "/reminders", label: "Reminders" },
  { href: "/insights", label: "Insights" },
];

function NavLinksContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const context = searchParams.get("context");

  const withContext = (path: string) =>
    context ? `${path}?context=${context}` : path;

  return (
    <nav className="flex gap-1 text-sm font-medium">
      {LINKS.map(({ href, label }) => {
        const active =
          pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={withContext(href)}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 transition ${
              active
                ? "bg-sage/10 text-sage"
                : "text-charcoal-soft hover:bg-white/70 hover:text-sage"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function NavLinks() {
  return (
    <Suspense fallback={null}>
      <NavLinksContent />
    </Suspense>
  );
}