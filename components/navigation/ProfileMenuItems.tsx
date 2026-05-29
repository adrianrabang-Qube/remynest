import ProfileMenuLink from "@/components/profile/ProfileMenuLink";
import {
  PROFILE_MENU_ITEMS,
} from "@/components/profile/config/profile-menu.config";
import LogoutButton from "@/components/LogoutButton";

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