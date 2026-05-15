"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  setActiveProfile,
} from "@/app/(app)/dashboard/profile-actions";

interface Props {
  profiles: any[];
  activeProfileId?: string | null;
}

export default function ProfileSwitcher({
  profiles,
  activeProfileId,
}: Props) {
  const [isPending, startTransition] =
    useTransition();

  // =========================
  // REMOVE DUPLICATES
  // =========================
  const uniqueProfiles = useMemo(() => {
    const seen = new Set();

    return profiles.filter(
      (profile: any) => {
        const profileData =
          profile?.memory_profiles;

        if (!profileData?.id) {
          return false;
        }

        if (
          seen.has(profileData.id)
        ) {
          return false;
        }

        seen.add(profileData.id);

        return true;
      }
    );
  }, [profiles]);

  // =========================
  // LOCAL SELECT STATE
  // =========================
  const [selectedProfile, setSelectedProfile] =
    useState(
      activeProfileId ||
        uniqueProfiles[0]
          ?.memory_profiles?.id ||
        ""
    );

  // =========================
  // SYNC ACTIVE PROFILE
  // =========================
  useEffect(() => {
    if (activeProfileId) {
      setSelectedProfile(
        activeProfileId
      );
    }
  }, [activeProfileId]);

  if (!uniqueProfiles?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border p-6 bg-white shadow-sm">
      <h2 className="text-2xl font-semibold mb-4">
        Active Care Profile
      </h2>

      <select
        className="w-full border rounded-xl px-4 py-3 bg-white"
        disabled={isPending}
        value={selectedProfile}
        onChange={(e) => {
          const newProfileId =
            e.target.value;

          // instant UI update
          setSelectedProfile(
            newProfileId
          );

          startTransition(async () => {
            await setActiveProfile(
              newProfileId
            );

            window.location.reload();
          });
        }}
      >
        {uniqueProfiles.map(
          (profile: any) => {
            const profileData =
              profile?.memory_profiles;

            if (!profileData?.id) {
              return null;
            }

            return (
              <option
                key={profileData.id}
                value={profileData.id}
              >
                {
                  profileData.profile_name
                }
              </option>
            );
          }
        )}
      </select>

      {isPending && (
        <p className="text-sm text-gray-500 mt-3">
          Switching profile...
        </p>
      )}
    </div>
  );
}