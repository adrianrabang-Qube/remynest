import ProfileMenuLink from "@/components/profile/ProfileMenuLink";
import {
  PROFILE_MENU_ITEMS,
} from "@/components/profile/config/profile-menu.config";
import LogoutButton from "@/components/LogoutButton";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function ProfileMenuItemsContent() {
  const searchParams = useSearchParams();

  const isMyNestContext =
    searchParams.get("context") === "my-nest";

  return (
    <div className="space-y-2">
      {PROFILE_MENU_ITEMS.map((item) => (
        <ProfileMenuLink
          key={item.href}
          label={item.label}
          href={item.href}
          icon={item.icon}
        />
      ))}

      {isMyNestContext && (
        <div className="border-t pt-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Care Profiles
          </p>

          <Link
            href="/dashboard"
            className="block rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
          >
            Return to Care Workspace
          </Link>
        </div>
      )}

      <div className="border-t pt-3">
        <LogoutButton />
      </div>
    </div>
  );
}

export default function ProfileMenuItems() {
  return (
    <Suspense fallback={null}>
      <ProfileMenuItemsContent />
    </Suspense>
  );
}