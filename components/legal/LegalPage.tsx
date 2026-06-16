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
 * Content is a launch template pending legal counsel review.
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

      <div
        role="note"
        className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
      >
        This document is a launch template and must be reviewed and
        approved by qualified legal counsel before public launch.
      </div>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-neutral-700">
        {children}
      </div>

      <hr className="my-10 border-neutral-200" />

      <LegalLinks />
    </main>
  );
}
