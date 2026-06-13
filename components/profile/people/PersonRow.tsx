import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface PersonRowData {
  id: string;
  name: string;
  photo: string | null;
  relationship: string | null;
}

/**
 * PersonRow — a ~64px directory row for the people network (CompactRow pattern):
 * leading photo (or initial) · name + relationship · memory count · chevron. The
 * whole row links to that person's canonical profile (/profiles/[id]).
 */
export default function PersonRow({
  person,
  memoryCount,
}: {
  person: PersonRowData;
  memoryCount: number;
}) {
  const initial = (person.name || "?").charAt(0).toUpperCase();
  const sub = [person.relationship, `${memoryCount} ${memoryCount === 1 ? "memory" : "memories"}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <li>
      <Link
        href={`/profiles/${person.id}`}
        className="flex min-h-[44px] items-center gap-3 px-2 py-2.5 transition hover:bg-sand/40 active:bg-sand/50"
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
          <p className="truncate text-sm font-medium text-charcoal">{person.name}</p>
          <p className="truncate text-xs text-charcoal-muted">{sub}</p>
        </div>

        <ChevronRight className="h-4 w-4 shrink-0 text-charcoal-muted" aria-hidden />
      </Link>
    </li>
  );
}
