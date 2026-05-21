"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { useRouter } from "next/navigation";

import {
  setActiveProfile,
} from "@/app/(app)/dashboard/profile-actions";

const PROFILE_SWITCHER_TAG =
  "profile-switcher";

interface Props {
  profiles: any[];
  activeProfileId?: string | null;
}

function logProfileSwitcherStage(
  stage: string,
  metadata?: unknown
) {
  console.info(
    `[${PROFILE_SWITCHER_TAG}] ${stage}`,
    metadata || {}
  );
}

function logProfileSwitcherError(
  stage: string,
  error: unknown
) {
  console.error(
    `[${PROFILE_SWITCHER_TAG}] ${stage}`,
    error
  );
}

export default function ProfileSwitcher({
  profiles,
  activeProfileId,
}: Props) {
  const router = useRouter();

  const [isPending, startTransition] =
    useTransition();

  const [isSwitching, setIsSwitching] =
    useState(false);

  const requestIdRef = useRef(
    crypto.randomUUID()
  );

  // =====================================
  // REMOVE DUPLICATES
  // =====================================

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

  // =====================================
  // LOCAL SELECT STATE
  // =====================================

  const [selectedProfile, setSelectedProfile] =
    useState(
      activeProfileId ||
        uniqueProfiles[0]
          ?.memory_profiles?.id ||
        ""
    );

  // =====================================
  // PROFILE OPTIONS
  // =====================================

  const profileOptions = useMemo(() => {
    return uniqueProfiles.map(
      (profile: any) => {
        const profileData =
          profile?.memory_profiles;

        return {
          id: profileData?.id,

          name:
            profileData?.profile_name ||
            "Unknown Profile",
        };
      }
    );
  }, [uniqueProfiles]);

  // =====================================
  // SYNC ACTIVE PROFILE
  // =====================================

  useEffect(() => {
    if (activeProfileId) {
      setSelectedProfile(
        activeProfileId
      );
    }
  }, [activeProfileId]);

  // =====================================
  // LIFECYCLE OBSERVABILITY
  // =====================================

  useEffect(() => {
    logProfileSwitcherStage(
      "profile-switcher-mounted",
      {
        requestId:
          requestIdRef.current,

        profiles:
          profileOptions.length,

        activeProfileId,
      }
    );

    return () => {
      logProfileSwitcherStage(
        "profile-switcher-unmounted",
        {
          requestId:
            requestIdRef.current,
        }
      );
    };
  }, [
    profileOptions.length,
    activeProfileId,
  ]);

  // =====================================
  // PROFILE SWITCH
  // =====================================

  const handleProfileSwitch =
    useCallback(
      async (
        newProfileId: string
      ) => {
        if (
          !newProfileId ||
          newProfileId ===
            selectedProfile ||
          isSwitching
        ) {
          return;
        }

        const switchStart =
          performance.now();

        try {
          setIsSwitching(true);

          setSelectedProfile(
            newProfileId
          );

          logProfileSwitcherStage(
            "profile-switch-started",
            {
              requestId:
                requestIdRef.current,

              previousProfileId:
                selectedProfile,

              newProfileId,
            }
          );

          startTransition(() => {
            void setActiveProfile(
              newProfileId
            )
              .then(() => {
                const durationMs =
                  Number(
                    (
                      performance.now() -
                      switchStart
                    ).toFixed(2)
                  );

                logProfileSwitcherStage(
                  "profile-switch-completed",
                  {
                    requestId:
                      requestIdRef.current,

                    newProfileId,

                    durationMs,
                  }
                );

                router.refresh();
              })
              .catch((error) => {
                logProfileSwitcherError(
                  "profile-switch-error",
                  {
                    requestId:
                      requestIdRef.current,

                    error,
                  }
                );

                setSelectedProfile(
                  selectedProfile
                );
              })
              .finally(() => {
                setIsSwitching(false);
              });
          });
        } catch (error) {
          setIsSwitching(false);

          logProfileSwitcherError(
            "profile-switch-engine-error",
            {
              requestId:
                requestIdRef.current,

              error,
            }
          );
        }
      },
      [
        router,
        selectedProfile,
        isSwitching,
      ]
    );

  if (!profileOptions.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border p-6 bg-white shadow-sm">
      <h2 className="text-2xl font-semibold mb-4">
        Active Care Profile
      </h2>

      <select
        className="w-full border rounded-xl px-4 py-3 bg-white"
        disabled={
          isPending || isSwitching
        }
        value={selectedProfile}
        onChange={(e) => {
          void handleProfileSwitch(
            e.target.value
          );
        }}
      >
        {profileOptions.map(
          (profile) => {
            if (!profile.id) {
              return null;
            }

            return (
              <option
                key={profile.id}
                value={profile.id}
              >
                {profile.name}
              </option>
            );
          }
        )}
      </select>

      {(isPending ||
        isSwitching) && (
        <p className="text-sm text-gray-500 mt-3">
          Switching profile...
        </p>
      )}
    </div>
  );
}