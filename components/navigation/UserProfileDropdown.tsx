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
        max-h-[calc(100vh-5rem)]
        overflow-y-auto
        overscroll-contain
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
          className="sticky top-0 float-right -mt-1 -mr-1 text-gray-500 hover:text-gray-700"
          aria-label="Close profile dropdown"
        >
          ×
        </button>
      ) : null}
      <ProfileHub profile={profile} onNavigate={onClose} />
    </div>
  );
}