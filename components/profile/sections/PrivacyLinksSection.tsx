import Link from "next/link";

/**
 * Privacy links (Phase 1).
 *
 * Static, dependency-free links to RemyNest's published legal/privacy pages.
 * No backend or consent state is involved in this phase.
 */
const LINKS = [
  {
    href: "/privacy",
    label: "Privacy Policy",
    description: "How we collect, use and protect your data.",
  },
  {
    href: "/terms",
    label: "Terms of Service",
    description: "The terms that govern your use of RemyNest.",
  },
  {
    href: "/cookies",
    label: "Cookie Policy",
    description: "How we use cookies and similar technologies.",
  },
];

export default function PrivacyLinksSection() {
  return (
    <div className="space-y-2 text-sm">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="block rounded-2xl border border-sand-deep/60 p-4 transition hover:bg-sand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
        >
          <span className="font-medium text-charcoal">{link.label}</span>
          <span className="mt-1 block text-charcoal-muted">
            {link.description}
          </span>
        </Link>
      ))}
    </div>
  );
}
