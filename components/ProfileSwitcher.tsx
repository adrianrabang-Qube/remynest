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
import { useQueryClient } from "@tanstack/react-query";

import {
  setActiveProfile,
  setPersonalWorkspace,
} from "@/app/(app)/dashboard/profile-actions";
import {
  setActiveProfileCache,
  invalidateActiveProfileCache,
} from "@/lib/active-profile-cache";

const PROFILE_SWITCHER_TAG =
  "profile-switcher";

type ProfileRecord = {
  id?: string | null;
  profile_name?: string | null;
  memory_profiles?: {
    id?: string | null;
    profile_name?: string | null;
  };
};

interface Props {
  profiles: ProfileRecord[];
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
  const queryClient = useQueryClient();

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
    const seen = new Set<string>();

    return profiles.filter((profile) => {
      const profileData =
        profile?.memory_profiles || profile;

      if (!profileData?.id) {
        return false;
      }

      if (seen.has(profileData.id)) {
        return false;
      }

      seen.add(profileData.id);

      return true;
    });
  }, [profiles]);

  const selectedProfile =
    activeProfileId ||
    uniqueProfiles[0]?.memory_profiles?.id ||
    uniqueProfiles[0]?.id ||
    "";

  // =====================================
  // PROFILE OPTIONS
  // =====================================

  const profileOptions = useMemo(() => {
    return uniqueProfiles.map((profile) => {
      const profileData =
        profile?.memory_profiles || profile;

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
  // LIFECYCLE OBSERVABILITY
  // =====================================

  useEffect(() => {
    const requestId = requestIdRef.current;

    logProfileSwitcherStage(
      "profile-switcher-mounted",
      {
        requestId,
        profiles: profileOptions.length,
        activeProfileId,
      }
    );

    return () => {
      logProfileSwitcherStage(
        "profile-switcher-unmounted",
        {
          requestId,
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
        // Guard on the ACTUAL active profile (null in PERSONAL), not the
        // first-profile fallback used for the <select> value — otherwise
        // selecting the pre-selected/first profile from PERSONAL is a false
        // no-op and never switches into CARE.
        if (
          !newProfileId ||
          newProfileId === (activeProfileId ?? "") ||
          isSwitching
        ) {
          return;
        }

        const switchStart =
          performance.now();

        try {
          setIsSwitching(true);

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

          setActiveProfileCache(queryClient, newProfileId);
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

                // Switch failed — revert the optimistic active-profile to server truth.
                invalidateActiveProfileCache(queryClient);
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
        queryClient,
        activeProfileId,
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

      <button
        type="button"
        disabled={isPending || isSwitching}
        className="mt-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => {
          setActiveProfileCache(queryClient, null);
          startTransition(() => {
            void setPersonalWorkspace()
              .then(() => {
                router.refresh();
              })
              .catch(() => {
                invalidateActiveProfileCache(queryClient);
                router.refresh();
              });
          });
        }}
      >
        Switch to My Nest
      </button>
    </div>
  );
}