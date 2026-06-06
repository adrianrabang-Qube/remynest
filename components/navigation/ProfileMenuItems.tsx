"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import ProfileMenuLink from "@/components/profile/ProfileMenuLink";
import { PROFILE_MENU_ITEMS } from "@/components/profile/config/profile-menu.config";
import LogoutButton from "@/components/LogoutButton";
import { setPersonalWorkspace } from "@/app/(app)/dashboard/profile-actions";

/**
 * Account menu. "Switch to My Nest" is a real action that calls
 * setPersonalWorkspace (writes the remynest-active-context cookie) — no URL
 * ?context= mechanism. Single source of truth = the cookie.
 */
export default function ProfileMenuItems() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchToMyNest() {
    startTransition(() => {
      void setPersonalWorkspace().then(() => router.refresh());
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={switchToMyNest}
        disabled={pending}
        className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 disabled:opacity-50"
      >
        🏡 {pending ? "Switching…" : "Switch to My Nest"}
      </button>

      {PROFILE_MENU_ITEMS.map((item) => (
        <ProfileMenuLink
          key={item.href}
          label={item.label}
          href={item.href}
          icon={item.icon}
        />
      ))}

      <div className="border-t pt-3">
        <LogoutButton />
      </div>
    </div>
  );
}
