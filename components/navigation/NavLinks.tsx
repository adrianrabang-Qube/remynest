import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { NAV_ITEMS, isNavItemActive } from "./nav-config";

function NavLinksContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const context = searchParams.get("context");

  const withContext = (path: string) =>
    context ? `${path}?context=${context}` : path;

  return (
    <nav className="flex gap-1 text-sm font-medium">
      {NAV_ITEMS.map(({ href, label }) => {
        const active = isNavItemActive(pathname, href);
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