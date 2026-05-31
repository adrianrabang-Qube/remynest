import type { ProfileSummary } from "@/components/profile/types";

interface ProfileHeaderProps {
  profile: ProfileSummary;
}

export default function ProfileHeader({
  profile,
}: ProfileHeaderProps) {
  return (
    <div className="mb-4 border-b pb-4">
      <div className="flex items-center gap-4">
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={profile.fullName}
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-300 text-sm font-semibold text-neutral-700">
            {profile.fullName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">
            {profile.fullName}
          </h3>

          <p className="text-sm capitalize text-neutral-500">
            {profile.plan} Member
          </p>

          <p className="truncate text-xs text-neutral-400">
            {profile.email}
          </p>
        </div>
      </div>

      {(profile.storageUsed || profile.storageLimit) && (
        <div className="mt-4 text-xs text-neutral-500">
          Storage {profile.storageUsed ?? "0GB"} / {profile.storageLimit ?? "—"}
        </div>
      )}
    </div>
  );
}