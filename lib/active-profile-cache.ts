import type { QueryClient } from "@tanstack/react-query";

/** The single React Query key for the client's view of the active workspace. */
export const ACTIVE_PROFILE_QUERY_KEY = ["active-profile"] as const;

export type ActiveProfileData = { activeProfileId: string | null };

/**
 * Optimistically set the cached active workspace using the profile id the client ALREADY
 * knows at switch time (null = My Nest). This makes the memories feed + on-page search
 * re-scope INSTANTLY on a workspace switch — WITHOUT depending on an immediate
 * /api/active-profile cookie re-read, which races WKWebView cookie propagation on native
 * iOS (RDAT-002 follow-up: the re-read returned the previous id and the feed stayed stale).
 * Shared by every switch entry point so the key + shape never drift from the consumer.
 */
export function setActiveProfileCache(
  queryClient: QueryClient,
  activeProfileId: string | null,
) {
  queryClient.setQueryData<ActiveProfileData>(ACTIVE_PROFILE_QUERY_KEY, {
    activeProfileId,
  });
}

/**
 * Reconcile the cached active workspace with the server (e.g. after a FAILED switch — the
 * cookie was not set, so revert the optimistic value to the server's truth).
 */
export function invalidateActiveProfileCache(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ACTIVE_PROFILE_QUERY_KEY });
}
