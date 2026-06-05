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
          className="block rounded-lg border p-3 hover:bg-neutral-50"
        >
          <span className="font-medium">{link.label}</span>
          <span className="mt-1 block text-neutral-500">
            {link.description}
          </span>
        </Link>
      ))}
    </div>
  );
}
