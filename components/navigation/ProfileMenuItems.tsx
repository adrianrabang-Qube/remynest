"use client";

import ProfileMenuLink from "@/components/profile/ProfileMenuLink";
import { PROFILE_MENU_ITEMS } from "@/components/profile/config/profile-menu.config";
import LogoutButton from "@/components/LogoutButton";

/**
 * Account menu. "My Nest" (return to the personal workspace + open /home) now
 * lives at the top of ProfileHub; care-profile switching/management stays in the
 * workspace drawer (WorkspaceSelector). This section renders the Settings
 * link(s) + sign out.
 */
export default function ProfileMenuItems() {
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

      <div className="border-t pt-3">
        <LogoutButton />
      </div>
    </div>
  );
}
