import Link from "next/link";

export default function LegalLinks({
  className = "",
}: {
  className?: string;
}) {
  return (
    <nav
      aria-label="Legal"
      className={`flex flex-wrap gap-4 text-sm text-neutral-500 ${className}`.trim()}
    >
      <Link href="/privacy" className="hover:text-black">
        Privacy Policy
      </Link>
      <Link href="/terms" className="hover:text-black">
        Terms of Service
      </Link>
      <Link href="/cookies" className="hover:text-black">
        Cookie Policy
      </Link>
    </nav>
  );
}
