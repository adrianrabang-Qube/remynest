import ProfileHub from "@/components/profile/ProfileHub";

type UserProfileDropdownProps = {
  onClose?: () => void;
};

const profile = {
  fullName: "Adrian Rabang",
  email: "admin@remynest.com",

  plan: "premium" as const,
  role: "admin" as const,

  storageUsed: "2.4GB",
  storageLimit: "10GB",

  avatarUrl: null,
};

export default function UserProfileDropdown({
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