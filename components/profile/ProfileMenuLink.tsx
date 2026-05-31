import Link from "next/link";

interface ProfileMenuLinkProps {
  label: string;
  href: string;
  icon: string;
  requiresPremium?: boolean;
}

export default function ProfileMenuLink({
  label,
  href,
  icon,
  requiresPremium,
}: ProfileMenuLinkProps) {
  return (
    <Link
      href={href}
      scroll
      onClick={() => {
        const active = document.activeElement as HTMLElement | null;
        active?.blur();
      }}
      className="
        flex
        items-center
        justify-between
        rounded-lg
        px-3
        py-2
        text-sm
        transition
        hover:bg-neutral-100
      "
    >
      <span className="flex items-center gap-3">
        <span>{icon}</span>
        <span>{label}</span>
      </span>

      {requiresPremium && (
        <span className="rounded-md bg-amber-100 px-2 py-1 text-[10px] font-medium text-amber-700">
          PRO
        </span>
      )}
    </Link>
  );
}