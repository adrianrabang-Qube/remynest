import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import RemyLensSummary from "@/components/remy/RemyLensSummary";
import type { RemyUnderstanding } from "@/lib/remy/understanding";

export interface PersonRowData {
  id: string;
  name: string;
  photo: string | null;
  relationship: string | null;
}

/**
 * PersonRow — a directory row for the people network (CompactRow pattern):
 * leading photo (or initial) · name · what Remy understands about this person
 * (one-line lens summary, reused from buildPersonUnderstanding) · chevron. The
 * whole row links to that person's canonical profile.
 */
export default function PersonRow({
  person,
  understanding,
}: {
  person: PersonRowData;
  understanding: RemyUnderstanding;
}) {
  const initial = (person.name || "?").charAt(0).toUpperCase();

  return (
    <li>
      <Link
        href={`/profiles/${person.id}`}
        className="flex min-h-[44px] items-center gap-3 px-3 py-3 transition hover:bg-sand/40 active:bg-sand/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sage"
      >
        {person.photo ? (
          <Image
            src={person.photo}
            alt=""
            width={44}
            height={44}
            unoptimized
            className="h-11 w-11 shrink-0 rounded-full border border-sand-deep/50 object-cover"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sage text-base font-semibold text-white">
            {initial}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-charcoal">
            {person.name}
          </p>
          <RemyLensSummary
            understanding={understanding}
            variant="inline"
            className="mt-0.5 text-xs text-charcoal-muted"
          />
        </div>

        <ChevronRight className="h-4 w-4 shrink-0 text-charcoal-muted" aria-hidden />
      </Link>
    </li>
  );
}
