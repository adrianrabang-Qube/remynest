import type { ReactNode } from "react";
import Link from "next/link";

import LegalLinks from "./LegalLinks";

interface LegalPageProps {
  title: string;
  effectiveDate: string;
  children: ReactNode;
}

/**
 * Shared layout for legal pages. Presentational only.
 * (2026-07-22: the "launch template" banner was removed pre-App-Store-submission —
 * a reviewer-visible disclaimer that the legal docs were unapproved. The governing-law
 * jurisdiction is resolved (Ireland); counsel review remains an operator follow-up,
 * tracked in docs — not announced on the live pages.)
 */
export default function LegalPage({
  title,
  effectiveDate,
  children,
}: LegalPageProps) {
  return (
    <main className="mx-auto max-w-3xl px-6 pb-12 pt-[calc(3rem_+_env(safe-area-inset-top))]">
      <Link
        href="/"
        className="text-sm text-neutral-500 hover:text-black"
      >
        ← RemyNest
      </Link>

      <h1 className="mt-4 text-3xl font-bold text-[#243428]">
        {title}
      </h1>

      <p className="mt-1 text-sm text-neutral-500">
        Effective date: {effectiveDate}
      </p>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-neutral-700">
        {children}
      </div>

      <hr className="my-10 border-neutral-200" />

      <LegalLinks />
    </main>
  );
}
