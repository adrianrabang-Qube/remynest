import ProfileHub from "@/components/profile/ProfileHub";
import type { ProfileSummary } from "@/components/profile/types";

type UserProfileDropdownProps = {
  profile: ProfileSummary;
  onClose?: () => void;
};

export default function UserProfileDropdown({
  profile,
  onClose,
}: UserProfileDropdownProps) {
  return (
    <div
      className="
        absolute
        right-0
        top-14
        w-[360px]
        rounded-xl
        border
        bg-white
        shadow-xl
        p-5
        z-50
      "
    >
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
          aria-label="Close profile dropdown"
        >
          ×
        </button>
      ) : null}
      <ProfileHub profile={profile} />
    </div>
  );
}